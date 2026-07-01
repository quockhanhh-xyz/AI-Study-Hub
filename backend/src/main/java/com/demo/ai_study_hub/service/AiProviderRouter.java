package com.demo.ai_study_hub.service;

/**
 * Routes AI requests to the appropriate AiProviderService implementation
 * based on runtime configuration (ai.provider property).
 *
 * Rules:
 *   - Never hardcode provider selection in controller or service business logic.
 *   - ai.provider=mock → returns MockAiProviderService
 *   - ai.provider=gemini → returns GeminiAiProviderService
 */
public interface AiProviderRouter {

    /**
     * Returns the appropriate AiProviderService for the current configuration.
     *
     * @return configured AiProviderService implementation
     */
    AiProviderService route();

    /**
     * Returns true if the current configured provider is operational.
     * For "gemini", returns false if GEMINI_API_KEY is not configured.
     * For "mock", always returns true.
     */
    boolean isConfigured();
}
