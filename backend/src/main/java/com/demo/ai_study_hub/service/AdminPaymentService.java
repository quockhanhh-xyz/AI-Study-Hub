package com.demo.ai_study_hub.service;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import com.demo.ai_study_hub.dto.AdminPaymentItem;
import com.demo.ai_study_hub.dto.AdminPaymentListResponse;
import com.demo.ai_study_hub.entity.PaymentOrder;
import com.demo.ai_study_hub.repository.PaymentOrderRepository;
import jakarta.persistence.criteria.Predicate;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class AdminPaymentService {

    @Autowired
    private PaymentOrderRepository paymentOrderRepository;

    public AdminPaymentListResponse getPayments(String search, String plan, String status, String provider, LocalDateTime startDate, LocalDateTime endDate, Pageable pageable) {
        Specification<PaymentOrder> spec = buildSpecification(search, plan, status, provider, startDate, endDate);
        Page<PaymentOrder> page = paymentOrderRepository.findAll(spec, pageable);

        List<AdminPaymentItem> items = page.getContent().stream().map(this::mapToItem).collect(Collectors.toList());

        AdminPaymentListResponse response = new AdminPaymentListResponse();
        response.setPayments(items);
        response.setTotalPages(page.getTotalPages());
        response.setTotalElements(page.getTotalElements());
        response.setCurrentPage(page.getNumber());
        return response;
    }

    public AdminPaymentItem getPaymentById(Long id) {
        PaymentOrder order = paymentOrderRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Payment not found"));
        return mapToItem(order);
    }

    public byte[] exportPayments(String search, String plan, String status, String provider, LocalDateTime startDate, LocalDateTime endDate) {
        Specification<PaymentOrder> spec = buildSpecification(search, plan, status, provider, startDate, endDate);
        List<PaymentOrder> orders = paymentOrderRepository.findAll(spec);

        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Payments");
            Row headerRow = sheet.createRow(0);
            headerRow.createCell(0).setCellValue("Payment ID");
            headerRow.createCell(1).setCellValue("User Email");
            headerRow.createCell(2).setCellValue("Plan Code");
            headerRow.createCell(3).setCellValue("Amount");
            headerRow.createCell(4).setCellValue("Provider");
            headerRow.createCell(5).setCellValue("Status");
            headerRow.createCell(6).setCellValue("Transaction No");
            headerRow.createCell(7).setCellValue("Created At");
            headerRow.createCell(8).setCellValue("Paid At");

            int rowIdx = 1;
            for (PaymentOrder order : orders) {
                Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(order.getPaymentId() != null ? order.getPaymentId().toString() : "");
                row.createCell(1).setCellValue(order.getUser() != null ? order.getUser().getEmail() : "");
                row.createCell(2).setCellValue(order.getPlanCode());
                row.createCell(3).setCellValue(order.getAmount() != null ? order.getAmount() : 0L);
                row.createCell(4).setCellValue(order.getPaymentProvider());
                
                String displayStatus = order.getStatus();
                if ("PENDING".equals(displayStatus) && order.getExpiredAt() != null && !order.getExpiredAt().isAfter(LocalDateTime.now())) {
                    displayStatus = "EXPIRED";
                }
                row.createCell(5).setCellValue(displayStatus);
                
                row.createCell(6).setCellValue(order.getVnpTransactionNo());
                row.createCell(7).setCellValue(order.getCreatedAt() != null ? order.getCreatedAt().toString() : "");
                row.createCell(8).setCellValue(order.getPaidAt() != null ? order.getPaidAt().toString() : "");
            }

            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Error exporting payments to Excel", e);
        }
    }

    private Specification<PaymentOrder> buildSpecification(String search, String plan, String status, String provider, LocalDateTime startDate, LocalDateTime endDate) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (search != null && !search.isEmpty()) {
                try {
                    Long paymentId = Long.parseLong(search);
                    predicates.add(cb.or(
                            cb.equal(root.get("paymentId"), paymentId),
                            cb.like(cb.lower(root.get("user").get("email")), "%" + search.toLowerCase() + "%")
                    ));
                } catch (NumberFormatException e) {
                    predicates.add(cb.like(cb.lower(root.get("user").get("email")), "%" + search.toLowerCase() + "%"));
                }
            }
            if (plan != null && !plan.isEmpty()) {
                predicates.add(cb.equal(root.get("planCode"), plan));
            }
            if (status != null && !status.isEmpty()) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (provider != null && !provider.isEmpty()) {
                predicates.add(cb.equal(root.get("paymentProvider"), provider));
            }
            if (startDate != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), startDate));
            }
            if (endDate != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), endDate));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private AdminPaymentItem mapToItem(PaymentOrder order) {
        AdminPaymentItem item = new AdminPaymentItem();
        item.setPaymentId(order.getPaymentId());
        item.setUserEmail(order.getUser() != null ? order.getUser().getEmail() : null);
        item.setPlanCode(order.getPlanCode());
        item.setAmount(order.getAmount());
        item.setPaymentProvider(order.getPaymentProvider());
        
        String displayStatus = order.getStatus();
        if ("PENDING".equals(displayStatus) && order.getExpiredAt() != null && !order.getExpiredAt().isAfter(LocalDateTime.now())) {
            displayStatus = "EXPIRED";
        }
        item.setStatus(displayStatus);
        
        item.setCreatedAt(order.getCreatedAt());
        item.setPaidAt(order.getPaidAt());
        item.setTransactionNo(order.getVnpTransactionNo());
        return item;
    }
}
