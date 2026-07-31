package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.enums.UserTier;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Single source of truth for Step 14 (Summary/Flashcard/Quiz) quota and
 * count-validation numbers, per api-contract.md section 18.5.
 *
 * Deliberately NOT hardcoded inline in the services — every number lives
 * here so the quota table can be audited/changed in exactly one place.
 */
@Component
@RequiredArgsConstructor
public class AiLearningQuotaPolicy {

    private final TierPolicyService tierPolicyService;

    public record CountRange(int min, int defaultValue, int max) {}

    public int summaryDailyLimit(UserTier tier) {
        return tierPolicyService.getLimits(tier).summaryGenerationsPerDay();
    }

    public int flashcardSetDailyLimit(UserTier tier) {
        return tierPolicyService.getLimits(tier).flashcardSetsPerDay();
    }

    public int quizSetDailyLimit(UserTier tier) {
        return tierPolicyService.getLimits(tier).quizSetsPerDay();
    }

    public CountRange flashcardCountRange(UserTier tier) {
        var limits = tierPolicyService.getLimits(tier);
        int max = limits.maxFlashcardsPerSet();
        int def = limits.itemsPerSet();
        return new CountRange(3, def, max);
    }

    public CountRange quizQuestionCountRange(UserTier tier) {
        var limits = tierPolicyService.getLimits(tier);
        int max = limits.maxQuizQuestionsPerSet();
        int def = limits.itemsPerSet();
        return new CountRange(3, def, max);
    }
}