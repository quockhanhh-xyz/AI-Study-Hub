package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.dto.PlanCode;
import com.demo.ai_study_hub.dto.PlanResponse;
import com.demo.ai_study_hub.enums.UserTier;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PlanService {

    private final TierPolicyService tierPolicyService;

    public static final long FREE_PRICE = 0;
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
            .aiDailyLimit(tierPolicyService.getLimits(UserTier.FREE).aiQuestionsPerDay())
            .build();
    }

    public PlanResponse getPremiumPlan() {
        return PlanResponse.builder()
            .planCode(PlanCode.PREMIUM)
            .planName("Premium")
            .price(PREMIUM_PRICE)
            .currency(CURRENCY)
            .billingLabel(PREMIUM_BILLING_LABEL)
            .aiDailyLimit(tierPolicyService.getLimits(UserTier.PREMIUM).aiQuestionsPerDay())
            .build();
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
