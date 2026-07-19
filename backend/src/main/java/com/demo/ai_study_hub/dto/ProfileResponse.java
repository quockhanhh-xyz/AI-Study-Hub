package com.demo.ai_study_hub.dto;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class ProfileResponse {
    private Integer userId;
    private String email;
    private String fullName;
    private String avatarUrl;
    private String phone;
    private String schoolName;
    private String major;
    private String studentCode;
    private Integer graduationYear;
    private String educationLevel;
    private String bio;
    private String role;
    private String tier;
    private LocalDateTime tierExpiresAt;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
