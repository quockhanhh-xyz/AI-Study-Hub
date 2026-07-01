package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.config.AiProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * Selects the appropriate AI model and tier-based limits based on user tier.
 * All tier logic and model names come from AiProperties (application.properties).
 * No values are hardcoded here.
 */
@Service
@RequiredArgsConstructor
public class DefaultAiModelSelector implements AiModelSelector {

    private final AiProperties aiProperties;

    @Override
    public String selectModel(String userTier) {
        if ("mock".equalsIgnoreCase(aiProperties.getProvider())) {
            return "mock";
        }
        if ("PREMIUM".equalsIgnoreCase(userTier)) {
            return aiProperties.getGemini().getPremiumModel();
        }
        return aiProperties.getGemini().getFreeModel();
    }

    @Override
    public int getMaxOutputTokens(String userTier) {
        if ("PREMIUM".equalsIgnoreCase(userTier)) {
            return aiProperties.getPremium().getMaxOutputTokens();
        }
        return aiProperties.getFree().getMaxOutputTokens();
    }

    @Override
    public int getMaxContextChunks(String userTier) {
        if ("PREMIUM".equalsIgnoreCase(userTier)) {
            return aiProperties.getPremium().getMaxContextChunks();
        }
        return aiProperties.getFree().getMaxContextChunks();
    }

    @Override
    public int getMaxQuestionChars(String userTier) {
        if ("PREMIUM".equalsIgnoreCase(userTier)) {
            return aiProperties.getPremium().getMaxQuestionChars();
        }
        return aiProperties.getFree().getMaxQuestionChars();
    }

    @Override
    public int getDailyQuestionLimit(String userTier) {
        if ("PREMIUM".equalsIgnoreCase(userTier)) {
            return aiProperties.getPremium().getDailyQuestionLimit();
        }
        return aiProperties.getFree().getDailyQuestionLimit();
    }
}
