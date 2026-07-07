package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.config.FrontendProperties;
import com.demo.ai_study_hub.dto.PaymentStatus;
import com.demo.ai_study_hub.entity.PaymentOrder;
import com.demo.ai_study_hub.entity.User;
import com.demo.ai_study_hub.enums.UserTier;
import com.demo.ai_study_hub.repository.PaymentOrderRepository;
import com.demo.ai_study_hub.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class VNPayIpnService {

    private final VNPayService vnPayService;
    private final PaymentOrderRepository paymentOrderRepository;
    private final UserRepository userRepository;
    private final TierPolicyService tierPolicyService;
    private final PaymentService paymentService;
    private final FrontendProperties frontendProperties;

    /**
     * Return URL: verify-only, redirect target. NEVER updates the DB —
     * this channel is untrusted (browser redirect, no server-to-server trust).
     */
    public String handleReturn(Map<String, String> params) {
        boolean valid = vnPayService.verifyChecksum(params);
        if (!valid) {
            log.warn("VNPay return checksum invalid, txnRef={}", params.get("vnp_TxnRef"));
            return frontendProperties.getPaymentResultUrl() + "?error=payment_return_invalid";
        }

        String txnRef = params.get("vnp_TxnRef");
        return paymentOrderRepository.findByVnpTxnRef(txnRef)
                .map(order -> frontendProperties.getPaymentResultUrl() + "?paymentId=" + order.getPaymentId())
                .orElse(frontendProperties.getPaymentResultUrl() + "?error=payment_return_invalid");
    }

    /**
     * IPN: server-to-server. This is the ONLY source of truth for finalizing
     * a VNPay payment. Order of operations matters — do not lock DB before
     * verifying the signature.
     */
    @Transactional
    public Map<String, String> handleIpn(Map<String, String> params) {
        // 1. Required params — a signed-but-incomplete callback must be
        // rejected as malformed (99), never silently treated as a failure.
        String txnRef = params.get("vnp_TxnRef");
        String amountStr = params.get("vnp_Amount");
        String vnpResponseCode = params.get("vnp_ResponseCode");
        String vnpTransactionStatus = params.get("vnp_TransactionStatus");
        String vnpPayDateRaw = params.get("vnp_PayDate");
        String vnpSecureHash = params.get("vnp_SecureHash");

        if (txnRef == null || txnRef.isBlank()
                || amountStr == null || amountStr.isBlank()
                || vnpResponseCode == null || vnpResponseCode.isBlank()
                || vnpTransactionStatus == null || vnpTransactionStatus.isBlank()
                || vnpPayDateRaw == null || vnpPayDateRaw.isBlank()
                || vnpSecureHash == null || vnpSecureHash.isBlank()) {
            return response("99", "Missing required parameters");
        }

        // 2. Verify checksum BEFORE any DB lock.
        if (!vnPayService.verifyChecksum(params)) {
            return response("97", "Invalid signature");
        }

        // 3. Lookup + lock order by txnRef.
        PaymentOrder order = paymentOrderRepository.findByVnpTxnRefForUpdate(txnRef).orElse(null);
        if (order == null) {
            return response("01", "Order not found");
        }

        // 4. Verify amount vs snapshot.
        long receivedAmount;
        try {
            receivedAmount = Long.parseLong(amountStr);
        } catch (NumberFormatException e) {
            return response("04", "Invalid amount");
        }
        long expectedAmount = order.getAmount() * 100;
        if (receivedAmount != expectedAmount) {
            return response("04", "Invalid amount");
        }

        // 5. Duplicate / already-terminal check — MUST happen before we
        // overwrite any audit fields, so a repeated callback for an order
        // that is already SUCCESS/FAILED/CANCELLED/REVIEW_REQUIRED never
        // mutates data that has already been settled.
        if (isTerminal(order.getStatus())) {
            return response("02", "Order already confirmed");
        }

        // 6. Persist raw VNPay response fields (audit trail) now that we
        // know this order is still processable.
        order.setVnpTransactionNo(params.get("vnp_TransactionNo"));
        order.setVnpBankCode(params.get("vnp_BankCode"));
        order.setVnpResponseCode(vnpResponseCode);
        order.setVnpTransactionStatus(vnpTransactionStatus);
        order.setVnpPayDate(vnpPayDateRaw);

        // 7. Provider-reported failure.
        if (!"00".equals(vnpResponseCode) || !"00".equals(vnpTransactionStatus)) {
            order.setStatus(PaymentStatus.FAILED);
            paymentOrderRepository.save(order);
            return response("00", "Confirm success");
        }

        // 8. Parse pay date to UTC.
        LocalDateTime payDateUtc = vnPayService.parsePayDateToUtc(vnpPayDateRaw);
        if (payDateUtc == null) {
            order.setStatus(PaymentStatus.REVIEW_REQUIRED);
            order.setReviewReason("PAY_DATE_PARSE_FAILED");
            order.setReviewRequiredAt(LocalDateTime.now(ZoneOffset.UTC));
            paymentOrderRepository.save(order);
            return response("00", "Confirm success");
        }

        // Record providerPaidAt as soon as we successfully parse it — even
        // if the order later gets routed to REVIEW_REQUIRED for being late,
        // the actual provider-reported payment time must not be lost.
        order.setProviderPaidAt(payDateUtc);

        // 9. Late payment check (pay date after order expiry).
        if (order.getExpiredAt() != null && payDateUtc.isAfter(order.getExpiredAt())) {
            order.setStatus(PaymentStatus.REVIEW_REQUIRED);
            order.setReviewReason("PAY_DATE_AFTER_EXPIRY");
            order.setReviewRequiredAt(LocalDateTime.now(ZoneOffset.UTC));
            paymentOrderRepository.save(order);
            return response("00", "Confirm success");
        }

        // 10. Downgrade protection — lock user, compare effective tier vs target.
        User lockedUser = userRepository.findByIdForUpdate(order.getUser().getUserId()).orElse(null);
        if (lockedUser == null) {
            order.setStatus(PaymentStatus.REVIEW_REQUIRED);
            order.setReviewReason("PROVIDER_DATA_INCONSISTENT");
            order.setReviewRequiredAt(LocalDateTime.now(ZoneOffset.UTC));
            paymentOrderRepository.save(order);
            return response("00", "Confirm success");
        }

        UserTier targetTier = UserTier.valueOf(order.getTargetTier());
        UserTier currentEffectiveTier = tierPolicyService.getEffectiveTier(lockedUser);

        if (currentEffectiveTier == UserTier.ULTRA && targetTier == UserTier.PREMIUM) {
            order.setStatus(PaymentStatus.REVIEW_REQUIRED);
            order.setReviewReason("TARGET_TIER_LOWER_THAN_CURRENT_TIER");
            order.setReviewRequiredAt(LocalDateTime.now(ZoneOffset.UTC));
            paymentOrderRepository.save(order);
            return response("00", "Confirm success");
        }

        // 11. All checks passed — finalize using the VNPay-reported pay date
        // (not the time the backend happened to process the callback).
        paymentOrderRepository.save(order);
        paymentService.finalizeSuccessfulPayment(order, targetTier, payDateUtc);

        return response("00", "Confirm success");
    }

    /**
     * REVIEW_REQUIRED is terminal for IPN purposes: once an order has been
     * flagged for manual review, a repeated callback must not silently
     * re-process or overwrite it. Resolving a REVIEW_REQUIRED order is an
     * explicit manual/admin action, not something a retried IPN should do.
     */
    private boolean isTerminal(String status) {
        return PaymentStatus.SUCCESS.equals(status)
                || PaymentStatus.FAILED.equals(status)
                || PaymentStatus.CANCELLED.equals(status)
                || PaymentStatus.REVIEW_REQUIRED.equals(status);
    }

    private Map<String, String> response(String rspCode, String message) {
        Map<String, String> body = new LinkedHashMap<>();
        body.put("RspCode", rspCode);
        body.put("Message", message);
        return body;
    }
}