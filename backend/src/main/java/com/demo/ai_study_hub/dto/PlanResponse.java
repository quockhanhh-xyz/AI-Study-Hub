package com.demo.ai_study_hub.dto;

import lombok.*;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlanResponse {
    private String tier;
    private String planCode;
    private String planName;
    private String targetTier;
    private long price;
    private String currency;
    private String billingLabel;
    private int durationMonths;
    private int aiDailyLimit;
    private boolean purchasable;
    private List<String> features;
    private PlanLimitsDto limits;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PlanLimitsDto {
        private int maxQuizQuestionsPerSet;
        private int maxFlashcardsPerSet;
    }
}