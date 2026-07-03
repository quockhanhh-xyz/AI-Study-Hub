package com.demo.ai_study_hub.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreatePaymentRequest {
    @NotBlank(message = "planCode is required")
    private String planCode;
}
