package com.demo.ai_study_hub.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

@Entity
@Table(name = "plan_configs")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PlanConfig {

    @Id
    @Column(name = "plan_code", length = 50, nullable = false)
    private String planCode; // e.g. "FREE", "PREMIUM_1_MONTH", "ULTRA_1_MONTH"

    @Column(name = "plan_name", length = 100, nullable = false)
    private String planName;

    @Column(name = "price", nullable = false)
    private Long price;

    @Column(name = "billing_label", length = 100, nullable = false)
    private String billingLabel;

    @Column(name = "purchasable", nullable = false)
    private Boolean purchasable;

    @Column(name = "ai_daily_question_limit", nullable = false)
    private Integer aiDailyQuestionLimit;

    @Column(name = "storage_limit", nullable = false)
    private Long storageLimit; // in bytes

    @Column(name = "max_file_size", nullable = false)
    private Long maxFileSize; // in bytes

    @Column(name = "max_document_count", nullable = false)
    private Integer maxDocumentCount;

    @Column(name = "max_folder_count", nullable = false)
    private Integer maxFolderCount;

    @Column(name = "max_group_count", nullable = false)
    private Integer maxGroupCount;

    @Column(name = "max_flashcards_per_set", nullable = false)
    private Integer maxFlashcardsPerSet;

    @Column(name = "max_quiz_questions_per_set", nullable = false)
    private Integer maxQuizQuestionsPerSet;

    @Column(name = "summary_daily_limit", nullable = false)
    private Integer summaryDailyLimit;

    @Column(name = "flashcard_daily_limit", nullable = false)
    private Integer flashcardDailyLimit;

    @Column(name = "quiz_daily_limit", nullable = false)
    private Integer quizDailyLimit;

    @Column(name = "features_list", columnDefinition = "TEXT")
    private String featuresList; // comma-separated list of features

    @Column(name = "status", length = 20, nullable = false)
    private String status = "ACTIVE"; // "ACTIVE" | "INACTIVE"

    @Column(name = "target_tier", length = 20, nullable = false)
    private String targetTier; // "FREE" | "PREMIUM" | "ULTRA"

    @Column(name = "duration_months", nullable = false)
    private Integer durationMonths;
}
