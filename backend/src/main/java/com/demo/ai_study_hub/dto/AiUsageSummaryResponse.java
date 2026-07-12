package com.demo.ai_study_hub.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Response body for GET /api/ai/usage/me
 * Shows the current user's AI usage statistics for today.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiUsageSummaryResponse {

    /** User account tier: "FREE" | "PREMIUM" | "ULTRA" */
    private String tier;

    /** Max questions per day for this tier */
    private int dailyLimit;

    /** Number of questions used successfully today */
    private int usedToday;

    /** Questions remaining today = dailyLimit - usedToday */
    private int remainingQuestions;

    /** Active AI provider: "gemini" | "mock" */
    private String provider;

    /** Model name assigned to this tier */
    private String modelName;
}