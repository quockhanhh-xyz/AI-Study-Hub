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
import com.demo.ai_study_hub.dto.UserTier;
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
        UserTier effectiveTier = tierPolicyService.getEffectiveTier(user);
        if (effectiveTier == UserTier.PREMIUM || effectiveTier == UserTier.ULTRA) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "User is already Premium.");
        }

        PaymentOrder order = PaymentOrder.builder()
                .user(user)
                .planCode(PlanCode.PREMIUM)
                .amount(planService.getPrice(PlanCode.PREMIUM))
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

        User freshUser = userRepository.findById(user.getUserId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        UserTier freshEffectiveTier = tierPolicyService.getEffectiveTier(freshUser);
        if (freshEffectiveTier == UserTier.PREMIUM || freshEffectiveTier == UserTier.ULTRA) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "User is already Premium.");
        }

        order.setStatus(PaymentStatus.SUCCESS);
        order.setPaidAt(LocalDateTime.now());
        paymentOrderRepository.save(order);

        freshUser.setTier(UserTier.PREMIUM);
        freshUser.setTierExpiresAt(LocalDateTime.now().plusDays(30));
        userRepository.save(freshUser);

        return toResponse(order, "PREMIUM");
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

    private PaymentResponse toResponse(PaymentOrder order, String tier) {
        return PaymentResponse.builder()
                .paymentId(order.getPaymentId())
                .planCode(order.getPlanCode())
                .planName("Premium")
                .amount(order.getAmount())
                .currency(order.getCurrency())
                .billingLabel(PlanService.PREMIUM_BILLING_LABEL)
                .status(order.getStatus())
                .paymentMethod(order.getPaymentMethod())
                .tier(tier)
                .createdAt(order.getCreatedAt())
                .paidAt(order.getPaidAt())
                .build();
    }
}
