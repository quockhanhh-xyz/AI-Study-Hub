package com.demo.ai_study_hub;

import com.demo.ai_study_hub.config.AiProperties;
import com.demo.ai_study_hub.dto.PaymentStatus;
import com.demo.ai_study_hub.dto.PaymentMethod;
import com.demo.ai_study_hub.dto.PlanCode;
import com.demo.ai_study_hub.enums.UserTier;
import com.demo.ai_study_hub.dto.PaymentResponse;
import com.demo.ai_study_hub.dto.PlanResponse;
import com.demo.ai_study_hub.entity.PaymentOrder;
import com.demo.ai_study_hub.entity.User;
import com.demo.ai_study_hub.repository.PaymentOrderRepository;
import com.demo.ai_study_hub.repository.UserRepository;
import com.demo.ai_study_hub.service.PaymentService;
import com.demo.ai_study_hub.service.PlanService;
import com.demo.ai_study_hub.service.TierPolicyService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaymentServiceTest {

    @Mock private PaymentOrderRepository paymentOrderRepository;
    @Mock private UserRepository userRepository;
    @Mock private PlanService planService;
    @Mock private TierPolicyService tierPolicyService;
    @Mock private com.demo.ai_study_hub.config.PaymentProperties paymentProperties;

    @InjectMocks
    private PaymentService paymentService;

    private User freeUser;
    private User premiumUser;
    private User ultraUser;


    private com.demo.ai_study_hub.service.PlanService.PaymentPlan buildPaymentPlan(
            String planCode, UserTier targetTier, long price) {
        return com.demo.ai_study_hub.service.PlanService.PaymentPlan.builder()
                .planCode(planCode)
                .planName(targetTier.name())
                .targetTier(targetTier)
                .price(price)
                .durationMonths(1)
                .billingLabel("1 month")
                .purchasable(true)
                .build();
    }

    @BeforeEach
    void setUp() {
        freeUser = new User();
        freeUser.setUserId(1);
        freeUser.setEmail("free@test.com");
        freeUser.setTier(UserTier.FREE);

        premiumUser = new User();
        premiumUser.setUserId(2);
        premiumUser.setEmail("premium@test.com");
        premiumUser.setTier(UserTier.PREMIUM);
        premiumUser.setTierExpiresAt(LocalDateTime.now(ZoneOffset.UTC).plusDays(10));

        ultraUser = new User();
        ultraUser.setUserId(3);
        ultraUser.setEmail("ultra@test.com");
        ultraUser.setTier(UserTier.ULTRA);
        ultraUser.setTierExpiresAt(LocalDateTime.now(ZoneOffset.UTC).plusDays(10));

        // Default: effective tier mirrors the raw stored tier unless a test
        // overrides it explicitly (e.g. an expired premium/ultra user).
        lenient().when(tierPolicyService.getEffectiveTier(any(User.class))).thenAnswer(invocation -> {
            User u = invocation.getArgument(0);
            return u.getTier();
        });
        lenient().when(paymentProperties.isMockEnabled()).thenReturn(true);

        // createOrderCommon() locks the user row via findByIdForUpdate before
        // checking pending/review state — stub it for the standard fixtures.
        lenient().when(userRepository.findByIdForUpdate(freeUser.getUserId())).thenReturn(Optional.of(freeUser));
        lenient().when(userRepository.findByIdForUpdate(premiumUser.getUserId())).thenReturn(Optional.of(premiumUser));
        lenient().when(userRepository.findByIdForUpdate(ultraUser.getUserId())).thenReturn(Optional.of(ultraUser));
    }

    // =========================================================================
    // 1. PlanService - GET plans returns FREE, PREMIUM, ULTRA
    // =========================================================================

    @Test
    void getPlans_ShouldReturnFreePremiumAndUltraPlans() {
        AiProperties props = new AiProperties();
        props.setProvider("gemini");
        PlanService realPlanService = new PlanService(new TierPolicyService(props));
        List<PlanResponse> plans = realPlanService.getAllPlans();

        assertEquals(3, plans.size());
        PlanResponse free = plans.stream().filter(p -> PlanCode.FREE.equals(p.getPlanCode())).findFirst().orElseThrow();
        PlanResponse premium = plans.stream().filter(p -> PlanCode.PREMIUM_1_MONTH.equals(p.getPlanCode())).findFirst().orElseThrow();
        PlanResponse ultra = plans.stream().filter(p -> PlanCode.ULTRA_1_MONTH.equals(p.getPlanCode())).findFirst().orElseThrow();

        assertEquals(0, free.getPrice());
        assertEquals("Free", free.getBillingLabel());
        assertEquals("FREE", free.getTargetTier());
        assertEquals("VND", free.getCurrency());

        assertEquals(199000, premium.getPrice());
        assertEquals("PREMIUM", premium.getTargetTier());
        assertEquals(1, premium.getDurationMonths());
        assertEquals("VND", premium.getCurrency());

        assertEquals(399000, ultra.getPrice());
        assertEquals("ULTRA", ultra.getTargetTier());
        assertEquals(1, ultra.getDurationMonths());
        assertEquals("VND", ultra.getCurrency());
    }

    @Test
    void getPlan_WhenInvalidCode_ShouldThrow400NotReturnZeroPrice() {
        PlanService realPlanService = new PlanService(new TierPolicyService(new AiProperties()));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                realPlanService.getPrice("NOT_A_REAL_PLAN"));

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
    }

    @Test
    void isPurchasablePlanCode_ShouldOnlyAllowPremiumAndUltra() {
        PlanService realPlanService = new PlanService(new TierPolicyService(new AiProperties()));

        assertFalse(realPlanService.isPurchasablePlanCode(PlanCode.FREE));
        assertTrue(realPlanService.isPurchasablePlanCode(PlanCode.PREMIUM_1_MONTH));
        assertTrue(realPlanService.isPurchasablePlanCode(PlanCode.ULTRA_1_MONTH));
    }

    // =========================================================================
    // 2. Create Payment
    // =========================================================================

    @Test
    void createMockPayment_WhenFreeUserPremiumPlan_ShouldCreatePendingOrder() {
        when(planService.isValidPlanCode(PlanCode.PREMIUM_1_MONTH)).thenReturn(true);
        when(planService.isPurchasablePlanCode(PlanCode.PREMIUM_1_MONTH)).thenReturn(true);
        when(planService.getPlan(PlanCode.PREMIUM_1_MONTH)).thenReturn(buildPaymentPlan(PlanCode.PREMIUM_1_MONTH, UserTier.PREMIUM, 199000L));
        when(paymentOrderRepository.save(any(PaymentOrder.class))).thenAnswer(inv -> {
            PaymentOrder order = inv.getArgument(0);
            order.setPaymentId(1L);
            return order;
        });

        PaymentResponse response = paymentService.createMockPayment(freeUser, PlanCode.PREMIUM_1_MONTH);

        assertNotNull(response);
        assertEquals(PlanCode.PREMIUM_1_MONTH, response.getPlanCode());
        assertEquals(199000L, response.getAmount());
        assertEquals("VND", response.getCurrency());
        assertEquals(PaymentStatus.PENDING, response.getStatus());
        assertEquals(PaymentMethod.MOCK, response.getPaymentMethod());
        verify(paymentOrderRepository, times(1)).save(any(PaymentOrder.class));
    }

    @Test
    void createMockPayment_WhenFreeUserUltraPlan_ShouldCreatePendingOrder() {
        when(planService.isValidPlanCode(PlanCode.ULTRA_1_MONTH)).thenReturn(true);
        when(planService.isPurchasablePlanCode(PlanCode.ULTRA_1_MONTH)).thenReturn(true);
        when(planService.getPlan(PlanCode.ULTRA_1_MONTH)).thenReturn(buildPaymentPlan(PlanCode.ULTRA_1_MONTH, UserTier.ULTRA, 399000L));
        when(paymentOrderRepository.save(any(PaymentOrder.class))).thenAnswer(inv -> {
            PaymentOrder order = inv.getArgument(0);
            order.setPaymentId(2L);
            return order;
        });

        PaymentResponse response = paymentService.createMockPayment(freeUser, PlanCode.ULTRA_1_MONTH);

        assertNotNull(response);
        assertEquals(PlanCode.ULTRA_1_MONTH, response.getPlanCode());
        assertEquals(399000L, response.getAmount());
        assertEquals(PaymentStatus.PENDING, response.getStatus());
        verify(paymentOrderRepository, times(1)).save(any(PaymentOrder.class));
    }

    @Test
    void createMockPayment_WhenPlanCodeIsFree_ShouldThrow400() {
        when(planService.isValidPlanCode(PlanCode.FREE)).thenReturn(true);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                paymentService.createMockPayment(freeUser, PlanCode.FREE));

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        verify(paymentOrderRepository, never()).save(any());
    }

    @Test
    void createMockPayment_WhenInvalidPlanCode_ShouldThrow400() {
        when(planService.isValidPlanCode("INVALID_CODE")).thenReturn(false);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                paymentService.createMockPayment(freeUser, "INVALID_CODE"));

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        verify(paymentOrderRepository, never()).save(any());
    }

    @Test
    void createMockPayment_WhenNullPlanCode_ShouldThrow400() {
        when(planService.isValidPlanCode(null)).thenReturn(false);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                paymentService.createMockPayment(freeUser, null));

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
    }

    @Test
    void createMockPayment_WhenPremiumUserRenewsPremium_ShouldSucceed() {
        // PREMIUM -> PREMIUM is a renewal under the new rules, no longer blocked.
        when(planService.isValidPlanCode(PlanCode.PREMIUM_1_MONTH)).thenReturn(true);
        when(planService.isPurchasablePlanCode(PlanCode.PREMIUM_1_MONTH)).thenReturn(true);
        when(planService.getPlan(PlanCode.PREMIUM_1_MONTH)).thenReturn(buildPaymentPlan(PlanCode.PREMIUM_1_MONTH, UserTier.PREMIUM, 199000L));
        when(paymentOrderRepository.save(any(PaymentOrder.class))).thenAnswer(inv -> {
            PaymentOrder order = inv.getArgument(0);
            order.setPaymentId(5L);
            return order;
        });

        PaymentResponse response = paymentService.createMockPayment(premiumUser, PlanCode.PREMIUM_1_MONTH);

        assertNotNull(response);
        assertEquals(PaymentStatus.PENDING, response.getStatus());
        verify(paymentOrderRepository, times(1)).save(any(PaymentOrder.class));
    }

    @Test
    void createMockPayment_WhenPremiumUserBuysUltra_ShouldSucceedAsUpgrade() {
        when(planService.isValidPlanCode(PlanCode.ULTRA_1_MONTH)).thenReturn(true);
        when(planService.isPurchasablePlanCode(PlanCode.ULTRA_1_MONTH)).thenReturn(true);
        when(planService.getPlan(PlanCode.ULTRA_1_MONTH)).thenReturn(buildPaymentPlan(PlanCode.ULTRA_1_MONTH, UserTier.ULTRA, 399000L));
        when(paymentOrderRepository.save(any(PaymentOrder.class))).thenAnswer(inv -> {
            PaymentOrder order = inv.getArgument(0);
            order.setPaymentId(6L);
            return order;
        });

        PaymentResponse response = paymentService.createMockPayment(premiumUser, PlanCode.ULTRA_1_MONTH);

        assertNotNull(response);
        assertEquals(PaymentStatus.PENDING, response.getStatus());
        verify(paymentOrderRepository, times(1)).save(any(PaymentOrder.class));
    }

    @Test
    void createMockPayment_WhenUltraUserBuysPremium_ShouldThrow409Downgrade() {
        when(planService.isValidPlanCode(PlanCode.PREMIUM_1_MONTH)).thenReturn(true);
        when(planService.isPurchasablePlanCode(PlanCode.PREMIUM_1_MONTH)).thenReturn(true);
        when(planService.getTargetTier(PlanCode.PREMIUM_1_MONTH)).thenReturn(UserTier.PREMIUM);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                paymentService.createMockPayment(ultraUser, PlanCode.PREMIUM_1_MONTH));

        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
        assertTrue(ex.getReason().contains("Downgrade from ULTRA to PREMIUM"));
        verify(paymentOrderRepository, never()).save(any());
    }

    @Test
    void createMockPayment_WhenPendingPaymentExists_ShouldThrow409PaymentAlreadyPending() {
        PaymentOrder pendingOrder = PaymentOrder.builder()
                .paymentId(101L)
                .paymentProvider(com.demo.ai_study_hub.dto.PaymentProvider.MOCK)
                .paymentUrl(null)
                .status(PaymentStatus.PENDING)
                .build();
        when(planService.isValidPlanCode(PlanCode.PREMIUM_1_MONTH)).thenReturn(true);
        when(planService.isPurchasablePlanCode(PlanCode.PREMIUM_1_MONTH)).thenReturn(true);
        when(paymentOrderRepository.findActivePendingForUpdate(eq(freeUser), any(LocalDateTime.class)))
                .thenReturn(List.of(pendingOrder));

        com.demo.ai_study_hub.exception.PaymentException ex = assertThrows(com.demo.ai_study_hub.exception.PaymentException.class, () ->
                paymentService.createMockPayment(freeUser, PlanCode.PREMIUM_1_MONTH));

        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
        assertEquals("PAYMENT_ALREADY_PENDING", ex.getCode());
        java.util.Map<?, ?> errorData = (java.util.Map<?, ?>) ex.getData();
        assertNotNull(errorData);
        assertEquals(101L, errorData.get("paymentId"));
        assertEquals(com.demo.ai_study_hub.dto.PaymentProvider.MOCK, errorData.get("paymentProvider"));
        assertFalse(errorData.containsKey("paymentUrl"));
    }

    @Test
    void createMockPayment_WhenUltraUserRenewsUltra_ShouldSucceed() {
        when(planService.isValidPlanCode(PlanCode.ULTRA_1_MONTH)).thenReturn(true);
        when(planService.isPurchasablePlanCode(PlanCode.ULTRA_1_MONTH)).thenReturn(true);
        when(planService.getPlan(PlanCode.ULTRA_1_MONTH)).thenReturn(buildPaymentPlan(PlanCode.ULTRA_1_MONTH, UserTier.ULTRA, 399000L));
        when(paymentOrderRepository.save(any(PaymentOrder.class))).thenAnswer(inv -> {
            PaymentOrder order = inv.getArgument(0);
            order.setPaymentId(7L);
            return order;
        });

        PaymentResponse response = paymentService.createMockPayment(ultraUser, PlanCode.ULTRA_1_MONTH);

        assertNotNull(response);
        assertEquals(PaymentStatus.PENDING, response.getStatus());
    }

    @Test
    void createMockPayment_WhenUserExpiredPremium_ShouldAllowUpgrade() {
        // user is premium in database but effective tier has expired to FREE
        User expiredUser = new User();
        expiredUser.setUserId(4);
        expiredUser.setEmail("expired@test.com");
        expiredUser.setTier(UserTier.PREMIUM);
        expiredUser.setTierExpiresAt(LocalDateTime.now(ZoneOffset.UTC).minusDays(1));

        when(planService.isValidPlanCode(PlanCode.PREMIUM_1_MONTH)).thenReturn(true);
        when(planService.isPurchasablePlanCode(PlanCode.PREMIUM_1_MONTH)).thenReturn(true);
        when(planService.getPlan(PlanCode.PREMIUM_1_MONTH)).thenReturn(buildPaymentPlan(PlanCode.PREMIUM_1_MONTH, UserTier.PREMIUM, 199000L));
        when(userRepository.findByIdForUpdate(expiredUser.getUserId())).thenReturn(Optional.of(expiredUser));
        when(tierPolicyService.getEffectiveTier(expiredUser)).thenReturn(UserTier.FREE);
        when(paymentOrderRepository.save(any(PaymentOrder.class))).thenAnswer(inv -> {
            PaymentOrder order = inv.getArgument(0);
            order.setPaymentId(99L);
            return order;
        });

        PaymentResponse response = paymentService.createMockPayment(expiredUser, PlanCode.PREMIUM_1_MONTH);

        assertNotNull(response);
        assertEquals(PlanCode.PREMIUM_1_MONTH, response.getPlanCode());
        assertEquals(199000L, response.getAmount());
        assertEquals(PaymentStatus.PENDING, response.getStatus());
        verify(paymentOrderRepository, times(1)).save(any(PaymentOrder.class));
    }

    // =========================================================================
    // 3. Confirm Success
    // =========================================================================

    @Test
    void markPaymentSuccess_WhenFreeUserBuysPremium_ShouldUpgradeAndSetExpiryOneMonthFromNow() {
        PaymentOrder order = PaymentOrder.builder()
                .paymentId(1L).user(freeUser).planCode(PlanCode.PREMIUM_1_MONTH)
                .amount(199000L).currency("VND")
                .status(PaymentStatus.PENDING).paymentMethod(PaymentMethod.MOCK).paymentProvider(com.demo.ai_study_hub.dto.PaymentProvider.MOCK).build();

        when(paymentOrderRepository.findByPaymentIdAndUserForUpdate(1L, freeUser))
                .thenReturn(Optional.of(order));
        when(userRepository.findByIdForUpdate(freeUser.getUserId())).thenReturn(Optional.of(freeUser));
        when(planService.getTargetTier(PlanCode.PREMIUM_1_MONTH)).thenReturn(UserTier.PREMIUM);
        when(paymentOrderRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        LocalDateTime before = LocalDateTime.now(ZoneOffset.UTC);
        PaymentResponse response = paymentService.markPaymentSuccess(freeUser, 1L);
        LocalDateTime after = LocalDateTime.now(ZoneOffset.UTC);

        assertEquals(PaymentStatus.SUCCESS, response.getStatus());
        assertEquals("PREMIUM", response.getTier());
        assertNotNull(response.getPaidAt());
        assertEquals(UserTier.PREMIUM, freeUser.getTier());
        assertNotNull(freeUser.getTierExpiresAt());
        assertTrue(freeUser.getTierExpiresAt().isAfter(before.plusMonths(1).minusMinutes(1)));
        assertTrue(freeUser.getTierExpiresAt().isBefore(after.plusMonths(1).plusMinutes(1)));
        verify(userRepository, times(1)).save(freeUser);
    }

    @Test
    void markPaymentSuccess_WhenFreeUserBuysUltra_ShouldUpgradeToUltra() {
        PaymentOrder order = PaymentOrder.builder()
                .paymentId(2L).user(freeUser).planCode(PlanCode.ULTRA_1_MONTH)
                .amount(399000L).currency("VND")
                .status(PaymentStatus.PENDING).paymentMethod(PaymentMethod.MOCK).paymentProvider(com.demo.ai_study_hub.dto.PaymentProvider.MOCK).build();

        when(paymentOrderRepository.findByPaymentIdAndUserForUpdate(2L, freeUser))
                .thenReturn(Optional.of(order));
        when(userRepository.findByIdForUpdate(freeUser.getUserId())).thenReturn(Optional.of(freeUser));
        when(planService.getTargetTier(PlanCode.ULTRA_1_MONTH)).thenReturn(UserTier.ULTRA);
        when(paymentOrderRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        PaymentResponse response = paymentService.markPaymentSuccess(freeUser, 2L);

        assertEquals("ULTRA", response.getTier());
        assertEquals(UserTier.ULTRA, freeUser.getTier());
    }

    @Test
    void markPaymentSuccess_WhenPremiumRenewsPremium_ShouldAddOneMonthToExistingExpiry() {
        LocalDateTime existingExpiry = LocalDateTime.now(ZoneOffset.UTC).plusDays(10);
        premiumUser.setTierExpiresAt(existingExpiry);

        PaymentOrder order = PaymentOrder.builder()
                .paymentId(3L).user(premiumUser).planCode(PlanCode.PREMIUM_1_MONTH)
                .amount(199000L).currency("VND")
                .status(PaymentStatus.PENDING).paymentMethod(PaymentMethod.MOCK).paymentProvider(com.demo.ai_study_hub.dto.PaymentProvider.MOCK).build();

        when(paymentOrderRepository.findByPaymentIdAndUserForUpdate(3L, premiumUser))
                .thenReturn(Optional.of(order));
        when(userRepository.findByIdForUpdate(premiumUser.getUserId())).thenReturn(Optional.of(premiumUser));
        when(planService.getTargetTier(PlanCode.PREMIUM_1_MONTH)).thenReturn(UserTier.PREMIUM);
        when(paymentOrderRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        paymentService.markPaymentSuccess(premiumUser, 3L);

        assertEquals(UserTier.PREMIUM, premiumUser.getTier());
        assertEquals(existingExpiry.plusMonths(1), premiumUser.getTierExpiresAt());
    }

    @Test
    void markPaymentSuccess_WhenUltraRenewsUltra_ShouldAddOneMonthToExistingExpiry() {
        LocalDateTime existingExpiry = LocalDateTime.now(ZoneOffset.UTC).plusDays(5);
        ultraUser.setTierExpiresAt(existingExpiry);

        PaymentOrder order = PaymentOrder.builder()
                .paymentId(4L).user(ultraUser).planCode(PlanCode.ULTRA_1_MONTH)
                .amount(399000L).currency("VND")
                .status(PaymentStatus.PENDING).paymentMethod(PaymentMethod.MOCK).paymentProvider(com.demo.ai_study_hub.dto.PaymentProvider.MOCK).build();

        when(paymentOrderRepository.findByPaymentIdAndUserForUpdate(4L, ultraUser))
                .thenReturn(Optional.of(order));
        when(userRepository.findByIdForUpdate(ultraUser.getUserId())).thenReturn(Optional.of(ultraUser));
        when(planService.getTargetTier(PlanCode.ULTRA_1_MONTH)).thenReturn(UserTier.ULTRA);
        when(paymentOrderRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        paymentService.markPaymentSuccess(ultraUser, 4L);

        assertEquals(UserTier.ULTRA, ultraUser.getTier());
        assertEquals(existingExpiry.plusMonths(1), ultraUser.getTierExpiresAt());
    }

    @Test
    void markPaymentSuccess_WhenPremiumUpgradesToUltra_ShouldResetExpiryToOneMonthFromNow() {
        // Premium still has 20 days left — this remaining time must NOT be
        // carried over into Ultra (would be free Ultra time).
        LocalDateTime remainingPremiumExpiry = LocalDateTime.now(ZoneOffset.UTC).plusDays(20);
        premiumUser.setTierExpiresAt(remainingPremiumExpiry);

        PaymentOrder order = PaymentOrder.builder()
                .paymentId(8L).user(premiumUser).planCode(PlanCode.ULTRA_1_MONTH)
                .amount(399000L).currency("VND")
                .status(PaymentStatus.PENDING).paymentMethod(PaymentMethod.MOCK).paymentProvider(com.demo.ai_study_hub.dto.PaymentProvider.MOCK).build();

        when(paymentOrderRepository.findByPaymentIdAndUserForUpdate(8L, premiumUser))
                .thenReturn(Optional.of(order));
        when(userRepository.findByIdForUpdate(premiumUser.getUserId())).thenReturn(Optional.of(premiumUser));
        when(planService.getTargetTier(PlanCode.ULTRA_1_MONTH)).thenReturn(UserTier.ULTRA);
        when(paymentOrderRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        LocalDateTime before = LocalDateTime.now(ZoneOffset.UTC);
        paymentService.markPaymentSuccess(premiumUser, 8L);
        LocalDateTime after = LocalDateTime.now(ZoneOffset.UTC);

        assertEquals(UserTier.ULTRA, premiumUser.getTier());
        // New expiry must be ~now + 1 month, NOT remainingPremiumExpiry + 1 month
        assertTrue(premiumUser.getTierExpiresAt().isAfter(before.plusMonths(1).minusMinutes(1)));
        assertTrue(premiumUser.getTierExpiresAt().isBefore(after.plusMonths(1).plusMinutes(1)));
        assertTrue(premiumUser.getTierExpiresAt().isBefore(remainingPremiumExpiry.plusMonths(1).minusDays(1)));
    }

    @Test
    void markPaymentSuccess_WhenUltraOrderButUserAlreadyDowngradedIntentToPremium_ShouldThrow409() {
        // Order was created for PREMIUM while user is (still) effectively ULTRA.
        PaymentOrder order = PaymentOrder.builder()
                .paymentId(9L).user(ultraUser).planCode(PlanCode.PREMIUM_1_MONTH)
                .amount(199000L).currency("VND")
                .status(PaymentStatus.PENDING).paymentMethod(PaymentMethod.MOCK).paymentProvider(com.demo.ai_study_hub.dto.PaymentProvider.MOCK).build();

        when(paymentOrderRepository.findByPaymentIdAndUserForUpdate(9L, ultraUser))
                .thenReturn(Optional.of(order));
        when(userRepository.findByIdForUpdate(ultraUser.getUserId())).thenReturn(Optional.of(ultraUser));
        when(planService.getTargetTier(PlanCode.PREMIUM_1_MONTH)).thenReturn(UserTier.PREMIUM);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                paymentService.markPaymentSuccess(ultraUser, 9L));

        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
        assertTrue(ex.getReason().contains("Downgrade from ULTRA to PREMIUM"));
        verify(userRepository, never()).save(any());
    }

    @Test
    void markPaymentSuccess_WhenPaymentNotFound_ShouldThrow404() {
        when(paymentOrderRepository.findByPaymentIdAndUserForUpdate(99L, freeUser))
                .thenReturn(Optional.empty());

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                paymentService.markPaymentSuccess(freeUser, 99L));

        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
    }

    @Test
    void markPaymentSuccess_WhenPaymentAlreadySuccess_ShouldThrow409() {
        PaymentOrder order = PaymentOrder.builder()
                .paymentId(1L).user(premiumUser).planCode(PlanCode.PREMIUM_1_MONTH)
                .status(PaymentStatus.SUCCESS).paymentProvider(com.demo.ai_study_hub.dto.PaymentProvider.MOCK).build();

        when(paymentOrderRepository.findByPaymentIdAndUserForUpdate(1L, premiumUser))
                .thenReturn(Optional.of(order));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                paymentService.markPaymentSuccess(premiumUser, 1L));

        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
        verify(userRepository, never()).save(any());
    }

    @Test
    void markPaymentSuccess_WhenPaymentAlreadyFailed_ShouldThrow409() {
        PaymentOrder order = PaymentOrder.builder()
                .paymentId(1L).user(freeUser).planCode(PlanCode.PREMIUM_1_MONTH)
                .status(PaymentStatus.FAILED).paymentProvider(com.demo.ai_study_hub.dto.PaymentProvider.MOCK).build();

        when(paymentOrderRepository.findByPaymentIdAndUserForUpdate(1L, freeUser))
                .thenReturn(Optional.of(order));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                paymentService.markPaymentSuccess(freeUser, 1L));

        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
    }

    @Test
    void markPaymentSuccess_WhenPaymentAlreadyCancelled_ShouldThrow409() {
        PaymentOrder order = PaymentOrder.builder()
                .paymentId(1L).user(freeUser).planCode(PlanCode.PREMIUM_1_MONTH)
                .status(PaymentStatus.CANCELLED).paymentProvider(com.demo.ai_study_hub.dto.PaymentProvider.MOCK).build();

        when(paymentOrderRepository.findByPaymentIdAndUserForUpdate(1L, freeUser))
                .thenReturn(Optional.of(order));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                paymentService.markPaymentSuccess(freeUser, 1L));

        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
    }

    // =========================================================================
    // 4. Confirm Fail
    // =========================================================================

    @Test
    void markPaymentFailed_WhenPendingOrder_ShouldSetFailedAndNotChangeTier() {
        PaymentOrder order = PaymentOrder.builder()
                .paymentId(1L).user(freeUser).planCode(PlanCode.PREMIUM_1_MONTH)
                .amount(199000L).currency("VND")
                .status(PaymentStatus.PENDING).paymentMethod(PaymentMethod.MOCK).paymentProvider(com.demo.ai_study_hub.dto.PaymentProvider.MOCK).build();

        when(paymentOrderRepository.findByPaymentIdAndUserForUpdate(1L, freeUser))
                .thenReturn(Optional.of(order));
        when(userRepository.findById(freeUser.getUserId())).thenReturn(Optional.of(freeUser));
        when(paymentOrderRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        PaymentResponse response = paymentService.markPaymentFailed(freeUser, 1L);

        assertEquals(PaymentStatus.FAILED, response.getStatus());
        assertEquals("FREE", response.getTier());
        assertNull(response.getPaidAt());
        assertEquals(UserTier.FREE, freeUser.getTier());
        verify(userRepository, never()).save(any());
    }

    @Test
    void markPaymentFailed_WhenPaymentNotFound_ShouldThrow404() {
        when(paymentOrderRepository.findByPaymentIdAndUserForUpdate(99L, freeUser))
                .thenReturn(Optional.empty());

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                paymentService.markPaymentFailed(freeUser, 99L));

        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
    }

    @Test
    void markPaymentFailed_WhenPaymentNotPending_ShouldThrow409() {
        PaymentOrder order = PaymentOrder.builder()
                .paymentId(1L).user(freeUser)
                .status(PaymentStatus.SUCCESS).paymentProvider(com.demo.ai_study_hub.dto.PaymentProvider.MOCK).build();

        when(paymentOrderRepository.findByPaymentIdAndUserForUpdate(1L, freeUser))
                .thenReturn(Optional.of(order));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                paymentService.markPaymentFailed(freeUser, 1L));

        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
    }

    @Test
    void markPaymentFailed_WhenUserAlreadyPremium_ShouldStillAllowAndReturnPremiumTier() {
        PaymentOrder order = PaymentOrder.builder()
                .paymentId(1L).user(premiumUser).planCode(PlanCode.PREMIUM_1_MONTH)
                .amount(199000L).currency("VND")
                .status(PaymentStatus.PENDING).paymentMethod(PaymentMethod.MOCK).paymentProvider(com.demo.ai_study_hub.dto.PaymentProvider.MOCK).build();

        when(paymentOrderRepository.findByPaymentIdAndUserForUpdate(1L, premiumUser))
                .thenReturn(Optional.of(order));
        when(userRepository.findById(premiumUser.getUserId())).thenReturn(Optional.of(premiumUser));
        when(paymentOrderRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        PaymentResponse response = paymentService.markPaymentFailed(premiumUser, 1L);

        assertEquals(PaymentStatus.FAILED, response.getStatus());
        assertEquals("PREMIUM", response.getTier());
        assertNull(response.getPaidAt());
    }

    // =========================================================================
    // 5. Cancel Payment
    // =========================================================================

    @Test
    void cancelPayment_WhenPendingOrder_ShouldSetCancelledAndNotChangeTier() {
        PaymentOrder order = PaymentOrder.builder()
                .paymentId(1L).user(freeUser).planCode(PlanCode.PREMIUM_1_MONTH)
                .amount(199000L).currency("VND")
                .status(PaymentStatus.PENDING).paymentMethod(PaymentMethod.MOCK).paymentProvider(com.demo.ai_study_hub.dto.PaymentProvider.MOCK).build();

        when(paymentOrderRepository.findByPaymentIdAndUserForUpdate(1L, freeUser))
                .thenReturn(Optional.of(order));
        when(userRepository.findById(freeUser.getUserId())).thenReturn(Optional.of(freeUser));
        when(paymentOrderRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        PaymentResponse response = paymentService.cancelPayment(freeUser, 1L);

        assertEquals(PaymentStatus.CANCELLED, response.getStatus());
        assertEquals("FREE", response.getTier());
        assertNull(response.getPaidAt());
        assertEquals(UserTier.FREE, freeUser.getTier());
        verify(userRepository, never()).save(any());
    }

    @Test
    void cancelPendingPayment_WhenVNPayOrderPending_ShouldAllowNewCheckout() {
        PaymentOrder order = PaymentOrder.builder()
                .paymentId(2L).user(freeUser).planCode(PlanCode.PREMIUM_1_MONTH)
                .amount(199000L).currency("VND")
                .status(PaymentStatus.PENDING).paymentMethod(PaymentMethod.VNPAY)
                .paymentProvider(com.demo.ai_study_hub.dto.PaymentProvider.VNPAY_SANDBOX).build();

        when(paymentOrderRepository.findByPaymentIdAndUserForUpdate(2L, freeUser))
                .thenReturn(Optional.of(order));
        when(userRepository.findById(freeUser.getUserId())).thenReturn(Optional.of(freeUser));
        when(paymentOrderRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        PaymentResponse response = paymentService.cancelPendingPayment(freeUser, 2L);

        assertEquals(PaymentStatus.CANCELLED, response.getStatus());
        assertEquals("FREE", response.getTier());
        verify(paymentOrderRepository).save(order);
    }

    @Test
    void cancelPayment_WhenPaymentNotFound_ShouldThrow404() {
        when(paymentOrderRepository.findByPaymentIdAndUserForUpdate(99L, freeUser))
                .thenReturn(Optional.empty());

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                paymentService.cancelPayment(freeUser, 99L));

        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
    }

    @Test
    void cancelPayment_WhenPaymentNotPending_ShouldThrow409() {
        PaymentOrder order = PaymentOrder.builder()
                .paymentId(1L).user(freeUser)
                .status(PaymentStatus.SUCCESS).paymentProvider(com.demo.ai_study_hub.dto.PaymentProvider.MOCK).build();

        when(paymentOrderRepository.findByPaymentIdAndUserForUpdate(1L, freeUser))
                .thenReturn(Optional.of(order));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                paymentService.cancelPayment(freeUser, 1L));

        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
    }

    @Test
    void cancelPayment_WhenUserAlreadyPremium_ShouldStillAllowAndReturnPremiumTier() {
        PaymentOrder order = PaymentOrder.builder()
                .paymentId(1L).user(premiumUser).planCode(PlanCode.PREMIUM_1_MONTH)
                .amount(199000L).currency("VND")
                .status(PaymentStatus.PENDING).paymentMethod(PaymentMethod.MOCK).paymentProvider(com.demo.ai_study_hub.dto.PaymentProvider.MOCK).build();

        when(paymentOrderRepository.findByPaymentIdAndUserForUpdate(1L, premiumUser))
                .thenReturn(Optional.of(order));
        when(userRepository.findById(premiumUser.getUserId())).thenReturn(Optional.of(premiumUser));
        when(paymentOrderRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        PaymentResponse response = paymentService.cancelPayment(premiumUser, 1L);

        assertEquals(PaymentStatus.CANCELLED, response.getStatus());
        assertEquals("PREMIUM", response.getTier());
        assertNull(response.getPaidAt());
    }

    // =========================================================================
    // 6. Get My Payments
    // =========================================================================

    @Test
    void getMyPayments_ShouldReturnAllStatusesNewestFirst() {
        PaymentOrder success = PaymentOrder.builder()
                .paymentId(2L).user(freeUser).planCode(PlanCode.PREMIUM_1_MONTH)
                .amount(199000L).currency("VND").status(PaymentStatus.SUCCESS)
                .paymentMethod(PaymentMethod.MOCK).paymentProvider(com.demo.ai_study_hub.dto.PaymentProvider.MOCK)
                .createdAt(LocalDateTime.now(ZoneOffset.UTC)).paidAt(LocalDateTime.now(ZoneOffset.UTC)).build();

        PaymentOrder failed = PaymentOrder.builder()
                .paymentId(1L).user(freeUser).planCode(PlanCode.PREMIUM_1_MONTH)
                .amount(199000L).currency("VND").status(PaymentStatus.FAILED)
                .paymentMethod(PaymentMethod.MOCK).paymentProvider(com.demo.ai_study_hub.dto.PaymentProvider.MOCK)
                .createdAt(LocalDateTime.now(ZoneOffset.UTC).minusHours(1)).build();

        when(paymentOrderRepository.findByUserOrderByCreatedAtDesc(freeUser))
                .thenReturn(List.of(success, failed));

        List<PaymentResponse> responses = paymentService.getMyPayments(freeUser);

        assertEquals(2, responses.size());
        assertEquals(PaymentStatus.SUCCESS, responses.get(0).getStatus());
        assertEquals(PaymentStatus.FAILED, responses.get(1).getStatus());
        assertNull(responses.get(0).getTier());
        assertNull(responses.get(1).getTier());
    }

    @Test
    void getMyPayments_ShouldShowCorrectPlanNamePerOrder() {
        PaymentOrder premiumOrder = PaymentOrder.builder()
                .paymentId(1L).user(freeUser).planCode(PlanCode.PREMIUM_1_MONTH)
                .amount(199000L).currency("VND").status(PaymentStatus.SUCCESS)
                .paymentMethod(PaymentMethod.MOCK).paymentProvider(com.demo.ai_study_hub.dto.PaymentProvider.MOCK).createdAt(LocalDateTime.now(ZoneOffset.UTC)).build();

        PaymentOrder ultraOrder = PaymentOrder.builder()
                .paymentId(2L).user(freeUser).planCode(PlanCode.ULTRA_1_MONTH)
                .amount(399000L).currency("VND").status(PaymentStatus.SUCCESS)
                .paymentMethod(PaymentMethod.MOCK).paymentProvider(com.demo.ai_study_hub.dto.PaymentProvider.MOCK).createdAt(LocalDateTime.now(ZoneOffset.UTC)).build();

        when(paymentOrderRepository.findByUserOrderByCreatedAtDesc(freeUser))
                .thenReturn(List.of(ultraOrder, premiumOrder));

        List<PaymentResponse> responses = paymentService.getMyPayments(freeUser);

        assertEquals("Ultra", responses.get(0).getPlanName());
        assertEquals("Premium", responses.get(1).getPlanName());
    }

    @Test
    void getMyPayments_WhenNoPayments_ShouldReturnEmptyList() {
        when(paymentOrderRepository.findByUserOrderByCreatedAtDesc(freeUser))
                .thenReturn(List.of());

        List<PaymentResponse> responses = paymentService.getMyPayments(freeUser);

        assertNotNull(responses);
        assertTrue(responses.isEmpty());
    }

    // =========================================================================
    // 7. TierPolicyService limits / effective tier
    // =========================================================================

    @Test
    void planService_FreeTierLimits_ShouldMatchSpec() {
        AiProperties props = new AiProperties();
        props.setProvider("gemini");
        TierPolicyService tps = new TierPolicyService(props);
        com.demo.ai_study_hub.dto.TierLimits limits = tps.getLimits(UserTier.FREE);
        assertEquals(5, limits.aiQuestionsPerDay());
        assertEquals(500, limits.maxQuestionChars());
        assertEquals(3, limits.maxContextChunks());
        assertEquals(500, limits.maxOutputTokens());
        assertEquals("gemini-2.5-flash-lite", limits.aiModel());
    }

    @Test
    void planService_PremiumTierLimits_ShouldMatchSpec() {
        AiProperties props = new AiProperties();
        props.setProvider("gemini");
        TierPolicyService tps = new TierPolicyService(props);
        com.demo.ai_study_hub.dto.TierLimits limits = tps.getLimits(UserTier.PREMIUM);
        assertEquals(50, limits.aiQuestionsPerDay());
        assertEquals(2000, limits.maxQuestionChars());
        assertEquals(8, limits.maxContextChunks());
        assertEquals(1500, limits.maxOutputTokens());
        assertEquals("gemini-2.5-flash", limits.aiModel());
    }

    @Test
    void planService_UltraTierLimits_ShouldMatchSpec() {
        AiProperties props = new AiProperties();
        props.setProvider("gemini");
        TierPolicyService tps = new TierPolicyService(props);
        com.demo.ai_study_hub.dto.TierLimits limits = tps.getLimits(UserTier.ULTRA);
        assertEquals(200, limits.aiQuestionsPerDay());
        assertEquals(5000, limits.maxQuestionChars());
        assertEquals(15, limits.maxContextChunks());
        assertEquals(3000, limits.maxOutputTokens());
    }

    @Test
    void effectiveTier_WhenPremiumNotExpired_ShouldReturnPremium() {
        TierPolicyService tps = new TierPolicyService(new AiProperties());
        User u = new User();
        u.setTier(UserTier.PREMIUM);
        u.setTierExpiresAt(LocalDateTime.now(ZoneOffset.UTC).plusDays(5));

        assertEquals(UserTier.PREMIUM, tps.getEffectiveTier(u));
    }

    @Test
    void effectiveTier_WhenUltraNotExpired_ShouldReturnUltra() {
        TierPolicyService tps = new TierPolicyService(new AiProperties());
        User u = new User();
        u.setTier(UserTier.ULTRA);
        u.setTierExpiresAt(LocalDateTime.now(ZoneOffset.UTC).plusDays(5));

        assertEquals(UserTier.ULTRA, tps.getEffectiveTier(u));
    }

    @Test
    void effectiveTier_WhenPaidTierExpired_ShouldReturnFree() {
        TierPolicyService tps = new TierPolicyService(new AiProperties());
        User u = new User();
        u.setTier(UserTier.ULTRA);
        u.setTierExpiresAt(LocalDateTime.now(ZoneOffset.UTC).minusDays(1));

        assertEquals(UserTier.FREE, tps.getEffectiveTier(u));
    }
}
