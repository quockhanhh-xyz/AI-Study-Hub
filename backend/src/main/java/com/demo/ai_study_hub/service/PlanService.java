package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.dto.PlanCode;
import com.demo.ai_study_hub.dto.PlanResponse;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class PlanService {

    // Single source of truth cho tất cả tier limits
    public static final int FREE_DAILY_LIMIT = 5;
    public static final int FREE_MAX_QUESTION_CHARS = 500;
    public static final int FREE_MAX_CONTEXT_CHUNKS = 3;
    public static final int FREE_MAX_OUTPUT_TOKENS = 500;
    public static final String FREE_MODEL = "gemini-2.5-flash-lite";
    public static final long FREE_PRICE = 0;

    public static final int PREMIUM_DAILY_LIMIT = 50;
    public static final int PREMIUM_MAX_QUESTION_CHARS = 2000;
    public static final int PREMIUM_MAX_CONTEXT_CHUNKS = 8;
    public static final int PREMIUM_MAX_OUTPUT_TOKENS = 1500;
    public static final String PREMIUM_MODEL = "gemini-2.5-flash";
    public static final long PREMIUM_PRICE = 199000;
    public static final String PREMIUM_BILLING_LABEL = "month";
    public static final String CURRENCY = "VND";

    public List<PlanResponse> getAllPlans() {
        return List.of(getFreePlan(), getPremiumPlan());
    }

    public PlanResponse getFreePlan() {
        return PlanResponse.builder()
            .planCode(PlanCode.FREE)
            .planName("Free")
            .price(FREE_PRICE)
            .currency(CURRENCY)
            .billingLabel("free")
            .aiDailyLimit(FREE_DAILY_LIMIT)
            .build();
    }

    public PlanResponse getPremiumPlan() {
        return PlanResponse.builder()
            .planCode(PlanCode.PREMIUM)
            .planName("Premium")
            .price(PREMIUM_PRICE)
            .currency(CURRENCY)
            .billingLabel(PREMIUM_BILLING_LABEL)
            .aiDailyLimit(PREMIUM_DAILY_LIMIT)
            .build();
    }

    public int getDailyLimit(String tier) {
        if ("PREMIUM".equalsIgnoreCase(tier)) return PREMIUM_DAILY_LIMIT;
        return FREE_DAILY_LIMIT;
    }

    public int getMaxQuestionChars(String tier) {
        if ("PREMIUM".equalsIgnoreCase(tier)) return PREMIUM_MAX_QUESTION_CHARS;
        return FREE_MAX_QUESTION_CHARS;
    }

    public int getMaxContextChunks(String tier) {
        if ("PREMIUM".equalsIgnoreCase(tier)) return PREMIUM_MAX_CONTEXT_CHUNKS;
        return FREE_MAX_CONTEXT_CHUNKS;
    }

    public int getMaxOutputTokens(String tier) {
        if ("PREMIUM".equalsIgnoreCase(tier)) return PREMIUM_MAX_OUTPUT_TOKENS;
        return FREE_MAX_OUTPUT_TOKENS;
    }

    public String getModel(String tier) {
        if ("PREMIUM".equalsIgnoreCase(tier)) return PREMIUM_MODEL;
        return FREE_MODEL;
    }

    public long getPrice(String planCode) {
        if (PlanCode.PREMIUM.equalsIgnoreCase(planCode)) return PREMIUM_PRICE;
        return FREE_PRICE;
    }

    public boolean isValidPlanCode(String planCode) {
        return PlanCode.PREMIUM.equalsIgnoreCase(planCode)
                || PlanCode.FREE.equalsIgnoreCase(planCode);
    }
}
