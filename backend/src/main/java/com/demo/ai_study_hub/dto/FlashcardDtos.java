package com.demo.ai_study_hub.dto;

import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

public class FlashcardDtos {

    @Data
    public static class GenerateFlashcardRequest {
        /** Optional. Null → use tier default. */
        private Integer count;
        /** Optional. Focus topic for the flashcards, max 300 chars. */
        private String focus;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FlashcardSetResponse {
        private Long flashcardSetId;
        private Integer documentId;
        private String title;
        private Integer itemCount;
        private String model;
        private LocalDateTime sourceProcessedAt;
        private Integer sourceChunkCount;
        private LocalDateTime createdAt;
        private List<FlashcardItem> flashcards;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FlashcardSetListItemResponse {
        private Long flashcardSetId;
        private Integer documentId;
        private String title;
        private Integer itemCount;
        private LocalDateTime createdAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FlashcardItem {
        private Long flashcardId;
        private String frontText;
        private String backText;
        private Integer sourcePage;
        private String difficulty;
        private Integer position;
    }

    /** Raw shape the AI model returns for a single card, before persistence. */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AiFlashcardOutput {
        private String frontText;
        private String backText;
        private Integer sourcePage;
        private String difficulty;
    }

    /** Root JSON object wrapper: {"cards": [...]} */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AiFlashcardOutputWrapper {
        private List<AiFlashcardOutput> cards;
    }
}