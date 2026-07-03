package com.demo.ai_study_hub.dto;

import lombok.*;
import java.time.LocalDateTime;
import com.fasterxml.jackson.annotation.JsonInclude;
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class PaymentResponse {
    private Long paymentId;
    private String planCode;
    private String planName;
    private long amount;
    private String currency;
    private String billingLabel;
    private String status;
    private String paymentMethod;
    private String tier;
    private LocalDateTime createdAt;
    private LocalDateTime paidAt;
}
