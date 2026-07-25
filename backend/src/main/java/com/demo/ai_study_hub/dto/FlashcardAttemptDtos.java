package com.demo.ai_study_hub.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

public class FlashcardAttemptDtos {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class FlashcardAttemptRequest {
        private Integer rememberedCount;
        private Integer forgotCount;
        private Instant startedAt;
        private Instant completedAt;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class FlashcardAttemptResponse {
        private Long attemptId;
        private Long setId;
        private Integer totalCards;
        private Integer rememberedCount;
        private Integer forgotCount;
        private Double percentage;
        private Instant startedAt;
        private Instant completedAt;
    }
}
