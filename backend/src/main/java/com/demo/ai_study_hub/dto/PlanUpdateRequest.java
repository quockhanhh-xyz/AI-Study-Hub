package com.demo.ai_study_hub.dto;

import lombok.Data;
import java.util.List;

@Data
public class PlanUpdateRequest {
    private String planName;
    private Long price;
    private String billingLabel;
    private Boolean purchasable;
    private Integer aiDailyQuestionLimit;
    private Long storageLimit;
    private Long maxFileSize;
    private Integer maxDocumentCount;
    private Integer maxFolderCount;
    private Integer maxGroupCount;
    private Integer maxFlashcardsPerSet;
    private Integer maxQuizQuestionsPerSet;
    private Integer summaryDailyLimit;
    private Integer flashcardDailyLimit;
    private Integer quizDailyLimit;
    private List<String> features;
}
