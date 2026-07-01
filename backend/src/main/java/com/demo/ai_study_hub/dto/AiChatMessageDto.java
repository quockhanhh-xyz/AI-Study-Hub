package com.demo.ai_study_hub.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Individual message DTO within a chat session history.
 * Used in AiChatHistoryResponse.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiChatMessageDto {

    private Long messageId;

    /** "USER" or "ASSISTANT" */
    private String role;

    /** Message text content */
    private String content;

    /** AI provider used (null for USER role messages) */
    private String provider;

    /** AI model name (null for USER role messages) */
    private String modelName;

    /** True if token counts are estimates (null for USER role messages) */
    private Boolean tokenUsageEstimated;

    private LocalDateTime createdAt;
}
