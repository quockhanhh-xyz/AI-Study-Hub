package com.demo.ai_study_hub.dto;

import lombok.*;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EntitlementResponse {
    private String tier;
    private String effectiveTier;
    private LocalDateTime tierExpiresAt;
    private LimitsDto limits;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LimitsDto {
        private long maxStorageBytes;
        private int maxDocuments;
        private long maxFileSizeBytes;
        private int maxFolders;
        private int maxFolderDepth;
        private int maxOwnedGroups;
        private int maxMembersPerGroup;
        private int maxActiveShares;
        private int maxAiSessionsPerDocument;
        private int maxMessagesPerSession;
        private int maxAiDailyQuestions;
        private int maxQuestionChars;
        private int maxContextChunks;
        private int maxOutputTokens;
        private String aiModel;
        private int maxSummaryQuotaPerDay;
        private int maxFlashcardQuotaPerDay;
        private int maxQuizQuotaPerDay;
        private int maxItemsPerSet;
    }
}
