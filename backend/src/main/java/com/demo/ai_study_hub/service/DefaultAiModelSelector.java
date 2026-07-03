package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.config.AiProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class DefaultAiModelSelector implements AiModelSelector {

    private final AiProperties aiProperties;
    private final PlanService planService;

    @Override
    public String selectModel(String userTier) {
        if ("mock".equalsIgnoreCase(aiProperties.getProvider())) {
            return "mock";
        }
        return planService.getModel(userTier);
    }

    @Override
    public int getMaxOutputTokens(String userTier) {
        return planService.getMaxOutputTokens(userTier);
    }

    @Override
    public int getMaxContextChunks(String userTier) {
        return planService.getMaxContextChunks(userTier);
    }

    @Override
    public int getMaxQuestionChars(String userTier) {
        return planService.getMaxQuestionChars(userTier);
    }

    @Override
    public int getDailyQuestionLimit(String userTier) {
        return planService.getDailyLimit(userTier);
    }
}
