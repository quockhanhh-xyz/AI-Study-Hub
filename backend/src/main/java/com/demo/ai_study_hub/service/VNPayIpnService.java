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
        // 1. Required params
        String txnRef = params.get("vnp_TxnRef");
        String amountStr = params.get("vnp_Amount");
        if (txnRef == null || txnRef.isBlank() || amountStr == null) {
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

        // 5. Persist raw VNPay response fields (audit trail) regardless of outcome.
        order.setVnpTransactionNo(params.get("vnp_TransactionNo"));
        order.setVnpBankCode(params.get("vnp_BankCode"));
        order.setVnpResponseCode(params.get("vnp_ResponseCode"));
        order.setVnpTransactionStatus(params.get("vnp_TransactionStatus"));
        order.setVnpPayDate(params.get("vnp_PayDate"));

        // 6. Duplicate / already-terminal check.
        if (isTerminal(order.getStatus())) {
            paymentOrderRepository.save(order);
            return response("02", "Order already confirmed");
        }

        String vnpResponseCode = params.get("vnp_ResponseCode");
        String vnpTransactionStatus = params.get("vnp_TransactionStatus");

        // 7. Provider-reported failure.
        if (!"00".equals(vnpResponseCode) || !"00".equals(vnpTransactionStatus)) {
            order.setStatus(PaymentStatus.FAILED);
            paymentOrderRepository.save(order);
            return response("00", "Confirm success");
        }

        // 8. Parse pay date to UTC.
        LocalDateTime payDateUtc = vnPayService.parsePayDateToUtc(params.get("vnp_PayDate"));
        if (payDateUtc == null) {
            order.setStatus(PaymentStatus.REVIEW_REQUIRED);
            order.setReviewReason("PAY_DATE_PARSE_FAILED");
            order.setReviewRequiredAt(LocalDateTime.now(ZoneOffset.UTC));
            paymentOrderRepository.save(order);
            return response("00", "Confirm success");
        }

        // 9. Late payment check (pay date after order expiry).
        if (order.getExpiredAt() != null && payDateUtc.isAfter(order.getExpiredAt())) {
            order.setStatus(PaymentStatus.REVIEW_REQUIRED);
            order.setReviewReason("PAY_DATE_AFTER_EXPIRY");
            order.setReviewRequiredAt(LocalDateTime.now(ZoneOffset.UTC));
            paymentOrderRepository.save(order);
            return response("00", "Confirm success");
        }
        order.setProviderPaidAt(payDateUtc);

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

        // 11. All checks passed — finalize.
        paymentOrderRepository.save(order);
        paymentService.finalizeSuccessfulPayment(order, targetTier);

        return response("00", "Confirm success");
    }

    private boolean isTerminal(String status) {
        return PaymentStatus.SUCCESS.equals(status)
                || PaymentStatus.FAILED.equals(status)
                || PaymentStatus.CANCELLED.equals(status);
    }

    private Map<String, String> response(String rspCode, String message) {
        Map<String, String> body = new LinkedHashMap<>();
        body.put("RspCode", rspCode);
        body.put("Message", message);
        return body;
    }
}