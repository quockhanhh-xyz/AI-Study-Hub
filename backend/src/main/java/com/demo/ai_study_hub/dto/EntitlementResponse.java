package com.demo.ai_study_hub.dto;

import lombok.*;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EntitlementResponse {
    private String tier;
    private LocalDateTime tierExpiresAt;
    private LimitsDto limits;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LimitsDto {
        private long storageBytes;
        private int documents;
        private long maxFileBytes;
        private int folders;
        private int folderDepth;
        private int ownedGroups;
        private int membersPerGroup;
        private int activeShares;
        private int aiQuestionsPerDay;
        private int maxQuestionChars;
        private int contextChunks;
        private int outputTokens;
        private String aiModel;
        private int summaryGenerationsPerDay;
        private int flashcardSetsPerDay;
        private int quizSetsPerDay;
        private int itemsPerSet;
    }
}
