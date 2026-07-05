package com.demo.ai_study_hub.dto;

import lombok.*;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AccountUsageResponse {
    private String tier;
    private String effectiveTier;
    private LocalDateTime tierExpiresAt;
    private ResourceUsage storage;
    private ResourceUsage documents;
    private ResourceUsage folders;
    private ResourceUsage ownedGroups;
    private ResourceUsage activeShares;
    private ResourceUsage aiQuestionsToday;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ResourceUsage {
        private long limit;
        private long used;
        private long remaining;
        private boolean overLimit;
        private long overBy;
    }
}