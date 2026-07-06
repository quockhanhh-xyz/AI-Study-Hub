package com.demo.ai_study_hub.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateVNPayPaymentRequest {
    @NotBlank(message = "planCode is required")
    private String planCode;

    /** Optional. Must be in the allowlist if provided (VNPAYQR/VNBANK/INTCARD/NCB). */
    private String bankCode;
}