package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.dto.AiAnswer;

/**
 * AI provider abstraction layer.
 *
 * Implementations:
 *   - MockAiProviderService: Returns mock answers for local/demo use (no API key needed)
 *   - GeminiAiProviderService: Calls Google Gemini REST API (requires GEMINI_API_KEY)
 *
 * Future implementations may include OpenAiProviderService, ClaudeProviderService.
 *
 * Rules:
 *   - Controller must never call this directly. Use AiProviderRouter.
 *   - Never log API keys.
 *   - Never expose raw provider errors to callers. Throw ResponseStatusException instead.
 *   - Handle connect and read timeouts.
 */
public interface AiProviderService {

    /**
     * Call the AI provider with a prepared prompt and return the answer.
     *
     * @param prompt    The full prompt including system rules + context + question
     * @param modelName The model name to use (selected by AiModelSelector)
     * @param maxOutputTokens Max tokens to generate
     * @param temperature Temperature for generation (0.0 = deterministic, 1.0 = creative)
     * @return AiAnswer containing text, provider, model, and token usage
     * @throws org.springframework.web.server.ResponseStatusException 503 if provider unavailable
     */
    AiAnswer call(String prompt, String modelName, int maxOutputTokens, double temperature);

    /**
     * Returns the provider identifier string.
     * E.g.: "gemini" | "mock"
     */
    String getProviderName();
}
