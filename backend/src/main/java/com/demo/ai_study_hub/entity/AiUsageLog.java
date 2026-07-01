package com.demo.ai_study_hub.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "ai_usage_logs", indexes = {
    @Index(name = "idx_ai_usage_logs_user_date", columnList = "user_id, created_at"),
    @Index(name = "idx_ai_usage_logs_user_status", columnList = "user_id, status, counted_as_question")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiUsageLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "usage_id")
    private Long usageId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", referencedColumnName = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "document_id", referencedColumnName = "document_id")
    private Document document;

    /**
     * Type of AI request.
     * Values: ASK
     */
    @Column(name = "request_type", nullable = false, length = 30)
    @Builder.Default
    private String requestType = "ASK";

    /**
     * Input tokens for this request (0 if no AI call was made).
     */
    @Column(name = "input_tokens")
    @Builder.Default
    private Integer inputTokens = 0;

    /**
     * Output tokens for this request (0 if no AI call was made).
     */
    @Column(name = "output_tokens")
    @Builder.Default
    private Integer outputTokens = 0;

    /**
     * Total tokens = inputTokens + outputTokens.
     */
    @Column(name = "total_tokens")
    @Builder.Default
    private Integer totalTokens = 0;

    /**
     * True if token counts are estimated.
     */
    @Column(name = "token_usage_estimated")
    @Builder.Default
    private Boolean tokenUsageEstimated = false;

    /**
     * AI provider used for this request.
     * E.g.: gemini | mock
     * Null if AI was not called (fallback/error).
     */
    @Column(name = "provider", length = 50)
    private String provider;

    /**
     * Specific model name used.
     * E.g.: gemini-2.5-flash-lite | gemini-2.5-flash
     * Null if AI was not called.
     */
    @Column(name = "model_name", length = 100)
    private String modelName;

    /**
     * Whether this log entry counts toward the daily quota.
     * Only true when AI provider was successfully called and returned a response.
     */
    @Column(name = "counted_as_question", nullable = false)
    @Builder.Default
    private Boolean countedAsQuestion = false;

    /**
     * Log entry outcome status.
     * Values:
     *   SUCCESS           - AI responded successfully
     *   FAILED            - AI call failed (network/provider error)
     *   SKIPPED_NO_CONTEXT - No relevant chunks found, fallback returned without calling AI
     *   QUOTA_EXCEEDED    - User daily quota already exhausted
     *   AI_NOT_CONFIGURED - AI provider key not configured
     */
    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    private String status = "SUCCESS";

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
