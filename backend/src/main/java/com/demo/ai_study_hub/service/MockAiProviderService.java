package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.dto.AiAnswer;
import org.springframework.stereotype.Service;

/**
 * Mock AI provider for local development and demo.
 * Returns realistic-looking mock answers without calling any external API.
 * Does not require any API key configuration.
 *
 * Behavior:
 *  - Always succeeds (never throws 503)
 *  - Returns a mock answer acknowledging the question
 *  - Returns estimated token counts based on prompt/answer length
 *  - Sets tokenUsageEstimated = true
 */
@Service
public class MockAiProviderService implements AiProviderService {

    private static final String PROVIDER_NAME = "mock";
    private static final String MODEL_NAME = "mock";

    /**
     * Estimate token count: approximately 4 characters per token (rough approximation).
     */
    private static int estimateTokens(String text) {
        if (text == null || text.isBlank()) return 0;
        return Math.max(1, text.length() / 4);
    }

    @Override
    public AiAnswer call(String prompt, String modelName, int maxOutputTokens, double temperature) {
        String mockAnswer = buildMockAnswer(prompt);

        int inputTokens = estimateTokens(prompt);
        int outputTokens = estimateTokens(mockAnswer);

        return AiAnswer.builder()
                .text(mockAnswer)
                .provider(PROVIDER_NAME)
                .modelName(MODEL_NAME)
                .inputTokens(inputTokens)
                .outputTokens(outputTokens)
                .totalTokens(inputTokens + outputTokens)
                .tokenUsageEstimated(true)
                .build();
    }

    @Override
    public String getProviderName() {
        return PROVIDER_NAME;
    }

    private String buildMockAnswer(String prompt) {
        // Extract question from prompt for a more realistic-looking mock response
        String question = extractQuestionFromPrompt(prompt);
        return "[Mock AI Response] Based on the document content provided, " +
               "here is a summary answer to your question: \"" + question + "\". " +
               "This is a mock response generated for local development and demo purposes. " +
               "In production, this would be replaced by a real Gemini API response " +
               "based on the actual document chunks retrieved as context.";
    }

    private String extractQuestionFromPrompt(String prompt) {
        // Try to extract the question from the prompt format used by PromptBuilderService
        if (prompt == null) return "unknown";
        int idx = prompt.lastIndexOf("Question:");
        if (idx >= 0 && idx + 9 < prompt.length()) {
            return prompt.substring(idx + 9).trim();
        }
        // Fallback: return last 100 chars
        return prompt.length() > 100 ? prompt.substring(prompt.length() - 100).trim() : prompt.trim();
    }
}
