package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.dto.TierLimits;
import com.demo.ai_study_hub.dto.UserTier;
import com.demo.ai_study_hub.entity.User;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class TierPolicyService {

    private static final TierLimits FREE_LIMITS = new TierLimits(
        100L * 1024 * 1024,        // storageBytes: 100MB
        30,                         // maxDocuments
        10L * 1024 * 1024,         // maxFileBytes: 10MB
        20,                         // maxFolders
        3,                          // maxFolderDepth
        3,                          // maxOwnedGroups
        10,                         // maxMembersPerGroup
        30,                         // maxActiveShares
        3,                          // maxAiSessionsPerDocument
        30,                         // maxMessagesPerSession
        5,                          // aiQuestionsPerDay
        500,                        // maxQuestionChars
        3,                          // maxContextChunks
        500,                        // maxOutputTokens
        "gemini-2.5-flash-lite",   // aiModel
        1,                          // summaryGenerationsPerDay
        1,                          // flashcardSetsPerDay
        1,                          // quizSetsPerDay
        5                           // itemsPerSet
    );

    private static final TierLimits PREMIUM_LIMITS = new TierLimits(
        2L * 1024 * 1024 * 1024,   // storageBytes: 2GB
        500,                         // maxDocuments
        50L * 1024 * 1024,          // maxFileBytes: 50MB
        200,                         // maxFolders
        8,                           // maxFolderDepth
        30,                          // maxOwnedGroups
        100,                         // maxMembersPerGroup
        1000,                        // maxActiveShares
        30,                          // maxAiSessionsPerDocument
        300,                         // maxMessagesPerSession
        50,                          // aiQuestionsPerDay
        2000,                        // maxQuestionChars
        8,                           // maxContextChunks
        1500,                        // maxOutputTokens
        "gemini-2.5-flash",         // aiModel
        10,                          // summaryGenerationsPerDay
        10,                          // flashcardSetsPerDay
        10,                          // quizSetsPerDay
        15                           // itemsPerSet
    );

    private static final TierLimits ULTRA_LIMITS = new TierLimits(
        10L * 1024 * 1024 * 1024,  // storageBytes: 10GB
        2000,                        // maxDocuments
        100L * 1024 * 1024,         // maxFileBytes: 100MB
        1000,                        // maxFolders
        12,                          // maxFolderDepth
        100,                         // maxOwnedGroups
        300,                         // maxMembersPerGroup
        5000,                        // maxActiveShares
        100,                         // maxAiSessionsPerDocument
        1000,                        // maxMessagesPerSession
        200,                         // aiQuestionsPerDay
        5000,                        // maxQuestionChars
        15,                          // maxContextChunks
        3000,                        // maxOutputTokens
        "gemini-2.5-flash",         // aiModel
        50,                          // summaryGenerationsPerDay
        50,                          // flashcardSetsPerDay
        50,                          // quizSetsPerDay
        30                           // itemsPerSet
    );

    public UserTier getEffectiveTier(User user) {
        if (user.getTier() == UserTier.FREE) return UserTier.FREE;
        LocalDateTime expiresAt = user.getTierExpiresAt();
        if (expiresAt != null && expiresAt.isAfter(LocalDateTime.now())) {
            return user.getTier();
        }
        return UserTier.FREE;
    }

    public TierLimits getLimits(UserTier tier) {
        return switch (tier) {
            case PREMIUM -> PREMIUM_LIMITS;
            case ULTRA -> ULTRA_LIMITS;
            default -> FREE_LIMITS;
        };
    }

    public TierLimits getLimitsForUser(User user) {
        return getLimits(getEffectiveTier(user));
    }
}
