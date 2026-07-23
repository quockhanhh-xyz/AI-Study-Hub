package com.demo.ai_study_hub.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class AdminUserItem {
    private Integer userId;
    private String email;
    private String fullName;
    private String role;
    private String tier;
    private LocalDateTime tierExpiresAt;
    private String status;
    private LocalDateTime createdAt;
    private Long documentCount;
    private Integer aiTodayCount;
}
