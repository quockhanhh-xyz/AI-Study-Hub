package com.demo.ai_study_hub;

import com.demo.ai_study_hub.config.FrontendProperties;
import com.demo.ai_study_hub.dto.PaymentStatus;
import com.demo.ai_study_hub.entity.PaymentOrder;
import com.demo.ai_study_hub.entity.User;
import com.demo.ai_study_hub.enums.UserTier;
import com.demo.ai_study_hub.repository.PaymentOrderRepository;
import com.demo.ai_study_hub.repository.UserRepository;
import com.demo.ai_study_hub.service.PaymentService;
import com.demo.ai_study_hub.service.TierPolicyService;
import com.demo.ai_study_hub.service.VNPayIpnService;
import com.demo.ai_study_hub.service.VNPayService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class VNPayIpnServiceTest {

    @Mock private VNPayService vnPayService;
    @Mock private PaymentOrderRepository paymentOrderRepository;
    @Mock private UserRepository userRepository;
    @Mock private TierPolicyService tierPolicyService;
    @Mock private PaymentService paymentService;
    @Mock private FrontendProperties frontendProperties;

    private VNPayIpnService vnPayIpnService;

    private User user;
    private PaymentOrder pendingOrder;

    @BeforeEach
    void setUp() {
        vnPayIpnService = new VNPayIpnService(
                vnPayService, paymentOrderRepository, userRepository,
                tierPolicyService, paymentService, frontendProperties);

        user = new User();
        user.setUserId(1);
        user.setTier(UserTier.FREE);

        pendingOrder = PaymentOrder.builder()
                .paymentId(10L)
                .user(user)
                .planCode("PREMIUM_1_MONTH")
                .targetTier("PREMIUM")
                .amount(199000L)
                .currency("VND")
                .status(PaymentStatus.PENDING)
                .vnpTxnRef("PAYTEST10")
                .expiredAt(LocalDateTime.now(ZoneOffset.UTC).plusMinutes(15))
                .build();
    }

    private Map<String, String> fullValidParams() {
        Map<String, String> params = new LinkedHashMap<>();
        params.put("vnp_TxnRef", "PAYTEST10");
        params.put("vnp_Amount", "19900000");
        params.put("vnp_ResponseCode", "00");
        params.put("vnp_TransactionStatus", "00");
        params.put("vnp_PayDate", "20260706143000");
        params.put("vnp_SecureHash", "validhash");
        params.put("vnp_TransactionNo", "VNP123");
        params.put("vnp_BankCode", "NCB");
        return params;
    }

    // =========================================================================
    // 1. Required parameters
    // =========================================================================

    @Test
    void handleIpn_WhenMissingResponseCode_ShouldReturn99WithoutTouchingDb() {
        Map<String, String> params = fullValidParams();
        params.remove("vnp_ResponseCode");

        Map<String, String> result = vnPayIpnService.handleIpn(params);

        assertEquals("99", result.get("RspCode"));
        verify(paymentOrderRepository, never()).findByVnpTxnRefForUpdate(any());
        verify(vnPayService, never()).verifyChecksum(any());
    }

    @Test
    void handleIpn_WhenMissingPayDate_ShouldReturn99() {
        Map<String, String> params = fullValidParams();
        params.remove("vnp_PayDate");

        assertEquals("99", vnPayIpnService.handleIpn(params).get("RspCode"));
    }

    @Test
    void handleIpn_WhenMissingSecureHash_ShouldReturn99() {
        Map<String, String> params = fullValidParams();
        params.remove("vnp_SecureHash");

        assertEquals("99", vnPayIpnService.handleIpn(params).get("RspCode"));
    }

    // =========================================================================
    // 2. Signature verified before any DB lock
    // =========================================================================

    @Test
    void handleIpn_WhenSignatureInvalid_ShouldReturn97AndNeverLockOrder() {
        when(vnPayService.verifyChecksum(any())).thenReturn(false);

        Map<String, String> result = vnPayIpnService.handleIpn(fullValidParams());

        assertEquals("97", result.get("RspCode"));
        verify(paymentOrderRepository, never()).findByVnpTxnRefForUpdate(any());
    }

    // =========================================================================
    // 3. Order lookup
    // =========================================================================

    @Test
    void handleIpn_WhenOrderNotFound_ShouldReturn01() {
        when(vnPayService.verifyChecksum(any())).thenReturn(true);
        when(paymentOrderRepository.findByVnpTxnRefForUpdate("PAYTEST10")).thenReturn(Optional.empty());

        assertEquals("01", vnPayIpnService.handleIpn(fullValidParams()).get("RspCode"));
    }

    // =========================================================================
    // 4. Amount verification
    // =========================================================================

    @Test
    void handleIpn_WhenAmountMismatch_ShouldReturn04() {
        when(vnPayService.verifyChecksum(any())).thenReturn(true);
        when(paymentOrderRepository.findByVnpTxnRefForUpdate("PAYTEST10")).thenReturn(Optional.of(pendingOrder));

        Map<String, String> params = fullValidParams();
        params.put("vnp_Amount", "1"); // does not match order.amount * 100

        assertEquals("04", vnPayIpnService.handleIpn(params).get("RspCode"));
        verify(paymentOrderRepository, never()).save(any());
    }

    // =========================================================================
    // 5. REVIEW_REQUIRED is terminal — duplicate callback must not reprocess
    // =========================================================================

    @Test
    void handleIpn_WhenOrderAlreadyReviewRequired_ShouldReturn02_AndNotOverwriteAuditFields() {
        pendingOrder.setStatus(PaymentStatus.REVIEW_REQUIRED);
        pendingOrder.setReviewReason("PAY_DATE_AFTER_EXPIRY");
        pendingOrder.setVnpTransactionNo("ORIGINAL_TXN");

        when(vnPayService.verifyChecksum(any())).thenReturn(true);
        when(paymentOrderRepository.findByVnpTxnRefForUpdate("PAYTEST10")).thenReturn(Optional.of(pendingOrder));

        Map<String, String> result = vnPayIpnService.handleIpn(fullValidParams());

        assertEquals("02", result.get("RspCode"));
        // Audit fields must remain untouched — proves the terminal check ran
        // BEFORE any field was overwritten.
        assertEquals("ORIGINAL_TXN", pendingOrder.getVnpTransactionNo());
        assertEquals("PAY_DATE_AFTER_EXPIRY", pendingOrder.getReviewReason());
        verify(paymentOrderRepository, never()).save(any());
        verify(paymentService, never()).finalizeSuccessfulPayment(any(), any(), any());
    }

    @Test
    void handleIpn_WhenOrderAlreadySuccess_ShouldReturn02() {
        pendingOrder.setStatus(PaymentStatus.SUCCESS);
        when(vnPayService.verifyChecksum(any())).thenReturn(true);
        when(paymentOrderRepository.findByVnpTxnRefForUpdate("PAYTEST10")).thenReturn(Optional.of(pendingOrder));

        assertEquals("02", vnPayIpnService.handleIpn(fullValidParams()).get("RspCode"));
    }

    @Test
    void handleIpn_WhenCancelledOrderWasActuallyPaid_ShouldRequireManualReview() {
        pendingOrder.setStatus(PaymentStatus.CANCELLED);
        LocalDateTime payDate = LocalDateTime.of(2026, 7, 6, 7, 30, 0);

        when(vnPayService.verifyChecksum(any())).thenReturn(true);
        when(paymentOrderRepository.findByVnpTxnRefForUpdate("PAYTEST10")).thenReturn(Optional.of(pendingOrder));
        when(vnPayService.parsePayDateToUtc("20260706143000")).thenReturn(payDate);

        Map<String, String> result = vnPayIpnService.handleIpn(fullValidParams());

        assertEquals("00", result.get("RspCode"));
        assertEquals(PaymentStatus.REVIEW_REQUIRED, pendingOrder.getStatus());
        assertEquals("PAYMENT_RECEIVED_AFTER_LOCAL_CANCELLATION", pendingOrder.getReviewReason());
        assertEquals(payDate, pendingOrder.getProviderPaidAt());
        assertEquals("VNP123", pendingOrder.getVnpTransactionNo());
        verify(paymentOrderRepository).save(pendingOrder);
        verify(paymentService, never()).finalizeSuccessfulPayment(any(), any(), any());
    }

    // =========================================================================
    // 6. EXPIRED -> SUCCESS: late-but-within-window payment must still finalize
    // =========================================================================

    @Test
    void handleIpn_WhenOrderExpiredButPayDateWithinExpiry_ShouldFinalizeToSuccess() {
        pendingOrder.setStatus(PaymentStatus.EXPIRED);
        // expiredAt in the future relative to the pay date below
        pendingOrder.setExpiredAt(LocalDateTime.of(2026, 7, 6, 8, 0, 0));

        when(vnPayService.verifyChecksum(any())).thenReturn(true);
        when(paymentOrderRepository.findByVnpTxnRefForUpdate("PAYTEST10")).thenReturn(Optional.of(pendingOrder));
        when(vnPayService.parsePayDateToUtc("20260706143000"))
                .thenReturn(LocalDateTime.of(2026, 7, 6, 7, 30, 0)); // before expiredAt
        when(userRepository.findByIdForUpdate(user.getUserId())).thenReturn(Optional.of(user));
        when(tierPolicyService.getEffectiveTier(user)).thenReturn(UserTier.FREE);

        Map<String, String> result = vnPayIpnService.handleIpn(fullValidParams());

        assertEquals("00", result.get("RspCode"));
        verify(paymentService, times(1)).finalizeSuccessfulPayment(
                eq(pendingOrder), eq(UserTier.PREMIUM), eq(LocalDateTime.of(2026, 7, 6, 7, 30, 0)));
    }

    // =========================================================================
    // 7. Late payment (pay date after expiry) -> REVIEW_REQUIRED,
    //    providerPaidAt must still be recorded.
    // =========================================================================

    @Test
    void handleIpn_WhenPayDateAfterExpiry_ShouldSetReviewRequired_AndStillRecordProviderPaidAt() {
        pendingOrder.setExpiredAt(LocalDateTime.of(2026, 7, 6, 7, 0, 0));

        when(vnPayService.verifyChecksum(any())).thenReturn(true);
        when(paymentOrderRepository.findByVnpTxnRefForUpdate("PAYTEST10")).thenReturn(Optional.of(pendingOrder));
        LocalDateTime latePayDate = LocalDateTime.of(2026, 7, 6, 7, 30, 0); // after expiredAt
        when(vnPayService.parsePayDateToUtc("20260706143000")).thenReturn(latePayDate);

        Map<String, String> result = vnPayIpnService.handleIpn(fullValidParams());

        assertEquals("00", result.get("RspCode"));
        assertEquals(PaymentStatus.REVIEW_REQUIRED, pendingOrder.getStatus());
        assertEquals("PAY_DATE_AFTER_EXPIRY", pendingOrder.getReviewReason());
        // Bug 3 fix verification: providerPaidAt must be recorded even though
        // the order was routed to REVIEW_REQUIRED.
        assertEquals(latePayDate, pendingOrder.getProviderPaidAt());
        verify(paymentService, never()).finalizeSuccessfulPayment(any(), any(), any());
    }

    // =========================================================================
    // 8. paidAt must come from vnp_PayDate, not from now()
    // =========================================================================

    @Test
    void handleIpn_WhenSuccess_ShouldFinalizeWithVnpPayDate_NotProcessingTime() {
        when(vnPayService.verifyChecksum(any())).thenReturn(true);
        when(paymentOrderRepository.findByVnpTxnRefForUpdate("PAYTEST10")).thenReturn(Optional.of(pendingOrder));
        LocalDateTime payDate = LocalDateTime.of(2026, 7, 6, 7, 30, 0);
        when(vnPayService.parsePayDateToUtc("20260706143000")).thenReturn(payDate);
        when(userRepository.findByIdForUpdate(user.getUserId())).thenReturn(Optional.of(user));
        when(tierPolicyService.getEffectiveTier(user)).thenReturn(UserTier.FREE);

        vnPayIpnService.handleIpn(fullValidParams());

        verify(paymentService).finalizeSuccessfulPayment(pendingOrder, UserTier.PREMIUM, payDate);
        assertEquals(payDate, pendingOrder.getProviderPaidAt());
    }

    // =========================================================================
    // 9. Provider-reported failure
    // =========================================================================

    @Test
    void handleIpn_WhenResponseCodeNotZero_ShouldMarkFailed() {
        when(vnPayService.verifyChecksum(any())).thenReturn(true);
        when(paymentOrderRepository.findByVnpTxnRefForUpdate("PAYTEST10")).thenReturn(Optional.of(pendingOrder));

        Map<String, String> params = fullValidParams();
        params.put("vnp_ResponseCode", "24"); // customer cancelled

        Map<String, String> result = vnPayIpnService.handleIpn(params);

        assertEquals("00", result.get("RspCode"));
        assertEquals(PaymentStatus.FAILED, pendingOrder.getStatus());
        verify(paymentService, never()).finalizeSuccessfulPayment(any(), any(), any());
    }

    // =========================================================================
    // 10. Downgrade protection at IPN time
    // =========================================================================

    @Test
    void handleIpn_WhenUserAlreadyUltraAndOrderIsPremium_ShouldSetReviewRequired() {
        user.setTier(UserTier.ULTRA);
        pendingOrder.setTargetTier("PREMIUM");

        when(vnPayService.verifyChecksum(any())).thenReturn(true);
        when(paymentOrderRepository.findByVnpTxnRefForUpdate("PAYTEST10")).thenReturn(Optional.of(pendingOrder));
        when(vnPayService.parsePayDateToUtc("20260706143000"))
                .thenReturn(LocalDateTime.of(2026, 7, 6, 7, 30, 0));
        when(userRepository.findByIdForUpdate(user.getUserId())).thenReturn(Optional.of(user));
        when(tierPolicyService.getEffectiveTier(user)).thenReturn(UserTier.ULTRA);

        Map<String, String> result = vnPayIpnService.handleIpn(fullValidParams());

        assertEquals("00", result.get("RspCode"));
        assertEquals(PaymentStatus.REVIEW_REQUIRED, pendingOrder.getStatus());
        assertEquals("TARGET_TIER_LOWER_THAN_CURRENT_TIER", pendingOrder.getReviewReason());
        verify(paymentService, never()).finalizeSuccessfulPayment(any(), any(), any());
    }

    // =========================================================================
    // Return URL — verify-only, must never touch the DB
    // =========================================================================

    @Test
    void handleReturn_WhenChecksumInvalid_ShouldRedirectWithErrorAndNotQueryDb() {
        when(vnPayService.verifyChecksum(any())).thenReturn(false);
        when(frontendProperties.getPaymentResultUrl()).thenReturn("https://fe.example.com/payment-result.html");

        String redirect = vnPayIpnService.handleReturn(fullValidParams());

        assertEquals("https://fe.example.com/payment-result.html?error=payment_return_invalid", redirect);
        verify(paymentOrderRepository, never()).findByVnpTxnRef(any());
    }

    @Test
    void handleReturn_WhenChecksumValid_ShouldRedirectWithPaymentId() {
        when(vnPayService.verifyChecksum(any())).thenReturn(true);
        when(paymentOrderRepository.findByVnpTxnRef("PAYTEST10")).thenReturn(Optional.of(pendingOrder));
        when(frontendProperties.getPaymentResultUrl()).thenReturn("https://fe.example.com/payment-result.html");

        String redirect = vnPayIpnService.handleReturn(fullValidParams());

        assertEquals("https://fe.example.com/payment-result.html?paymentId=10", redirect);
        verify(paymentOrderRepository, never()).save(any());
    }
}
