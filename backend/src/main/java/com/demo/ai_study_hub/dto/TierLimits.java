package com.demo.ai_study_hub.dto;

public record TierLimits(
    long storageBytes,
    int maxDocuments,
    long maxFileBytes,
    int maxFolders,
    int maxFolderDepth,
    int maxOwnedGroups,
    int maxMembersPerGroup,
    int maxActiveShares,
    int maxAiSessionsPerDocument,
    int maxMessagesPerSession,
    int aiQuestionsPerDay,
    int maxQuestionChars,
    int maxContextChunks,
    int maxOutputTokens,
    String aiModel,
    int summaryGenerationsPerDay,
    int flashcardSetsPerDay,
    int quizSetsPerDay,
    int itemsPerSet
) {}
