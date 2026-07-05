package com.demo.ai_study_hub.dto;

import lombok.*;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AccountUsageResponse {
    private String tier;
    private LocalDateTime tierExpiresAt;
    private UsageSnapshot limits;
    private UsageSnapshot usage;
    private UsageSnapshot remaining;
    private OverLimitSnapshot overLimit;
    private UsageSnapshot overBy;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UsageSnapshot {
        private long storageBytes;
        private long documents;
        private long folders;
        private long ownedGroups;
        private long activeShares;
        private long aiQuestionsToday;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OverLimitSnapshot {
        private boolean storageBytes;
        private boolean documents;
        private boolean folders;
        private boolean ownedGroups;
        private boolean activeShares;
    }
}
