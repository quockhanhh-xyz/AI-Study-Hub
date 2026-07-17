package com.demo.ai_study_hub.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class AdminAiUsageItem {
    private String userEmail;
    private String tier;
    private Integer aiQaUsed;
    private Integer summaryUsed;
    private Integer flashcardUsed;
    private Integer quizUsed;
    private Integer totalAiRequests;
    private LocalDateTime lastUsedAt;
}
