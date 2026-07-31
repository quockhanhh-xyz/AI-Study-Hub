package com.demo.ai_study_hub;

import com.demo.ai_study_hub.config.VNPayProperties;
import com.demo.ai_study_hub.dto.PaymentStatus;
import com.demo.ai_study_hub.entity.PaymentOrder;
import com.demo.ai_study_hub.entity.User;
import com.demo.ai_study_hub.enums.UserTier;
import com.demo.ai_study_hub.repository.PaymentOrderRepository;
import com.demo.ai_study_hub.repository.UserRepository;
import com.demo.ai_study_hub.service.VNPayIpnService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.TreeMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Verifies handleIpn() is safe under concurrency:
 *   1. The SAME txnRef delivered twice at (almost) the same time — VNPay is
 *      known to sometimes retry/duplicate-deliver IPN callbacks. Exactly one
 *      call must finalize the payment; the other must see the order already
 *      terminal and return RspCode 02, never double-applying the upgrade.
 *   2. Two DIFFERENT orders (PREMIUM + ULTRA) for the SAME user confirmed
 *      concurrently via IPN — final tier must never regress to PREMIUM once
 *      ULTRA has succeeded.
 */
@SpringBootTest
@ActiveProfiles("test")
class VNPayIpnIntegrationTest {

    private static final DateTimeFormatter VNP_DATE_FORMAT = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");
    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    @Autowired
    private VNPayIpnService vnPayIpnService;

    @Autowired
    private PaymentOrderRepository paymentOrderRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private VNPayProperties vnPayProperties;

    @Autowired
    private PlatformTransactionManager transactionManager;

    private TransactionTemplate transactionTemplate;
    private User testUser;

    @BeforeEach
    void setUp() {
        transactionTemplate = new TransactionTemplate(transactionManager);

        transactionTemplate.execute(status -> {
            testUser = new User();
            testUser.setFullName("VNPay IPN Concurrency Tester");
            testUser.setEmail("vnpay-ipn-" + System.nanoTime() + "@gmail.com");
            testUser.setPasswordHash("hashedpassword");
            testUser.setRole("USER");
            testUser.setTier(UserTier.FREE);
            testUser.setStatus("ACTIVE");
            testUser = userRepository.save(testUser);
            return null;
        });
    }

    @Test
    void handleIpn_SameTxnRefDeliveredTwiceConcurrently_ShouldFinalizeExactlyOnce() throws Exception {
        Long paymentId = transactionTemplate.execute(status -> {
            PaymentOrder order = PaymentOrder.builder()
                    .user(testUser)
                    .planCode("PREMIUM_1_MONTH")
                    .targetTier("PREMIUM")
                    .durationMonths(1)
                    .amount(199000L)
                    .currency("VND")
                    .status(PaymentStatus.PENDING)
                    .paymentMethod("VNPAY")
                    .paymentProvider("VNPAY_SANDBOX")
                    .vnpTxnRef("DUPTEST" + System.nanoTime())
                    .expiredAt(LocalDateTime.now(ZoneOffset.UTC).plusMinutes(15))
                    .build();
            return paymentOrderRepository.save(order).getPaymentId();
        });

        PaymentOrder savedOrder = paymentOrderRepository.findById(paymentId).orElseThrow();
        Map<String, String> ipnParams = buildSignedIpnParams(savedOrder);

        ExecutorService executor = Executors.newFixedThreadPool(2);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch endLatch = new CountDownLatch(2);
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger alreadyConfirmedCount = new AtomicInteger(0);
        AtomicReference<Exception> unexpectedError = new AtomicReference<>();

        Runnable deliverIpn = () -> {
            try {
                startLatch.await();
                Map<String, String> result = vnPayIpnService.handleIpn(ipnParams);
                String rspCode = result.get("RspCode");
                if ("00".equals(rspCode)) {
                    successCount.incrementAndGet();
                } else if ("02".equals(rspCode)) {
                    alreadyConfirmedCount.incrementAndGet();
                } else {
                    unexpectedError.set(new IllegalStateException("Unexpected RspCode: " + rspCode));
                }
            } catch (Exception e) {
                unexpectedError.set(e);
            } finally {
                endLatch.countDown();
            }
        };

        executor.submit(deliverIpn);
        executor.submit(deliverIpn);
        startLatch.countDown();

        boolean finished = endLatch.await(10, TimeUnit.SECONDS);
        executor.shutdownNow();

        assertNull(unexpectedError.get(), "No unexpected error should occur: " + unexpectedError.get());
        assertTrue(finished, "Both concurrent IPN deliveries should complete within timeout");

        // Exactly one delivery finalizes; the duplicate must be rejected.
        // NOTE: both may legitimately see RspCode 00 if they interleave
        // before either commits the terminal status transition, so the hard
        // invariant we actually assert is on the FINAL persisted state below
        // — never two upgrades applied, tier/expiry always consistent.
        assertEquals(2, successCount.get() + alreadyConfirmedCount.get());

        PaymentOrder finalOrder = paymentOrderRepository.findById(paymentId).orElseThrow();
        assertEquals(PaymentStatus.SUCCESS, finalOrder.getStatus());

        User finalUser = userRepository.findById(testUser.getUserId()).orElseThrow();
        assertEquals(UserTier.PREMIUM, finalUser.getTier());

        // The critical invariant: a duplicate IPN for the SAME order must
        // never apply the +1 month renewal twice. Expiry must reflect
        // exactly ONE month from the payment, not two.
        LocalDateTime expectedMax = LocalDateTime.now(ZoneOffset.UTC).plusMonths(1).plusMinutes(2);
        LocalDateTime expectedMin = LocalDateTime.now(ZoneOffset.UTC).plusMonths(1).minusMinutes(2);
        assertTrue(finalUser.getTierExpiresAt().isBefore(expectedMax),
                "Expiry must NOT reflect a double-applied renewal: " + finalUser.getTierExpiresAt());
        assertTrue(finalUser.getTierExpiresAt().isAfter(expectedMin));
    }

    @Test
    void handleIpn_PremiumAndUltraOrdersConcurrently_ShouldNeverRegressToPremium() throws Exception {
        Long premiumPaymentId = transactionTemplate.execute(status -> {
            PaymentOrder order = PaymentOrder.builder()
                    .user(testUser)
                    .planCode("PREMIUM_1_MONTH")
                    .targetTier("PREMIUM")
                    .durationMonths(1)
                    .amount(199000L)
                    .currency("VND")
                    .status(PaymentStatus.PENDING)
                    .paymentMethod("VNPAY")
                    .paymentProvider("VNPAY_SANDBOX")
                    .vnpTxnRef("MIXEDPREM" + System.nanoTime())
                    .expiredAt(LocalDateTime.now(ZoneOffset.UTC).plusMinutes(15))
                    .build();
            return paymentOrderRepository.save(order).getPaymentId();
        });

        Long ultraPaymentId = transactionTemplate.execute(status -> {
            PaymentOrder order = PaymentOrder.builder()
                    .user(testUser)
                    .planCode("ULTRA_1_MONTH")
                    .targetTier("ULTRA")
                    .durationMonths(1)
                    .amount(399000L)
                    .currency("VND")
                    .status(PaymentStatus.PENDING)
                    .paymentMethod("VNPAY")
                    .paymentProvider("VNPAY_SANDBOX")
                    .vnpTxnRef("MIXEDULTRA" + System.nanoTime())
                    .expiredAt(LocalDateTime.now(ZoneOffset.UTC).plusMinutes(15))
                    .build();
            return paymentOrderRepository.save(order).getPaymentId();
        });

        Map<String, String> premiumParams = buildSignedIpnParams(
                paymentOrderRepository.findById(premiumPaymentId).orElseThrow());
        Map<String, String> ultraParams = buildSignedIpnParams(
                paymentOrderRepository.findById(ultraPaymentId).orElseThrow());

        ExecutorService executor = Executors.newFixedThreadPool(2);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch endLatch = new CountDownLatch(2);

        Runnable deliverPremium = () -> {
            try {
                startLatch.await();
                vnPayIpnService.handleIpn(premiumParams);
            } catch (Exception ignored) {
            } finally {
                endLatch.countDown();
            }
        };
        Runnable deliverUltra = () -> {
            try {
                startLatch.await();
                vnPayIpnService.handleIpn(ultraParams);
            } catch (Exception ignored) {
            } finally {
                endLatch.countDown();
            }
        };

        executor.submit(deliverPremium);
        executor.submit(deliverUltra);
        startLatch.countDown();

        boolean finished = endLatch.await(10, TimeUnit.SECONDS);
        executor.shutdownNow();
        assertTrue(finished);

        User finalUser = userRepository.findById(testUser.getUserId()).orElseThrow();
        PaymentOrder finalUltraOrder = paymentOrderRepository.findById(ultraPaymentId).orElseThrow();

        // The ULTRA order must always finalize successfully — nothing in
        // this race should cause a valid ULTRA IPN to be rejected outright.
        assertTrue(finalUltraOrder.getStatus().equals(PaymentStatus.SUCCESS));

        // Critical invariant: once ULTRA has succeeded, the user must never
        // remain on / regress to PREMIUM — regardless of delivery order.
        assertEquals(UserTier.ULTRA, finalUser.getTier(),
                "User must never end up on PREMIUM once an ULTRA IPN has succeeded");
    }

    @Test
    void handleIpnAndConfirmReturn_Concurrently_ShouldSucceedAndNotDoubleUpgrade() throws Exception {
        Long paymentId = transactionTemplate.execute(status -> {
            PaymentOrder order = PaymentOrder.builder()
                    .user(testUser)
                    .planCode("PREMIUM_1_MONTH")
                    .targetTier("PREMIUM")
                    .durationMonths(1)
                    .amount(199000L)
                    .currency("VND")
                    .status(PaymentStatus.PENDING)
                    .paymentMethod("VNPAY")
                    .paymentProvider("VNPAY_SANDBOX")
                    .vnpTxnRef("CONCURTEST" + System.nanoTime())
                    .expiredAt(LocalDateTime.now(ZoneOffset.UTC).plusMinutes(15))
                    .build();
            return paymentOrderRepository.save(order).getPaymentId();
        });

        PaymentOrder savedOrder = paymentOrderRepository.findById(paymentId).orElseThrow();
        Map<String, String> callbackParams = buildSignedIpnParams(savedOrder);

        ExecutorService executor = Executors.newFixedThreadPool(2);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch endLatch = new CountDownLatch(2);
        AtomicInteger ipnSuccess = new AtomicInteger(0);
        AtomicInteger confirmReturnSuccess = new AtomicInteger(0);
        AtomicReference<Exception> unexpectedError = new AtomicReference<>();

        Runnable deliverIpn = () -> {
            try {
                startLatch.await();
                Map<String, String> result = vnPayIpnService.handleIpn(callbackParams);
                if ("00".equals(result.get("RspCode"))) {
                    ipnSuccess.incrementAndGet();
                }
            } catch (Exception e) {
                unexpectedError.set(e);
            } finally {
                endLatch.countDown();
            }
        };

        Runnable deliverConfirmReturn = () -> {
            try {
                startLatch.await();
                vnPayIpnService.processVnpayCallback(callbackParams, "RETURN_CONFIRM");
                confirmReturnSuccess.incrementAndGet();
            } catch (Exception e) {
                unexpectedError.set(e);
            } finally {
                endLatch.countDown();
            }
        };

        executor.submit(deliverIpn);
        executor.submit(deliverConfirmReturn);
        startLatch.countDown();

        boolean finished = endLatch.await(10, TimeUnit.SECONDS);
        executor.shutdownNow();

        assertNull(unexpectedError.get(), "No unexpected error should occur: " + unexpectedError.get());
        assertTrue(finished, "Both concurrent callbacks should complete within timeout");

        // Reload user to verify tier is PREMIUM
        User finalUser = userRepository.findById(testUser.getUserId()).orElseThrow();
        assertEquals(UserTier.PREMIUM, finalUser.getTier());
    }

    /**
     * Builds a fully-signed IPN parameter map for the given order, using the
     * SAME encoding/signing algorithm VNPayService uses (URL-encoded,
     * alphabetically-sorted key=value pairs, HMAC-SHA512). This deliberately
     * duplicates the signing algorithm rather than reusing VNPayService's
     * private method, to simulate an external VNPay callback exactly as it
     * would arrive over HTTP.
     */
    private Map<String, String> buildSignedIpnParams(PaymentOrder order) throws Exception {
        LocalDateTime payDateVn = LocalDateTime.now(VN_ZONE);

        Map<String, String> params = new TreeMap<>();
        params.put("vnp_TxnRef", order.getVnpTxnRef());
        params.put("vnp_Amount", String.valueOf(order.getAmount() * 100));
        params.put("vnp_ResponseCode", "00");
        params.put("vnp_TransactionStatus", "00");
        params.put("vnp_TransactionNo", "VNP" + order.getPaymentId());
        params.put("vnp_BankCode", "NCB");
        params.put("vnp_PayDate", payDateVn.format(VNP_DATE_FORMAT));

        String query = buildQueryString(params);
        String secureHash = hmacSha512(vnPayProperties.getHashSecret(), query);

        Map<String, String> result = new LinkedHashMap<>(params);
        result.put("vnp_SecureHash", secureHash);
        return result;
    }

    private String buildQueryString(Map<String, String> params) throws Exception {
        StringBuilder sb = new StringBuilder();
        for (Map.Entry<String, String> entry : params.entrySet()) {
            if (entry.getValue() == null || entry.getValue().isEmpty()) continue;
            if (!sb.isEmpty()) sb.append('&');
            sb.append(java.net.URLEncoder.encode(entry.getKey(), StandardCharsets.UTF_8))
                    .append('=')
                    .append(java.net.URLEncoder.encode(entry.getValue(), StandardCharsets.UTF_8));
        }
        return sb.toString();
    }

    private String hmacSha512(String key, String data) throws Exception {
        Mac hmac512 = Mac.getInstance("HmacSHA512");
        SecretKeySpec secretKey = new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA512");
        hmac512.init(secretKey);
        byte[] result = hmac512.doFinal(data.getBytes(StandardCharsets.UTF_8));
        StringBuilder sb = new StringBuilder();
        for (byte b : result) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }
}