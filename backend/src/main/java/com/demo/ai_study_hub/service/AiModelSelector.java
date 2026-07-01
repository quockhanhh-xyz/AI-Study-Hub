package com.demo.ai_study_hub.service;

/**
 * Selects the appropriate AI model name based on user tier and configured provider.
 *
 * Rules:
 *   - Model selection must never be done in controller or business logic layers.
 *   - For provider=gemini: FREE → gemini-2.5-flash-lite, PREMIUM → gemini-2.5-flash
 *   - For provider=mock: Always "mock"
 */
public interface AiModelSelector {

    /**
     * Select the model name for the given user tier.
     *
     * @param userTier User account tier: "FREE" | "PREMIUM"
     * @return Model name string to pass to AiProviderService
     */
    String selectModel(String userTier);

    /**
     * Return the max output tokens allowed for the given user tier.
     *
     * @param userTier User account tier: "FREE" | "PREMIUM"
     * @return Max output tokens
     */
    int getMaxOutputTokens(String userTier);

    /**
     * Return the max context chunks allowed for the given user tier.
     *
     * @param userTier User account tier: "FREE" | "PREMIUM"
     * @return Max number of chunks to include in prompt
     */
    int getMaxContextChunks(String userTier);

    /**
     * Return the max question character limit for the given user tier.
     *
     * @param userTier User account tier: "FREE" | "PREMIUM"
     * @return Max question characters
     */
    int getMaxQuestionChars(String userTier);

    /**
     * Return the daily question limit for the given user tier.
     *
     * @param userTier User account tier: "FREE" | "PREMIUM"
     * @return Daily limit
     */
    int getDailyQuestionLimit(String userTier);
}
