package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.config.PaymentProperties;
import com.demo.ai_study_hub.dto.*;
import com.demo.ai_study_hub.entity.PaymentOrder;
import com.demo.ai_study_hub.entity.User;
import com.demo.ai_study_hub.enums.UserTier;
import com.demo.ai_study_hub.exception.PaymentException;
import com.demo.ai_study_hub.repository.PaymentOrderRepository;
import com.demo.ai_study_hub.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private static final int PENDING_EXPIRY_MINUTES = 15;

    private final PaymentOrderRepository paymentOrderRepository;
    private final UserRepository userRepository;
    private final PlanService planService;
    private final TierPolicyService tierPolicyService;
    private final PaymentProperties paymentProperties;

    // =========================================================================
    // Mock provider
    // =========================================================================

    @Transactional
    public PaymentResponse createMockPayment(User user, String planCode) {
        if (!paymentProperties.isMockEnabled()) {
            throw new PaymentException(HttpStatus.BAD_REQUEST, "PAYMENT_PROVIDER_DISABLED",
                    "Mock payment provider is disabled.", Map.of("provider", "MOCK"));
        }
        PaymentOrder order = createOrderCommon(user, planCode, PaymentMethod.MOCK, PaymentProvider.MOCK, null);
        // Contract's create response has no "tier" field — pass null so it's excluded (NON_NULL).
        return toResponse(order, null);
    }

    @Transactional
    public PaymentResponse markPaymentSuccess(User user, Long paymentId) {
        if (!paymentProperties.isMockEnabled()) {
            throw new PaymentException(HttpStatus.BAD_REQUEST, "PAYMENT_PROVIDER_DISABLED",
                    "Mock payment provider is disabled.", Map.of("provider", "MOCK"));
        }
        PaymentOrder order = lockOwnedOrderOrThrow(user, paymentId);
        requireMockProvider(order);

        if (!PaymentStatus.PENDING.equals(order.getStatus())) {
            throw new PaymentException(HttpStatus.CONFLICT, "ORDER_NOT_PENDING", "Payment is no longer pending");
        }

        UserTier targetTier = resolveTargetTier(order);
        // Mock payments have no external provider timestamp — use now().
        User result = finalizeSuccessfulPayment(order, targetTier, LocalDateTime.now(ZoneOffset.UTC));
        return toResponse(order, result.getTier().name());
    }

    @Transactional
    public PaymentResponse markPaymentFailed(User user, Long paymentId) {
        if (!paymentProperties.isMockEnabled()) {
            throw new PaymentException(HttpStatus.BAD_REQUEST, "PAYMENT_PROVIDER_DISABLED",
                    "Mock payment provider is disabled.", Map.of("provider", "MOCK"));
        }
        PaymentOrder order = lockOwnedOrderOrThrow(user, paymentId);
        requireMockProvider(order);

        if (!PaymentStatus.PENDING.equals(order.getStatus())) {
            throw new PaymentException(HttpStatus.CONFLICT, "ORDER_NOT_PENDING", "Payment is no longer pending");
        }

        order.setStatus(PaymentStatus.FAILED);
        paymentOrderRepository.save(order);

        User freshUser = userRepository.findById(user.getUserId()).orElse(user);
        return toResponse(order, tierPolicyService.getEffectiveTier(freshUser).name());
    }

    @Transactional
    public PaymentResponse cancelPayment(User user, Long paymentId) {
        if (!paymentProperties.isMockEnabled()) {
            throw new PaymentException(HttpStatus.BAD_REQUEST, "PAYMENT_PROVIDER_DISABLED",
                    "Mock payment provider is disabled.", Map.of("provider", "MOCK"));
        }
        PaymentOrder order = lockOwnedOrderOrThrow(user, paymentId);
        requireMockProvider(order);

        return cancelLockedOrder(user, order);
    }

    /**
     * Cancels a pending order owned by the current user for either provider.
     * A later successful VNPay callback is routed to manual review.
     */
    @Transactional
    public PaymentResponse cancelPendingPayment(User user, Long paymentId) {
        PaymentOrder order = lockOwnedOrderOrThrow(user, paymentId);
        return cancelLockedOrder(user, order);
    }

    private PaymentResponse cancelLockedOrder(User user, PaymentOrder order) {

        if (!PaymentStatus.PENDING.equals(order.getStatus())) {
            throw new PaymentException(HttpStatus.CONFLICT, "ORDER_NOT_PENDING", "Payment is no longer pending");
        }

        order.setStatus(PaymentStatus.CANCELLED);
        paymentOrderRepository.save(order);

        User freshUser = userRepository.findById(user.getUserId()).orElse(user);
        return toResponse(order, tierPolicyService.getEffectiveTier(freshUser).name());
    }

    private void requireMockProvider(PaymentOrder order) {
        if (!PaymentProvider.MOCK.equals(order.getPaymentProvider())) {
            throw new PaymentException(HttpStatus.BAD_REQUEST, "MOCK_CONFIRM_NOT_ALLOWED",
                    "This endpoint only handles mock payment orders.");
        }
    }

    // =========================================================================
    // VNPay provider — order creation only; Return/IPN handled by VNPayIpnService
    // =========================================================================

    @Transactional
    public PaymentOrder createVNPayOrder(User user, String planCode) {
        return createOrderCommon(user, planCode, PaymentMethod.VNPAY, PaymentProvider.VNPAY_SANDBOX, null);
    }

    /**
     * Called by the VNPay controller once the paymentUrl has been built, to
     * persist it. If URL/signature generation fails after the order row was
     * already committed, the controller must call {@link #markOrderFailed}
     * instead of leaving a PENDING order with no paymentUrl.
     */
    @Transactional
    public PaymentResponse attachPaymentUrl(Long paymentId, String paymentUrl, String vnpTxnRef) {
        PaymentOrder order = paymentOrderRepository.findById(paymentId)
                .orElseThrow(() -> new PaymentException(HttpStatus.NOT_FOUND, "PAYMENT_NOT_FOUND", "Payment not found"));
        order.setPaymentUrl(paymentUrl);
        order.setVnpTxnRef(vnpTxnRef);
        paymentOrderRepository.save(order);
        return toResponse(order, null);
    }

    /**
     * Marks a just-created order as FAILED because URL/signature generation
     * blew up before the user ever saw a paymentUrl. Prevents a dangling
     * PENDING order from blocking new checkout attempts for 15 minutes.
     */
    @Transactional
    public void markOrderFailed(Long paymentId) {
        paymentOrderRepository.findById(paymentId).ifPresent(order -> {
            if (PaymentStatus.PENDING.equals(order.getStatus())) {
                order.setStatus(PaymentStatus.FAILED);
                paymentOrderRepository.save(order);
            }
        });
    }

    // =========================================================================
    // Shared order creation (pending-lock + review-lock + downgrade check)
    // =========================================================================

    private PaymentOrder createOrderCommon(User user, String planCode, String paymentMethod,
                                           String paymentProvider, String bankCode) {
        if (!planService.isValidPlanCode(planCode)) {
            throw new PaymentException(HttpStatus.BAD_REQUEST, "INVALID_PLAN", "Invalid plan code: " + planCode);
        }
        if (!planService.isPurchasablePlanCode(planCode)) {
            throw new PaymentException(HttpStatus.BAD_REQUEST, "INVALID_PLAN", "Cannot create payment for FREE plan");
        }

        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);

        // Lock user row for the whole pending/review check + order creation.
        User lockedUser = userRepository.findByIdForUpdate(user.getUserId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        // Expire stale PENDING orders before checking for an active one.
        List<PaymentOrder> stale = paymentOrderRepository.findStalePendingForUpdate(lockedUser, now);
        for (PaymentOrder s : stale) {
            s.setStatus(PaymentStatus.EXPIRED);
        }
        if (!stale.isEmpty()) {
            paymentOrderRepository.saveAll(stale);
        }

        List<PaymentOrder> activePending = paymentOrderRepository.findActivePendingForUpdate(lockedUser, now);
        if (!activePending.isEmpty()) {
            PaymentOrder existing = activePending.get(0);
            java.util.Map<String, Object> errorData = new java.util.HashMap<>();
            errorData.put("paymentId", existing.getPaymentId());
            errorData.put("paymentProvider", existing.getPaymentProvider());
            if (existing.getPaymentUrl() != null) {
                errorData.put("paymentUrl", existing.getPaymentUrl());
            }
            throw new PaymentException(HttpStatus.CONFLICT, "PAYMENT_ALREADY_PENDING",
                    "You already have a pending payment. Please complete it before creating a new one.",
                    errorData);
        }

        List<PaymentOrder> unresolvedReview = paymentOrderRepository.findUnresolvedReviewForUser(lockedUser);
        if (!unresolvedReview.isEmpty()) {
            throw new PaymentException(HttpStatus.CONFLICT, "PAYMENT_REQUIRES_MANUAL_REVIEW",
                    "A previous payment requires manual review before you can continue.");
        }

        UserTier targetTier = planService.getTargetTier(planCode);
        UserTier currentEffectiveTier = tierPolicyService.getEffectiveTier(lockedUser);
        if (currentEffectiveTier == UserTier.ULTRA && targetTier == UserTier.PREMIUM) {
            throw new PaymentException(HttpStatus.CONFLICT, "DOWNGRADE_NOT_SUPPORTED",
                    "Downgrade from ULTRA to PREMIUM is not supported.");
        }

        PlanService.PaymentPlan plan = planService.getPlan(planCode);

        PaymentOrder order = PaymentOrder.builder()
                .user(lockedUser)
                .planCode(plan.getPlanCode())
                .targetTier(plan.getTargetTier().name())
                .durationMonths(plan.getDurationMonths())
                .amount(plan.getPrice())
                .currency(PlanService.CURRENCY)
                .status(PaymentStatus.PENDING)
                .paymentMethod(paymentMethod)
                .paymentProvider(paymentProvider)
                .vnpBankCode(bankCode)
                .createdAt(now)
                .expiredAt(now.plusMinutes(PENDING_EXPIRY_MINUTES))
                .build();

        return paymentOrderRepository.save(order);
    }

    // =========================================================================
    // Shared finalize — used by mock success AND VNPay IPN success
    // =========================================================================

    /**
     * Applies a successful payment to the user's tier/expiry and marks the
     * order SUCCESS. Must be called with the order already locked
     * (PESSIMISTIC_WRITE) and confirmed PENDING by the caller.
     *
     * @param paidAt the actual moment the payment was confirmed as paid —
     *               for Mock this is "now"; for VNPay this MUST be the
     *               vnp_PayDate converted to UTC, never the time the backend
     *               happened to process the IPN callback.
     *
     * Locks the user row internally before computing expiry, so concurrent
     * successful payments for the same user are serialized (no lost update).
     *
     * Enforces: never downgrade ULTRA -> PREMIUM. If the caller detects this
     * case ahead of time it should route to REVIEW_REQUIRED instead of
     * calling this method — this method assumes the downgrade check has
     * already passed, but re-validates as a safety net.
     */
    @Transactional
    public User finalizeSuccessfulPayment(PaymentOrder order, UserTier targetTier, LocalDateTime paidAt) {
        User freshUser = userRepository.findByIdForUpdate(order.getUser().getUserId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        UserTier currentEffectiveTier = tierPolicyService.getEffectiveTier(freshUser);

        if (currentEffectiveTier == UserTier.ULTRA && targetTier == UserTier.PREMIUM) {
            // Safety net: should have been routed to REVIEW_REQUIRED by the caller.
            throw new PaymentException(HttpStatus.CONFLICT, "DOWNGRADE_NOT_SUPPORTED",
                    "Downgrade from ULTRA to PREMIUM is not supported.");
        }

        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        LocalDateTime newExpiry;

        if (currentEffectiveTier == targetTier) {
            LocalDateTime currentExpiry = freshUser.getTierExpiresAt();
            LocalDateTime base = (currentExpiry != null && currentExpiry.isAfter(now)) ? currentExpiry : now;
            newExpiry = base.plusMonths(1);
        } else {
            newExpiry = now.plusMonths(1);
        }

        order.setStatus(PaymentStatus.SUCCESS);
        order.setPaidAt(paidAt);
        paymentOrderRepository.save(order);

        freshUser.setTier(targetTier);
        freshUser.setTierExpiresAt(newExpiry);
        return userRepository.save(freshUser);
    }

    private UserTier resolveTargetTier(PaymentOrder order) {
        if (order.getTargetTier() != null) {
            return UserTier.valueOf(order.getTargetTier());
        }
        return planService.getTargetTier(order.getPlanCode());
    }

    // =========================================================================
    // Detail / history
    // =========================================================================

    @Transactional
    public PaymentResponse getPaymentDetail(User user, Long paymentId) {
        PaymentOrder order = paymentOrderRepository.findByPaymentIdAndUser(paymentId, user)
                .orElseThrow(() -> new PaymentException(HttpStatus.NOT_FOUND, "PAYMENT_NOT_FOUND", "Payment not found"));

        maybeExpire(order);

        String tier = null;
        if (order.getUser() != null) {
            tier = tierPolicyService.getEffectiveTier(order.getUser()).name();
        }
        return toResponse(order, tier);
    }

    public List<PaymentResponse> getMyPayments(User user) {
        List<PaymentOrder> orders = paymentOrderRepository.findByUserOrderByCreatedAtDesc(user);
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        List<PaymentOrder> toSave = orders.stream()
                .filter(o -> PaymentStatus.PENDING.equals(o.getStatus())
                        && o.getExpiredAt() != null && !o.getExpiredAt().isAfter(now))
                .peek(o -> o.setStatus(PaymentStatus.EXPIRED))
                .collect(Collectors.toList());
        if (!toSave.isEmpty()) {
            paymentOrderRepository.saveAll(toSave);
        }
        return orders.stream().map(order -> toResponse(order, null)).collect(Collectors.toList());
    }

    private void maybeExpire(PaymentOrder order) {
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        if (PaymentStatus.PENDING.equals(order.getStatus())
                && order.getExpiredAt() != null && !order.getExpiredAt().isAfter(now)) {
            order.setStatus(PaymentStatus.EXPIRED);
            paymentOrderRepository.save(order);
        }
    }

    private PaymentOrder lockOwnedOrderOrThrow(User user, Long paymentId) {
        return paymentOrderRepository.findByPaymentIdAndUserForUpdate(paymentId, user)
                .orElseThrow(() -> new PaymentException(HttpStatus.NOT_FOUND, "PAYMENT_NOT_FOUND", "Payment not found"));
    }

    // =========================================================================
    // Response mapping
    // =========================================================================

    private boolean shouldExposeUrl(PaymentOrder order) {
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        return PaymentStatus.PENDING.equals(order.getStatus())
                && order.getExpiredAt() != null
                && order.getExpiredAt().isAfter(now);
    }

    private String planNameForCode(String planCode) {
        if (PlanCode.ULTRA_1_MONTH.equalsIgnoreCase(planCode)) return "Ultra";
        if (PlanCode.PREMIUM_1_MONTH.equalsIgnoreCase(planCode)) return "Premium";
        if (PlanCode.FREE.equalsIgnoreCase(planCode)) return "Free";
        return "Unknown";
    }

    private String billingLabelForCode(String planCode) {
        if (PlanCode.PREMIUM_1_MONTH.equalsIgnoreCase(planCode) || PlanCode.ULTRA_1_MONTH.equalsIgnoreCase(planCode)) {
            return PlanService.PREMIUM_BILLING_LABEL;
        }
        if (PlanCode.FREE.equalsIgnoreCase(planCode)) {
            return PlanService.FREE_BILLING_LABEL;
        }
        return "Unknown";
    }

    private PaymentResponse toResponse(PaymentOrder order, String tier) {
        return PaymentResponse.builder()
                .paymentId(order.getPaymentId())
                .planCode(order.getPlanCode())
                .planName(planNameForCode(order.getPlanCode()))
                .targetTier(order.getTargetTier())
                .amount(order.getAmount())
                .currency(order.getCurrency())
                .billingLabel(billingLabelForCode(order.getPlanCode()))
                .status(order.getStatus())
                .paymentMethod(order.getPaymentMethod())
                .paymentProvider(order.getPaymentProvider())
                .paymentUrl(shouldExposeUrl(order) ? order.getPaymentUrl() : null)
                .tier(tier)
                .createdAt(order.getCreatedAt())
                .paidAt(order.getPaidAt())
                .expiredAt(order.getExpiredAt())
                .reviewReason(order.getReviewReason())
                .reviewRequiredAt(order.getReviewRequiredAt())
                .build();
    }

    public PaymentResponse mapToResponse(PaymentOrder order) {
        String tier = null;
        if (order.getUser() != null) {
            tier = tierPolicyService.getEffectiveTier(order.getUser()).name();
        }
        return toResponse(order, tier);
    }
}
