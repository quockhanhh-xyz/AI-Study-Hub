package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.dto.*;
import com.demo.ai_study_hub.dto.PaymentResponse;
import com.demo.ai_study_hub.entity.PaymentOrder;
import com.demo.ai_study_hub.entity.User;
import com.demo.ai_study_hub.repository.PaymentOrderRepository;
import com.demo.ai_study_hub.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import com.demo.ai_study_hub.enums.UserTier;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentOrderRepository paymentOrderRepository;
    private final UserRepository userRepository;
    private final PlanService planService;
    private final TierPolicyService tierPolicyService;

    @Transactional
    public PaymentResponse createMockPayment(User user, String planCode) {
        if (!planService.isValidPlanCode(planCode)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Invalid plan code: " + planCode);
        }
        if (PlanCode.FREE.equalsIgnoreCase(planCode)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Cannot create payment for FREE plan");
        }

        UserTier targetTier = planService.getTargetTier(planCode);
        UserTier currentEffectiveTier = tierPolicyService.getEffectiveTier(user);

        // Only disallowed upgrade path: ULTRA -> PREMIUM (downgrade via payment)
        if (currentEffectiveTier == UserTier.ULTRA && targetTier == UserTier.PREMIUM) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Downgrade from ULTRA to PREMIUM is not supported.");
        }

        PaymentOrder order = PaymentOrder.builder()
                .user(user)
                .planCode(planCode.toUpperCase())
                .amount(planService.getPrice(planCode))
                .currency(PlanService.CURRENCY)
                .status(PaymentStatus.PENDING)
                .paymentMethod(PaymentMethod.MOCK)
                .build();

        paymentOrderRepository.save(order);
        return toResponse(order, user.getTier().name());
    }

    @Transactional
    public PaymentResponse markPaymentSuccess(User user, Long paymentId) {
        PaymentOrder order = paymentOrderRepository
                .findByPaymentIdAndUserForUpdate(paymentId, user)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Payment not found"));

        if (!PaymentStatus.PENDING.equals(order.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Payment is no longer pending");
        }

        // Lock the user row so two concurrent successful payments for the
        // same user cannot both compute expiry from a stale snapshot.
        User freshUser = userRepository.findByIdForUpdate(user.getUserId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        UserTier targetTier = planService.getTargetTier(order.getPlanCode());
        UserTier currentEffectiveTier = tierPolicyService.getEffectiveTier(freshUser);

        if (currentEffectiveTier == UserTier.ULTRA && targetTier == UserTier.PREMIUM) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Downgrade from ULTRA to PREMIUM is not supported.");
        }

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime newExpiry;

        if (currentEffectiveTier == targetTier) {
            // Same-tier renewal: extend from current expiry if still active,
            // otherwise from now (covers an already-expired same tier).
            LocalDateTime currentExpiry = freshUser.getTierExpiresAt();
            LocalDateTime base = (currentExpiry != null && currentExpiry.isAfter(now)) ? currentExpiry : now;
            newExpiry = base.plusMonths(1);
        } else {
            // FREE -> target, or PREMIUM -> ULTRA upgrade: always starts fresh
            // from now. Remaining Premium time is intentionally NOT carried
            // over into Ultra to avoid free Ultra time; FE must warn the user
            // before confirming an upgrade.
            newExpiry = now.plusMonths(1);
        }

        order.setStatus(PaymentStatus.SUCCESS);
        order.setPaidAt(now);
        paymentOrderRepository.save(order);

        freshUser.setTier(targetTier);
        freshUser.setTierExpiresAt(newExpiry);
        userRepository.save(freshUser);

        return toResponse(order, targetTier.name());
    }

    @Transactional
    public PaymentResponse markPaymentFailed(User user, Long paymentId) {
        PaymentOrder order = paymentOrderRepository
                .findByPaymentIdAndUserForUpdate(paymentId, user)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Payment not found"));

        if (!PaymentStatus.PENDING.equals(order.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Payment is no longer pending");
        }

        order.setStatus(PaymentStatus.FAILED);
        paymentOrderRepository.save(order);

        User freshUser = userRepository.findById(user.getUserId()).orElse(user);
        return toResponse(order, freshUser.getTier().name());
    }

    @Transactional
    public PaymentResponse cancelPayment(User user, Long paymentId) {
        PaymentOrder order = paymentOrderRepository
                .findByPaymentIdAndUserForUpdate(paymentId, user)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Payment not found"));

        if (!PaymentStatus.PENDING.equals(order.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Payment is no longer pending");
        }

        order.setStatus(PaymentStatus.CANCELLED);
        paymentOrderRepository.save(order);

        User freshUser = userRepository.findById(user.getUserId()).orElse(user);
        return toResponse(order, freshUser.getTier().name());
    }

    public List<PaymentResponse> getMyPayments(User user) {
        return paymentOrderRepository.findByUserOrderByCreatedAtDesc(user)
                .stream()
                .map(order -> toResponse(order, null))
                .collect(Collectors.toList());
    }

    private String planNameForCode(String planCode) {
        if (PlanCode.ULTRA.equalsIgnoreCase(planCode)) return "Ultra";
        if (PlanCode.PREMIUM.equalsIgnoreCase(planCode)) return "Premium";
        return "Free";
    }

    private String billingLabelForCode(String planCode) {
        if (PlanCode.PREMIUM.equalsIgnoreCase(planCode) || PlanCode.ULTRA.equalsIgnoreCase(planCode)) {
            return PlanService.PREMIUM_BILLING_LABEL;
        }
        return PlanService.FREE_BILLING_LABEL;
    }

    private PaymentResponse toResponse(PaymentOrder order, String tier) {
        return PaymentResponse.builder()
                .paymentId(order.getPaymentId())
                .planCode(order.getPlanCode())
                .planName(planNameForCode(order.getPlanCode()))
                .amount(order.getAmount())
                .currency(order.getCurrency())
                .billingLabel(billingLabelForCode(order.getPlanCode()))
                .status(order.getStatus())
                .paymentMethod(order.getPaymentMethod())
                .tier(tier)
                .createdAt(order.getCreatedAt())
                .paidAt(order.getPaidAt())
                .build();
    }
}