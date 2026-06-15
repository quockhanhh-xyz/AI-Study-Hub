package com.demo.ai_study_hub.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class LoginResponse {
    private Integer userId;
    private String fullName;
    private String email;
    private String role;
    private String status;
}
