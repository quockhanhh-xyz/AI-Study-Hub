package com.demo.ai_study_hub.dto;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

import com.demo.ai_study_hub.dto.AdminAiUsageItem;
import com.demo.ai_study_hub.dto.AdminPaymentItem;

@Data
public class AdminUserDetail {
    private Integer userId;
    private String email;
    private String fullName;
    private String role;
    private String tier;
    private LocalDateTime tierExpiresAt;
    private String status;
    private LocalDateTime createdAt;
    private Long documentCount;
    
    // Usage / Quota
    private AdminAiUsageItem aiUsage;
    private Integer aiDailyLimit;
    private Long storageLimit;
    private Long maxFileSize;
    private Integer maxDocumentCount;
    
    // Payment History
    private List<AdminPaymentItem> paymentHistory;
}
