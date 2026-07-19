package com.demo.ai_study_hub.service;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import com.demo.ai_study_hub.dto.AdminUserDetail;
import com.demo.ai_study_hub.dto.AdminUserItem;
import com.demo.ai_study_hub.dto.AdminUserListResponse;
import com.demo.ai_study_hub.dto.AdminPaymentItem;
import com.demo.ai_study_hub.dto.AdminAiUsageItem;
import com.demo.ai_study_hub.entity.User;
import com.demo.ai_study_hub.entity.PaymentOrder;
import com.demo.ai_study_hub.repository.DocumentRepository;
import com.demo.ai_study_hub.repository.UserRepository;
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
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class AdminUserService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private DocumentRepository documentRepository;

    @Autowired
    private PaymentOrderRepository paymentOrderRepository;

    @Autowired
    private TierPolicyService tierPolicyService;

    @Autowired
    private AdminAiUsageService adminAiUsageService;

    public AdminUserListResponse getUsers(String search, String role, String tier, String status, Pageable pageable) {
        Specification<User> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (search != null && !search.isEmpty()) {
                String searchLike = "%" + search.toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("email")), searchLike),
                        cb.like(cb.lower(root.get("fullName")), searchLike)
                ));
            }
            if (role != null && !role.isEmpty()) {
                predicates.add(cb.equal(root.get("role"), role));
            }
            if (tier != null && !tier.isEmpty()) {
                predicates.add(cb.equal(root.get("tier").as(String.class), tier));
            }
            if (status != null && !status.isEmpty()) {
                predicates.add(cb.equal(root.get("status"), status));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<User> userPage = userRepository.findAll(spec, pageable);

        List<AdminUserItem> items = userPage.getContent().stream().map(this::mapToItem).collect(Collectors.toList());

        AdminUserListResponse response = new AdminUserListResponse();
        response.setUsers(items);
        response.setTotalPages(userPage.getTotalPages());
        response.setTotalElements(userPage.getTotalElements());
        response.setCurrentPage(userPage.getNumber());
        return response;
    }

    public AdminUserDetail getUserById(Integer id) {
        User user = userRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        return mapToDetail(user);
    }

    public AdminUserItem updateUserStatus(Integer id, String newStatus, Integer currentAdminId) {
        if (!"ACTIVE".equals(newStatus) && !"INACTIVE".equals(newStatus) && !"BLOCKED".equals(newStatus)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid status");
        }

        if (id.equals(currentAdminId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot block/unblock yourself");
        }

        User user = userRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        if ("BLOCKED".equals(newStatus) && "ADMIN".equals(user.getRole())) {
            // Optional: prevent blocking last admin
            long adminCount = userRepository.findAll().stream().filter(u -> "ADMIN".equals(u.getRole()) && !"BLOCKED".equals(u.getStatus())).count();
            if (adminCount <= 1) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot block the last active admin");
            }
        }

        user.setStatus(newStatus);
        user = userRepository.save(user);
        return mapToItem(user);
    }

    public byte[] exportUsers(String search, String role, String tier, String status) {
        Specification<User> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (search != null && !search.isEmpty()) {
                String searchLike = "%" + search.toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("email")), searchLike),
                        cb.like(cb.lower(root.get("fullName")), searchLike)
                ));
            }
            if (role != null && !role.isEmpty()) {
                predicates.add(cb.equal(root.get("role"), role));
            }
            if (tier != null && !tier.isEmpty()) {
                predicates.add(cb.equal(root.get("tier").as(String.class), tier));
            }
            if (status != null && !status.isEmpty()) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        List<User> users = userRepository.findAll(spec);

        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Users");
            Row headerRow = sheet.createRow(0);
            headerRow.createCell(0).setCellValue("User ID");
            headerRow.createCell(1).setCellValue("Email");
            headerRow.createCell(2).setCellValue("Full Name");
            headerRow.createCell(3).setCellValue("Role");
            headerRow.createCell(4).setCellValue("Tier");
            headerRow.createCell(5).setCellValue("Status");
            headerRow.createCell(6).setCellValue("Document Count");
            headerRow.createCell(7).setCellValue("Created At");

            int rowIdx = 1;
            for (User user : users) {
                Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(user.getUserId());
                row.createCell(1).setCellValue(user.getEmail());
                row.createCell(2).setCellValue(user.getFullName());
                row.createCell(3).setCellValue(user.getRole());
                row.createCell(4).setCellValue(user.getTier() != null ? user.getTier().name() : "");
                row.createCell(5).setCellValue(user.getStatus());
                row.createCell(6).setCellValue(documentRepository.countByOwner(user));
                row.createCell(7).setCellValue(user.getCreatedAt() != null ? user.getCreatedAt().toString() : "");
            }

            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Error exporting users to Excel", e);
        }
    }

    private AdminUserItem mapToItem(User user) {
        AdminUserItem item = new AdminUserItem();
        item.setUserId(user.getUserId());
        item.setEmail(user.getEmail());
        item.setFullName(user.getFullName());
        item.setRole(user.getRole());
        item.setTier(user.getTier() != null ? user.getTier().name() : null);
        item.setTierExpiresAt(user.getTierExpiresAt());
        item.setStatus(user.getStatus());
        item.setCreatedAt(user.getCreatedAt());
        item.setDocumentCount(documentRepository.countByOwner(user));
        return item;
    }

    private AdminUserDetail mapToDetail(User user) {
        AdminUserDetail detail = new AdminUserDetail();
        detail.setUserId(user.getUserId());
        detail.setEmail(user.getEmail());
        detail.setFullName(user.getFullName());
        detail.setRole(user.getRole());
        detail.setTier(user.getTier() != null ? user.getTier().name() : null);
        detail.setTierExpiresAt(user.getTierExpiresAt());
        detail.setStatus(user.getStatus());
        detail.setCreatedAt(user.getCreatedAt());
        detail.setDocumentCount(documentRepository.countByOwner(user));

        com.demo.ai_study_hub.dto.TierLimits limits = tierPolicyService.getLimitsForUser(user);
        detail.setAiDailyLimit(limits.aiQuestionsPerDay());
        detail.setStorageLimit(limits.storageBytes());
        detail.setMaxFileSize(limits.maxFileBytes());
        detail.setMaxDocumentCount(limits.maxDocuments());

        detail.setAiUsage(adminAiUsageService.mapUserToAiUsageItem(user));

        List<PaymentOrder> orders = paymentOrderRepository.findByUserOrderByCreatedAtDesc(user);
        List<AdminPaymentItem> paymentItems = orders.stream().map(order -> {
            AdminPaymentItem p = new AdminPaymentItem();
            p.setPaymentId(order.getPaymentId());
            p.setUserEmail(user.getEmail());
            p.setPlanCode(order.getPlanCode());
            p.setAmount(order.getAmount());
            p.setPaymentProvider(order.getPaymentProvider());
            p.setStatus(order.getStatus());
            p.setCreatedAt(order.getCreatedAt());
            p.setPaidAt(order.getPaidAt());
            p.setTransactionNo(order.getVnpTransactionNo());
            return p;
        }).collect(Collectors.toList());
        detail.setPaymentHistory(paymentItems);

        return detail;
    }
}
