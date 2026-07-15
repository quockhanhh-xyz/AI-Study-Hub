package com.demo.ai_study_hub.dto;

import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

public class QuizAttemptDtos {

    @Data
    public static class QuizAttemptRequest {
        private LocalDateTime startedAt;
        private LocalDateTime completedAt;
        private List<AnswerInput> answers;

        @Data
        public static class AnswerInput {
            private Long questionId;
            private String selectedOption;
        }
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class QuizAttemptResponse {
        private Long attemptId;
        private Long quizSetId;
        private Integer userId;
        private Double score;
        private Integer totalQuestions;
        private Integer correctCount;
        private Double percentage;
        private LocalDateTime startedAt;
        private LocalDateTime completedAt;
        private LocalDateTime createdAt;
        private List<QuizAttemptAnswerResponse> answers;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class QuizAttemptAnswerResponse {
        private Long attemptAnswerId;
        private Long questionId;
        private String selectedOption;
        private String correctOption;
        private Boolean isCorrect;
        private LocalDateTime answeredAt;
    }
}
