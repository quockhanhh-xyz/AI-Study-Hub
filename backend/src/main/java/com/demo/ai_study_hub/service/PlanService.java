package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.dto.PlanCode;
import com.demo.ai_study_hub.dto.PlanResponse;
import com.demo.ai_study_hub.enums.UserTier;
import lombok.Builder;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PlanService {

    private final TierPolicyService tierPolicyService;

    public static final long FREE_PRICE = 0L;
    public static final long PREMIUM_PRICE = 199_000L;
    public static final long ULTRA_PRICE = 399_000L;
    public static final int PAID_DURATION_MONTHS = 1;
    public static final String CURRENCY = "VND";
    public static final String PREMIUM_BILLING_LABEL = "1 month";
    public static final String FREE_BILLING_LABEL = "Free";

    /**
     * Backend's single source of truth for a plan's price/target tier/duration.
     * FE only ever sends a planCode; every other value here is decided by us.
     */
    @Getter
    @Builder
    public static class PaymentPlan {
        private final String planCode;
        private final String planName;
        private final UserTier targetTier;
        private final long price;
        private final int durationMonths;
        private final String billingLabel;
        private final boolean purchasable;
        private final List<String> features;
    }

    private Map<String, PaymentPlan> plans() {
        Map<String, PaymentPlan> map = new LinkedHashMap<>();
        map.put(PlanCode.FREE, PaymentPlan.builder()
                .planCode(PlanCode.FREE)
                .planName("Free")
                .targetTier(UserTier.FREE)
                .price(FREE_PRICE)
                .durationMonths(0)
                .billingLabel(FREE_BILLING_LABEL)
                .purchasable(false)
                .features(List.of(
                        "5 AI questions per day",
                        "Upload files up to 10MB",
                        "View shared and community documents"
                ))
                .build());
        map.put(PlanCode.PREMIUM_1_MONTH, PaymentPlan.builder()
                .planCode(PlanCode.PREMIUM_1_MONTH)
                .planName("Premium")
                .targetTier(UserTier.PREMIUM)
                .price(PREMIUM_PRICE)
                .durationMonths(PAID_DURATION_MONTHS)
                .billingLabel(PREMIUM_BILLING_LABEL)
                .purchasable(true)
                .features(List.of(
                        "50 AI questions per day",
                        "Upload files up to 50MB",
                        "Generate flashcards and quizzes"
                ))
                .build());
        map.put(PlanCode.ULTRA_1_MONTH, PaymentPlan.builder()
                .planCode(PlanCode.ULTRA_1_MONTH)
                .planName("Ultra")
                .targetTier(UserTier.ULTRA)
                .price(ULTRA_PRICE)
                .durationMonths(PAID_DURATION_MONTHS)
                .billingLabel(PREMIUM_BILLING_LABEL)
                .purchasable(true)
                .features(List.of(
                        "200 AI questions per day",
                        "Upload files up to 100MB",
                        "Higher limits for AI learning tools"
                ))
                .build());
        return map;
    }

    public List<PlanResponse> getAllPlans() {
        return plans().values().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    private PlanResponse toResponse(PaymentPlan plan) {
        return PlanResponse.builder()
                .tier(plan.getTargetTier().name())
                .planCode(plan.getPlanCode())
                .planName(plan.getPlanName())
                .targetTier(plan.getTargetTier().name())
                .price(plan.getPrice())
                .currency(CURRENCY)
                .billingLabel(plan.getBillingLabel())
                .durationMonths(plan.getDurationMonths())
                .aiDailyLimit(tierPolicyService.getLimits(plan.getTargetTier()).aiQuestionsPerDay())
                .purchasable(plan.isPurchasable())
                .features(plan.getFeatures())
                .build();
    }

    /**
     * Looks up a plan by code. Throws 400 if the plan code does not exist.
     * NEVER falls back to FREE pricing silently.
     */
    public PaymentPlan getPlan(String planCode) {
        PaymentPlan plan = planCode == null ? null : plans().get(planCode.toUpperCase());
        if (plan == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid plan code: " + planCode);
        }
        return plan;
    }

    public long getPrice(String planCode) {
        return getPlan(planCode).getPrice();
    }

    public UserTier getTargetTier(String planCode) {
        return getPlan(planCode).getTargetTier();
    }

    public int getDurationMonths(String planCode) {
        return getPlan(planCode).getDurationMonths();
    }

    public boolean isValidPlanCode(String planCode) {
        return planCode != null && plans().containsKey(planCode.toUpperCase());
    }

    public boolean isPurchasablePlanCode(String planCode) {
        return isValidPlanCode(planCode) && getPlan(planCode).isPurchasable();
    }
}
