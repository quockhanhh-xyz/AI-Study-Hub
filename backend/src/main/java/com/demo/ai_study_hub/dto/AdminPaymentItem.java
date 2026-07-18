package com.demo.ai_study_hub.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class AdminPaymentItem {
    private Long paymentId;
    private String userEmail;
    private String planCode;
    private Long amount;
    private String paymentProvider;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime paidAt;
    private String transactionNo;
}
