package com.demo.ai_study_hub.dto;

import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

public class QuizDtos {

    @Data
    public static class GenerateQuizRequest {
        /** Optional. Null → use tier default. */
        private Integer questionCount;
        /** EASY | MEDIUM | HARD | MIXED. Null → MIXED. */
        private String difficulty;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class QuizSetResponse {
        private Long quizSetId;
        private Integer documentId;
        private String title;
        private Integer questionCount;
        private String model;
        private LocalDateTime sourceProcessedAt;
        private Integer sourceChunkCount;
        private LocalDateTime createdAt;
        private List<QuizQuestionItem> questions;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class QuizSetListItemResponse {
        private Long quizSetId;
        private Integer documentId;
        private String title;
        private Integer questionCount;
        private LocalDateTime createdAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class QuizQuestionItem {
        private Long questionId;
        private String questionText;
        private String correctOption;
        private String explanation;
        private String difficulty;
        private Integer position;
        private List<QuizOptionItem> options;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class QuizOptionItem {
        private Long optionId;
        private String optionKey;
        private String optionText;
        private Integer position;
    }

    /** Raw shape the AI model returns for a single question, before persistence. */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AiQuizQuestionOutput {
        private String questionText;
        private List<AiQuizOptionOutput> options;
        private String correctOption;
        private String explanation;
        private String difficulty;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AiQuizOptionOutput {
        private String key;
        private String text;
    }

    /** Root JSON object wrapper: {"questions": [...]} */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AiQuizOutputWrapper {
        private List<AiQuizQuestionOutput> questions;
    }
}