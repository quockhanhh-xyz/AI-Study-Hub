package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.enums.UserTier;
import org.springframework.stereotype.Component;

/**
 * Single source of truth for Step 14 (Summary/Flashcard/Quiz) quota and
 * count-validation numbers, per api-contract.md section 18.5.
 *
 * Deliberately NOT hardcoded inline in the services — every number lives
 * here so the quota table can be audited/changed in exactly one place.
 */
@Component
public class AiLearningQuotaPolicy {

    public record CountRange(int min, int defaultValue, int max) {}

    public int summaryDailyLimit(UserTier tier) {
        return switch (tier) {
            case PREMIUM -> 20;
            case ULTRA -> 50;
            default -> 3;
        };
    }

    public int flashcardSetDailyLimit(UserTier tier) {
        return switch (tier) {
            case PREMIUM -> 15;
            case ULTRA -> 40;
            default -> 2;
        };
    }

    public int quizSetDailyLimit(UserTier tier) {
        return switch (tier) {
            case PREMIUM -> 15;
            case ULTRA -> 40;
            default -> 2;
        };
    }

    public CountRange flashcardCountRange(UserTier tier) {
        return switch (tier) {
            case PREMIUM -> new CountRange(3, 15, 30);
            case ULTRA -> new CountRange(3, 20, 50);
            default -> new CountRange(3, 8, 8);
        };
    }

    public CountRange quizQuestionCountRange(UserTier tier) {
        return switch (tier) {
            case PREMIUM -> new CountRange(3, 10, 15);
            case ULTRA -> new CountRange(3, 15, 25);
            default -> new CountRange(3, 5, 5);
        };
    }
}