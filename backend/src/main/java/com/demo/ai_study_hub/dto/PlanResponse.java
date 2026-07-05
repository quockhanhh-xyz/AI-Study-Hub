package com.demo.ai_study_hub.dto;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlanResponse {
    private String planCode;
    private String planName;
    private String targetTier;
    private long price;
    private String currency;
    private String billingLabel;
    private int durationMonths;
    private int aiDailyLimit;
}