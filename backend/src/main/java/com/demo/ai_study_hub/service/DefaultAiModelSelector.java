package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.config.AiProperties;
import com.demo.ai_study_hub.dto.TierLimits;
import com.demo.ai_study_hub.dto.UserTier;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class DefaultAiModelSelector implements AiModelSelector {

    private final AiProperties aiProperties;
    private final TierPolicyService tierPolicyService;

    private TierLimits limits(String userTier) {
        UserTier tier;
        try {
            tier = UserTier.valueOf(userTier.toUpperCase());
        } catch (Exception e) {
            tier = UserTier.FREE;
        }
        return tierPolicyService.getLimits(tier);
    }

    @Override
    public String selectModel(String userTier) {
        if ("mock".equalsIgnoreCase(aiProperties.getProvider())) return "mock";
        return limits(userTier).aiModel();
    }

    @Override
    public int getMaxOutputTokens(String userTier) {
        return limits(userTier).maxOutputTokens();
    }

    @Override
    public int getMaxContextChunks(String userTier) {
        return limits(userTier).maxContextChunks();
    }

    @Override
    public int getMaxQuestionChars(String userTier) {
        return limits(userTier).maxQuestionChars();
    }

    @Override
    public int getDailyQuestionLimit(String userTier) {
        return limits(userTier).aiQuestionsPerDay();
    }
}
