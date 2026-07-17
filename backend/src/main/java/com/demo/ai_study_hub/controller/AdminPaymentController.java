package com.demo.ai_study_hub.controller;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import com.demo.ai_study_hub.dto.ApiResponse;
import com.demo.ai_study_hub.dto.AdminPaymentListResponse;
import com.demo.ai_study_hub.dto.AdminPaymentItem;
import com.demo.ai_study_hub.service.AdminPaymentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/admin/payments")
public class AdminPaymentController {

    @Autowired
    private AdminPaymentService adminPaymentService;

    @GetMapping
    public ResponseEntity<ApiResponse<AdminPaymentListResponse>> getPayments(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String plan,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String provider,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String direction
    ) {
        size = Math.min(Math.max(1, size), 100);
        java.util.List<String> validSorts = java.util.Arrays.asList("paymentId", "amount", "status", "createdAt", "paidAt", "planCode");
        if (!validSorts.contains(sortBy)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid sort field");
        }
        Sort sort = direction.equalsIgnoreCase(Sort.Direction.ASC.name()) ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(page, size, sort);
        AdminPaymentListResponse response = adminPaymentService.getPayments(search, plan, status, provider, startDate, endDate, pageable);
        return ResponseEntity.ok(ApiResponse.success(response, "Payments retrieved successfully"));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<AdminPaymentItem>> getPaymentById(@PathVariable Long id) {
        AdminPaymentItem payment = adminPaymentService.getPaymentById(id);
        return ResponseEntity.ok(ApiResponse.success(payment, "Payment retrieved successfully"));
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> exportPayments(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String plan,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String provider,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate
    ) {
        byte[] data = adminPaymentService.exportPayments(search, plan, status, provider, startDate, endDate);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
        headers.setContentDispositionFormData("attachment", "payments.xlsx");
        return ResponseEntity.ok().headers(headers).body(data);
    }
}
