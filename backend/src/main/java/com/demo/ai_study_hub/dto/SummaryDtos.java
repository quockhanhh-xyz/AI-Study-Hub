package com.demo.ai_study_hub.dto;

import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

public class SummaryDtos {

    @Data
    public static class GenerateSummaryRequest {
        /**
         * Accepted for contract symmetry but intentionally unused: per
         * api-contract.md 18.1.4, EVERY call to this endpoint — whether the
         * client considers it a first "generate" or a later "regenerate" —
         * always inserts a new ai_summaries row (history is preserved,
         * nothing is ever overwritten). There is no code path where this
         * flag would change behavior.
         */
        private Boolean regenerate;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SummaryResponse {
        private Long summaryId;
        private Integer documentId;
        private String overview;
        private List<String> keyPoints;
        private List<ImportantTerm> importantTerms;
        private List<String> suggestedReviewQuestions;
        private String model;
        private LocalDateTime sourceProcessedAt;
        private Integer sourceChunkCount;
        private LocalDateTime createdAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ImportantTerm {
        private String term;
        private String definition;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SummaryHistoryItemResponse {
        private Long summaryId;
        private Integer documentId;
        private String overview;
        private LocalDateTime createdAt;
    }

    /** Raw shape the AI model is asked to return — parsed then validated before mapping to entity. */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AiSummaryOutput {
        private String overview;
        private List<String> keyPoints;
        private List<ImportantTerm> importantTerms;
        private List<String> suggestedReviewQuestions;
    }
}