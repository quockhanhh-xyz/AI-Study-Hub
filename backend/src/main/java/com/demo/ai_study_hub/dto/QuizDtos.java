package com.demo.ai_study_hub.dto;

import lombok.*;
import com.fasterxml.jackson.annotation.JsonAlias;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;

public class QuizDtos {

    @Data
    public static class GenerateQuizRequest {
        /** Optional. Null → use tier default. */
        private Integer questionCount;
        /** EASY | MEDIUM | HARD | MIXED. Null → MIXED. */
        private String difficulty;
        /** Optional. Focus topic for the quiz, max 300 chars. */
        private String focus;
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
        private Instant sourceProcessedAt;
        private Integer sourceChunkCount;
        private Instant createdAt;
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
        private Instant createdAt;
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
        @JsonAlias({"questionText", "question_text", "question"})
        private String questionText;
        private List<AiQuizOptionOutput> options;
        @JsonAlias({"correctOption", "correct_option", "answer"})
        private String correctOption;
        private String explanation;
        private String difficulty;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AiQuizOptionOutput {
        @JsonAlias({"optionKey", "key"})
        private String key;
        @JsonAlias({"optionText", "text"})
        private String text;
    }

    /** Root JSON object wrapper: {"questions": [...]} */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AiQuizOutputWrapper {
        @JsonAlias({"questions", "quiz"})
        private List<AiQuizQuestionOutput> questions;
    }
}