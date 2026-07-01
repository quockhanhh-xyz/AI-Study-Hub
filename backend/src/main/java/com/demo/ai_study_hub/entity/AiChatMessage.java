package com.demo.ai_study_hub.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "ai_chat_messages", indexes = {
    @Index(name = "idx_ai_chat_messages_session", columnList = "session_id"),
    @Index(name = "idx_ai_chat_messages_created", columnList = "created_at")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "message_id")
    private Long messageId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    private AiChatSession session;

    /**
     * Message sender role.
     * Values: USER | ASSISTANT
     */
    @Column(name = "role", nullable = false, length = 20)
    private String role;

    /**
     * The message text content (user question or assistant answer).
     */
    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    private String content;

    /**
     * AI provider used for this message (null for USER messages).
     * E.g.: gemini | mock
     */
    @Column(name = "provider", length = 50)
    private String provider;

    /**
     * Specific model name used (null for USER messages).
     * E.g.: gemini-2.5-flash-lite | gemini-2.5-flash | mock
     */
    @Column(name = "model_name", length = 100)
    private String modelName;

    /**
     * Token count for input to AI (null for USER messages or no-context fallback).
     */
    @Column(name = "input_tokens")
    private Integer inputTokens;

    /**
     * Token count for output from AI (null for USER messages or no-context fallback).
     */
    @Column(name = "output_tokens")
    private Integer outputTokens;

    /**
     * Total tokens = inputTokens + outputTokens.
     */
    @Column(name = "total_tokens")
    private Integer totalTokens;

    /**
     * True if token counts are estimated (provider did not return exact usage).
     */
    @Column(name = "token_usage_estimated")
    @Builder.Default
    private Boolean tokenUsageEstimated = false;

    /**
     * JSON array of source chunk references used to generate this answer.
     * Format: [{"chunkIndex": 1, "sourceLabel": "Chunk 1"}, ...]
     * Null for USER messages or no-context fallback.
     */
    @Column(name = "source_chunks", columnDefinition = "TEXT")
    private String sourceChunks;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
