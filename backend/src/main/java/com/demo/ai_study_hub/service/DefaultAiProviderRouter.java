package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.config.AiProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * Routes AI requests to the appropriate provider implementation based on
 * the configured ai.provider property.
 *
 * AI_PROVIDER=mock  → MockAiProviderService (default, no key needed)
 * AI_PROVIDER=gemini → GeminiAiProviderService (requires GEMINI_API_KEY)
 */
@Service
@RequiredArgsConstructor
public class DefaultAiProviderRouter implements AiProviderRouter {

    private final AiProperties aiProperties;
    private final MockAiProviderService mockAiProviderService;
    private final GeminiAiProviderService geminiAiProviderService;

    @Override
    public AiProviderService route() {
        if ("gemini".equalsIgnoreCase(aiProperties.getProvider())) {
            return geminiAiProviderService;
        }
        return mockAiProviderService;
    }

    @Override
    public boolean isConfigured() {
        if ("gemini".equalsIgnoreCase(aiProperties.getProvider())) {
            String key = aiProperties.getGemini().getApiKey();
            return key != null && !key.isBlank();
        }
        // Mock provider is always configured
        return true;
    }
}
