package com.demo.ai_study_hub.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Internal DTO representing the result from an AI provider call.
 * Returned by AiProviderService implementations (Gemini, Mock, etc.)
 * and consumed by AiChatService for persistence and response building.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiAnswer {

    /** AI-generated answer text */
    private String text;

    /** Provider identifier: "gemini" | "mock" */
    private String provider;

    /** Specific model name used: "gemini-2.5-flash-lite" | "mock" | etc. */
    private String modelName;

    /** Input tokens consumed (0 if unknown) */
    private int inputTokens;

    /** Output tokens generated (0 if unknown) */
    private int outputTokens;

    /** Total tokens = inputTokens + outputTokens */
    private int totalTokens;

    /**
     * True if token counts are estimates because the provider
     * did not return exact usage data.
     */
    private boolean tokenUsageEstimated;
}
