package com.demo.ai_study_hub;

import com.demo.ai_study_hub.dto.PaymentStatus;
import com.demo.ai_study_hub.dto.PaymentMethod;
import com.demo.ai_study_hub.dto.PlanCode;
import com.demo.ai_study_hub.dto.UserTier;
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

    @InjectMocks
    private PaymentService paymentService;

    private User freeUser;
    private User premiumUser;

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

        lenient().when(tierPolicyService.getEffectiveTier(any(User.class))).thenAnswer(invocation -> {
            User u = invocation.getArgument(0);
            return u.getTier();
        });
    }

    // =========================================================================
    // 1. PlanService - TC-PAY-001, TC-PAY-002
    // =========================================================================

    @Test
    void getPlans_ShouldReturnFreeAndPremiumPlans() {
        PlanResponse freePlan = PlanResponse.builder()
                .planCode(PlanCode.FREE).planName("Free")
                .price(0).currency("VND").billingLabel("free").aiDailyLimit(5).build();
        PlanResponse premiumPlan = PlanResponse.builder()
                .planCode(PlanCode.PREMIUM).planName("Premium")
                .price(199000).currency("VND").billingLabel("month").aiDailyLimit(50).build();

        PlanService realPlanService = new PlanService();
        List<PlanResponse> plans = realPlanService.getAllPlans();

        assertEquals(2, plans.size());
        PlanResponse free = plans.stream().filter(p -> PlanCode.FREE.equals(p.getPlanCode())).findFirst().orElseThrow();
        PlanResponse premium = plans.stream().filter(p -> PlanCode.PREMIUM.equals(p.getPlanCode())).findFirst().orElseThrow();

        assertEquals(0, free.getPrice());
        assertEquals("free", free.getBillingLabel());
        assertEquals(5, free.getAiDailyLimit());
        assertEquals("VND", free.getCurrency());

        assertEquals(199000, premium.getPrice());
        assertEquals("month", premium.getBillingLabel());
        assertEquals(50, premium.getAiDailyLimit());
        assertEquals("VND", premium.getCurrency());
    }

    // =========================================================================
    // 2. Create Payment - TC-PAY-011~016
    // =========================================================================

    @Test
    void createMockPayment_WhenFreeUserPremiumPlan_ShouldCreatePendingOrder() {
        when(planService.isValidPlanCode(PlanCode.PREMIUM)).thenReturn(true);
        when(planService.getPrice(PlanCode.PREMIUM)).thenReturn(199000L);
        when(paymentOrderRepository.save(any(PaymentOrder.class))).thenAnswer(inv -> {
            PaymentOrder order = inv.getArgument(0);
            order.setPaymentId(1L);
            return order;
        });

        PaymentResponse response = paymentService.createMockPayment(freeUser, PlanCode.PREMIUM);

        assertNotNull(response);
        assertEquals(PlanCode.PREMIUM, response.getPlanCode());
        assertEquals(199000L, response.getAmount());
        assertEquals("VND", response.getCurrency());
        assertEquals(PaymentStatus.PENDING, response.getStatus());
        assertEquals(PaymentMethod.MOCK, response.getPaymentMethod());
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
    void createMockPayment_WhenUserAlreadyPremium_ShouldThrow409() {
        when(planService.isValidPlanCode(PlanCode.PREMIUM)).thenReturn(true);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
            paymentService.createMockPayment(premiumUser, PlanCode.PREMIUM));

        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
        assertTrue(ex.getReason().contains("already Premium"));
        verify(paymentOrderRepository, never()).save(any());
    }

    @Test
    void createMockPayment_WhenUserExpiredPremium_ShouldAllowUpgrade() {
        // user is premium in database but effective tier has expired to FREE
        User expiredUser = new User();
        expiredUser.setUserId(3);
        expiredUser.setEmail("expired@test.com");
        expiredUser.setTier(UserTier.PREMIUM);
        expiredUser.setTierExpiresAt(LocalDateTime.now().minusDays(1));

        when(planService.isValidPlanCode(PlanCode.PREMIUM)).thenReturn(true);
        when(planService.getPrice(PlanCode.PREMIUM)).thenReturn(199000L);
        when(tierPolicyService.getEffectiveTier(expiredUser)).thenReturn(UserTier.FREE);
        when(paymentOrderRepository.save(any(PaymentOrder.class))).thenAnswer(inv -> {
            PaymentOrder order = inv.getArgument(0);
            order.setPaymentId(99L);
            return order;
        });

        PaymentResponse response = paymentService.createMockPayment(expiredUser, PlanCode.PREMIUM);

        assertNotNull(response);
        assertEquals(PlanCode.PREMIUM, response.getPlanCode());
        assertEquals(199000L, response.getAmount());
        assertEquals(PaymentStatus.PENDING, response.getStatus());
        verify(paymentOrderRepository, times(1)).save(any(PaymentOrder.class));
    }

    @Test
    void createMockPayment_WhenNullPlanCode_ShouldThrow400() {
        when(planService.isValidPlanCode(null)).thenReturn(false);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                paymentService.createMockPayment(freeUser, null));

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
    }

    // =========================================================================
    // 3. Confirm Success - TC-PAY-020~028
    // =========================================================================

    @Test
    void markPaymentSuccess_WhenPendingOrder_ShouldUpgradeUserToPremium() {
        PaymentOrder order = PaymentOrder.builder()
                .paymentId(1L).user(freeUser).planCode(PlanCode.PREMIUM)
                .amount(199000L).currency("VND")
                .status(PaymentStatus.PENDING).paymentMethod(PaymentMethod.MOCK).build();

        when(paymentOrderRepository.findByPaymentIdAndUserForUpdate(1L, freeUser))
                .thenReturn(Optional.of(order));
        when(userRepository.findById(freeUser.getUserId())).thenReturn(Optional.of(freeUser));
        when(paymentOrderRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        PaymentResponse response = paymentService.markPaymentSuccess(freeUser, 1L);

        assertEquals(PaymentStatus.SUCCESS, response.getStatus());
        assertEquals("PREMIUM", response.getTier());
        assertNotNull(response.getPaidAt());
        assertEquals(UserTier.PREMIUM, freeUser.getTier());
        verify(userRepository, times(1)).save(freeUser);
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
                .paymentId(1L).user(premiumUser).planCode(PlanCode.PREMIUM)
                .status(PaymentStatus.SUCCESS).build();

        when(paymentOrderRepository.findByPaymentIdAndUserForUpdate(1L, premiumUser))
                .thenReturn(Optional.of(order));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                paymentService.markPaymentSuccess(premiumUser, 1L));

        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
    }

    @Test
    void markPaymentSuccess_WhenPaymentAlreadyFailed_ShouldThrow409() {
        PaymentOrder order = PaymentOrder.builder()
                .paymentId(1L).user(freeUser).planCode(PlanCode.PREMIUM)
                .status(PaymentStatus.FAILED).build();

        when(paymentOrderRepository.findByPaymentIdAndUserForUpdate(1L, freeUser))
                .thenReturn(Optional.of(order));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                paymentService.markPaymentSuccess(freeUser, 1L));

        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
    }

    @Test
    void markPaymentSuccess_WhenPaymentAlreadyCancelled_ShouldThrow409() {
        PaymentOrder order = PaymentOrder.builder()
                .paymentId(1L).user(freeUser).planCode(PlanCode.PREMIUM)
                .status(PaymentStatus.CANCELLED).build();

        when(paymentOrderRepository.findByPaymentIdAndUserForUpdate(1L, freeUser))
                .thenReturn(Optional.of(order));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                paymentService.markPaymentSuccess(freeUser, 1L));

        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
    }

    @Test
    void markPaymentSuccess_WhenUserAlreadyPremium_ShouldThrow409() {
        // User đã PREMIUM nhưng còn payment PENDING cũ
        PaymentOrder order = PaymentOrder.builder()
                .paymentId(1L).user(premiumUser).planCode(PlanCode.PREMIUM)
                .status(PaymentStatus.PENDING).build();

        when(paymentOrderRepository.findByPaymentIdAndUserForUpdate(1L, premiumUser))
                .thenReturn(Optional.of(order));
        when(userRepository.findById(premiumUser.getUserId())).thenReturn(Optional.of(premiumUser));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                paymentService.markPaymentSuccess(premiumUser, 1L));

        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
        assertTrue(ex.getReason().contains("already Premium"));
        verify(userRepository, never()).save(any());
    }

    // =========================================================================
    // 4. Confirm Fail - TC-PAY-030~034
    // =========================================================================

    @Test
    void markPaymentFailed_WhenPendingOrder_ShouldSetFailedAndNotChangeTier() {
        PaymentOrder order = PaymentOrder.builder()
                .paymentId(1L).user(freeUser).planCode(PlanCode.PREMIUM)
                .amount(199000L).currency("VND")
                .status(PaymentStatus.PENDING).paymentMethod(PaymentMethod.MOCK).build();

        when(paymentOrderRepository.findByPaymentIdAndUserForUpdate(1L, freeUser))
                .thenReturn(Optional.of(order));
        when(userRepository.findById(freeUser.getUserId())).thenReturn(Optional.of(freeUser));
        when(paymentOrderRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        PaymentResponse response = paymentService.markPaymentFailed(freeUser, 1L);

        assertEquals(PaymentStatus.FAILED, response.getStatus());
        assertEquals("FREE", response.getTier());
        assertNull(response.getPaidAt());
        assertEquals(UserTier.FREE, freeUser.getTier()); // tier không đổi
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
                .status(PaymentStatus.SUCCESS).build();

        when(paymentOrderRepository.findByPaymentIdAndUserForUpdate(1L, freeUser))
                .thenReturn(Optional.of(order));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                paymentService.markPaymentFailed(freeUser, 1L));

        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
    }

    @Test
    void markPaymentFailed_WhenUserAlreadyPremium_ShouldStillAllowAndReturnPremiumTier() {
        // TC-PAY-034: PREMIUM user fail payment cũ → vẫn được, tier vẫn PREMIUM
        PaymentOrder order = PaymentOrder.builder()
                .paymentId(1L).user(premiumUser).planCode(PlanCode.PREMIUM)
                .amount(199000L).currency("VND")
                .status(PaymentStatus.PENDING).paymentMethod(PaymentMethod.MOCK).build();

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
    // 5. Cancel Payment - TC-PAY-040~044
    // =========================================================================

    @Test
    void cancelPayment_WhenPendingOrder_ShouldSetCancelledAndNotChangeTier() {
        PaymentOrder order = PaymentOrder.builder()
                .paymentId(1L).user(freeUser).planCode(PlanCode.PREMIUM)
                .amount(199000L).currency("VND")
                .status(PaymentStatus.PENDING).paymentMethod(PaymentMethod.MOCK).build();

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
                .status(PaymentStatus.SUCCESS).build();

        when(paymentOrderRepository.findByPaymentIdAndUserForUpdate(1L, freeUser))
                .thenReturn(Optional.of(order));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                paymentService.cancelPayment(freeUser, 1L));

        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
    }

    @Test
    void cancelPayment_WhenUserAlreadyPremium_ShouldStillAllowAndReturnPremiumTier() {
        // TC-PAY-044: PREMIUM user cancel payment cũ → vẫn được, tier vẫn PREMIUM
        PaymentOrder order = PaymentOrder.builder()
                .paymentId(1L).user(premiumUser).planCode(PlanCode.PREMIUM)
                .amount(199000L).currency("VND")
                .status(PaymentStatus.PENDING).paymentMethod(PaymentMethod.MOCK).build();

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
    // 6. Get My Payments - TC-PAY-050~052
    // =========================================================================

    @Test
    void getMyPayments_ShouldReturnAllStatusesNewestFirst() {
        PaymentOrder success = PaymentOrder.builder()
                .paymentId(2L).user(freeUser).planCode(PlanCode.PREMIUM)
                .amount(199000L).currency("VND").status(PaymentStatus.SUCCESS)
                .paymentMethod(PaymentMethod.MOCK)
                .createdAt(LocalDateTime.now()).paidAt(LocalDateTime.now()).build();

        PaymentOrder failed = PaymentOrder.builder()
                .paymentId(1L).user(freeUser).planCode(PlanCode.PREMIUM)
                .amount(199000L).currency("VND").status(PaymentStatus.FAILED)
                .paymentMethod(PaymentMethod.MOCK)
                .createdAt(LocalDateTime.now().minusHours(1)).build();

        when(paymentOrderRepository.findByUserOrderByCreatedAtDesc(freeUser))
                .thenReturn(List.of(success, failed));

        List<PaymentResponse> responses = paymentService.getMyPayments(freeUser);

        assertEquals(2, responses.size());
        assertEquals(PaymentStatus.SUCCESS, responses.get(0).getStatus());
        assertEquals(PaymentStatus.FAILED, responses.get(1).getStatus());
        // tier không có trong history list
        assertNull(responses.get(0).getTier());
        assertNull(responses.get(1).getTier());
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
    // 7. PlanService tier limits - TC-PAY-061, TC-PAY-063
    // =========================================================================

    @Test
    void planService_FreeTierLimits_ShouldMatchSpec() {
        PlanService ps = new PlanService();
        assertEquals(5, ps.getDailyLimit(UserTier.FREE));
        assertEquals(500, ps.getMaxQuestionChars(UserTier.FREE));
        assertEquals(3, ps.getMaxContextChunks(UserTier.FREE));
        assertEquals(500, ps.getMaxOutputTokens(UserTier.FREE));
        assertEquals("gemini-2.5-flash-lite", ps.getModel(UserTier.FREE));
    }

    @Test
    void planService_PremiumTierLimits_ShouldMatchSpec() {
        PlanService ps = new PlanService();
        assertEquals(50, ps.getDailyLimit(UserTier.PREMIUM));
        assertEquals(2000, ps.getMaxQuestionChars(UserTier.PREMIUM));
        assertEquals(8, ps.getMaxContextChunks(UserTier.PREMIUM));
        assertEquals(1500, ps.getMaxOutputTokens(UserTier.PREMIUM));
        assertEquals("gemini-2.5-flash", ps.getModel(UserTier.PREMIUM));
    }
}
