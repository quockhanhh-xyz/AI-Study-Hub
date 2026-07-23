package com.demo.ai_study_hub.dto;

import lombok.Data;

@Data
public class LoginRequest {
    private String email;
    private String password;
    private Boolean rememberMe;
}