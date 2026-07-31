package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.dto.TierLimits;
import com.demo.ai_study_hub.enums.UserTier;
import com.demo.ai_study_hub.entity.User;
import org.springframework.stereotype.Service;

import com.demo.ai_study_hub.config.AiProperties;
import lombok.RequiredArgsConstructor;
import java.time.LocalDateTime;
import java.time.ZoneOffset;

@Service
public class TierPolicyService {

    private final AiProperties aiProperties;
    private final com.demo.ai_study_hub.repository.PlanConfigRepository planConfigRepository;

    @org.springframework.beans.factory.annotation.Autowired
    public TierPolicyService(AiProperties aiProperties, com.demo.ai_study_hub.repository.PlanConfigRepository planConfigRepository) {
        this.aiProperties = aiProperties;
        this.planConfigRepository = planConfigRepository;
    }

    public TierPolicyService(AiProperties aiProperties) {
        this.aiProperties = aiProperties;
        this.planConfigRepository = null;
    }

    // Quota/business limits per tier are fixed and hardcoded here — they are
    // NOT sourced from AiProperties (that class only configures the AI
    // provider/model, never business quota values).
    private static final TierLimits FREE_LIMITS = new TierLimits(
            100L * 1024 * 1024,        // storageBytes: 100MB
            30,                         // maxDocuments
            10L * 1024 * 1024,         // maxFileBytes: 10MB
            20,                         // maxFolders
            3,                          // maxFolderDepth
            3,                          // maxOwnedGroups
            3,                          // maxMembersPerGroup
            30,                         // maxActiveShares
            3,                          // maxAiSessionsPerDocument
            30,                         // maxMessagesPerSession
            5,                          // aiQuestionsPerDay
            500,                        // maxQuestionChars
            3,                          // maxContextChunks
            500,                        // maxOutputTokens
            null,                       // aiModel (resolved dynamically, see getModelForTier)
            3,                          // summaryGenerationsPerDay
            2,                          // flashcardSetsPerDay
            2,                          // quizSetsPerDay
            5,                          // itemsPerSet
            20,                         // maxQuizQuestionsPerSet
            20                          // maxFlashcardsPerSet
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
            null,                       // aiModel (resolved dynamically)
            20,                          // summaryGenerationsPerDay
            15,                          // flashcardSetsPerDay
            15,                          // quizSetsPerDay
            15,                          // itemsPerSet
            50,                         // maxQuizQuestionsPerSet
            50                          // maxFlashcardsPerSet
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
            null,                       // aiModel (resolved dynamically)
            50,                          // summaryGenerationsPerDay
            40,                          // flashcardSetsPerDay
            40,                          // quizSetsPerDay
            30,                          // itemsPerSet
            80,                         // maxQuizQuestionsPerSet
            80                          // maxFlashcardsPerSet
    );

    /**
     * Effective tier: falls back to FREE once tierExpiresAt has passed.
     * Comparison is always done in UTC to avoid server-timezone drift.
     */
    public UserTier getEffectiveTier(User user) {
        if (user.getTier() == UserTier.FREE) return UserTier.FREE;
        LocalDateTime expiresAt = user.getTierExpiresAt();
        if (expiresAt != null && expiresAt.isAfter(LocalDateTime.now(ZoneOffset.UTC))) {
            return user.getTier();
        }
        return UserTier.FREE;
    }

    public TierLimits getLimits(UserTier tier) {
        com.demo.ai_study_hub.entity.PlanConfig plan = null;
        if (planConfigRepository != null) {
            java.util.List<com.demo.ai_study_hub.entity.PlanConfig> plans =
                planConfigRepository.findByTargetTier(tier.name());
            plan = plans.stream()
                .filter(p -> "ACTIVE".equalsIgnoreCase(p.getStatus()))
                .findFirst()
                .orElse(plans.isEmpty() ? null : plans.get(0));
        }

        TierLimits base = switch (tier) {
            case PREMIUM -> PREMIUM_LIMITS;
            case ULTRA -> ULTRA_LIMITS;
            default -> FREE_LIMITS;
        };

        long storageBytes = plan != null ? plan.getStorageLimit() : base.storageBytes();
        int maxDocuments = plan != null ? plan.getMaxDocumentCount() : base.maxDocuments();
        long maxFileBytes = plan != null ? plan.getMaxFileSize() : base.maxFileBytes();
        int maxFolders = plan != null ? plan.getMaxFolderCount() : base.maxFolders();
        int maxFolderDepth = plan != null ? plan.getMaxFolderDepth() : base.maxFolderDepth();
        int maxOwnedGroups = plan != null ? plan.getMaxGroupCount() : base.maxOwnedGroups();
        int maxMembersPerGroup = plan != null ? plan.getMaxMembersPerGroup() : base.maxMembersPerGroup();
        int maxActiveShares = plan != null ? plan.getMaxActiveShares() : base.maxActiveShares();
        int maxAiSessionsPerDocument = plan != null ? plan.getMaxAiSessionsPerDocument() : base.maxAiSessionsPerDocument();
        int maxMessagesPerSession = plan != null ? plan.getMaxMessagesPerSession() : base.maxMessagesPerSession();
        int aiQuestionsPerDay = plan != null ? plan.getAiDailyQuestionLimit() : base.aiQuestionsPerDay();
        int maxQuestionChars = plan != null ? plan.getMaxQuestionChars() : base.maxQuestionChars();
        int maxContextChunks = plan != null ? plan.getMaxContextChunks() : base.maxContextChunks();
        int maxOutputTokens = plan != null ? plan.getMaxOutputTokens() : base.maxOutputTokens();
        int summaryGenerationsPerDay = plan != null ? plan.getSummaryDailyLimit() : base.summaryGenerationsPerDay();
        int flashcardSetsPerDay = plan != null ? plan.getFlashcardDailyLimit() : base.flashcardSetsPerDay();
        int quizSetsPerDay = plan != null ? plan.getQuizDailyLimit() : base.quizSetsPerDay();
        int itemsPerSet = plan != null ? plan.getItemsPerSet() : base.itemsPerSet();
        int maxQuizQuestionsPerSet = plan != null ? plan.getMaxQuizQuestionsPerSet() : base.maxQuizQuestionsPerSet();
        int maxFlashcardsPerSet = plan != null ? plan.getMaxFlashcardsPerSet() : base.maxFlashcardsPerSet();

        String model = getModelForTier(tier);

        return new TierLimits(
                storageBytes,
                maxDocuments,
                maxFileBytes,
                maxFolders,
                maxFolderDepth,
                maxOwnedGroups,
                maxMembersPerGroup,
                maxActiveShares,
                maxAiSessionsPerDocument,
                maxMessagesPerSession,
                aiQuestionsPerDay,
                maxQuestionChars,
                maxContextChunks,
                maxOutputTokens,
                model,
                summaryGenerationsPerDay,
                flashcardSetsPerDay,
                quizSetsPerDay,
                itemsPerSet,
                maxQuizQuestionsPerSet,
                maxFlashcardsPerSet
        );
    }

    private String getModelForTier(UserTier tier) {
        if (aiProperties == null) {
            return switch (tier) {
                case PREMIUM, ULTRA -> "gemini-2.5-flash";
                default -> "gemini-2.5-flash-lite";
            };
        }
        if ("mock".equalsIgnoreCase(aiProperties.getProvider())) {
            return "mock";
        }
        return switch (tier) {
            case PREMIUM -> aiProperties.getGemini().getPremiumModel();
            case ULTRA -> aiProperties.getGemini().getUltraModel();
            default -> aiProperties.getGemini().getFreeModel();
        };
    }

    public TierLimits getLimitsForUser(User user) {
        return getLimits(getEffectiveTier(user));
    }
}