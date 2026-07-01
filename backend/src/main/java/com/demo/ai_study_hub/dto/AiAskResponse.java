package com.demo.ai_study_hub.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Response body for POST /api/ai/documents/{documentId}/ask
 *
 * When no context is found (no-context fallback):
 *   - answer = "I could not find this information in the selected document."
 *   - sourceChunks = []
 *   - provider = null, modelName = null, all token fields = 0
 *
 * When AI answers successfully:
 *   - answer = AI-generated text
 *   - sourceChunks = list of chunks used as context
 *   - provider, modelName, token fields set
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiAskResponse {

    /** The AI-generated answer, or the no-context fallback message. */
    private String answer;

    /** List of document chunks used as context. Empty for no-context fallback. */
    private List<AiSourceChunk> sourceChunks;

    /** AI provider used: "gemini" | "mock". Null for no-context fallback. */
    private String provider;

    /** Specific model name used. Null for no-context fallback. */
    private String modelName;

    /** Number of input tokens consumed. 0 for no-context fallback. */
    private Integer inputTokens;

    /** Number of output tokens generated. 0 for no-context fallback. */
    private Integer outputTokens;

    /** Total tokens = inputTokens + outputTokens. 0 for no-context fallback. */
    private Integer totalTokens;

    /**
     * True if token counts are backend estimates because the provider
     * did not return exact usage data.
     */
    private Boolean tokenUsageEstimated;

    /** Remaining AI questions for today after this request. */
    private Integer remainingQuestions;
}
