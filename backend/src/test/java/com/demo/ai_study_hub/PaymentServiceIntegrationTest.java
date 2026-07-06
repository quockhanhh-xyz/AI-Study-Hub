package com.demo.ai_study_hub;

import com.demo.ai_study_hub.dto.PaymentStatus;
import com.demo.ai_study_hub.dto.PlanCode;
import com.demo.ai_study_hub.dto.PaymentProvider;
import com.demo.ai_study_hub.entity.PaymentOrder;
import com.demo.ai_study_hub.entity.User;
import com.demo.ai_study_hub.enums.UserTier;
import com.demo.ai_study_hub.repository.PaymentOrderRepository;
import com.demo.ai_study_hub.repository.UserRepository;
import com.demo.ai_study_hub.service.PaymentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Verifies markPaymentSuccess() is safe under concurrency when TWO DIFFERENT
 * payment orders for the SAME user are confirmed at (almost) the same time.
 *
 * findByPaymentIdAndUserForUpdate() alone only locks a single order row, so
 * two different orders can both pass that check simultaneously. The user-row
 * lock (findByIdForUpdate) inside markPaymentSuccess is what must serialize
 * the two transactions so neither one computes tierExpiresAt from a stale
 * snapshot (a "lost update").
 *
 * Expected outcome for two successful PREMIUM renewals fired concurrently:
 * both payments end up SUCCESS, and the final tierExpiresAt reflects BOTH
 * one-month extensions (~now + 2 months), never just one.
 */
@SpringBootTest
@ActiveProfiles("test")
class PaymentServiceIntegrationTest {

    @Autowired
    private PaymentService paymentService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PaymentOrderRepository paymentOrderRepository;

    @Autowired
    private PlatformTransactionManager transactionManager;

    private TransactionTemplate transactionTemplate;
    private User testUser;

    @BeforeEach
    void setUp() {
        transactionTemplate = new TransactionTemplate(transactionManager);

        transactionTemplate.execute(status -> {
            // NOTE: do NOT deleteAllInBatch() here — this test shares the H2
            // context with other @SpringBootTest integration tests (e.g.
            // DocumentProcessingIntegrationTest), which may still have rows
            // referencing existing users via FK. Using a unique email per
            // run avoids collisions without touching other tests' data.
            testUser = new User();
            testUser.setFullName("Concurrency Tester");
            testUser.setEmail("concurrency-" + System.nanoTime() + "@gmail.com");
            testUser.setPasswordHash("hashedpassword");
            testUser.setRole("USER");
            testUser.setTier(UserTier.FREE);
            testUser.setStatus("ACTIVE");
            testUser = userRepository.save(testUser);

            return null;
        });
    }

    @Test
    void markPaymentSuccess_TwoDifferentOrdersConcurrently_ShouldNotLoseAnExtension() throws Exception {
        Long orderId1 = transactionTemplate.execute(status -> {
            PaymentOrder order = PaymentOrder.builder()
                    .user(testUser)
                    .planCode(PlanCode.PREMIUM_1_MONTH)
                    .amount(199000L)
                    .currency("VND")
                    .status(PaymentStatus.PENDING)
                    .paymentMethod("MOCK")
                    .paymentProvider(PaymentProvider.MOCK)
                    .build();
            return paymentOrderRepository.save(order).getPaymentId();
        });

        Long orderId2 = transactionTemplate.execute(status -> {
            PaymentOrder order = PaymentOrder.builder()
                    .user(testUser)
                    .planCode(PlanCode.PREMIUM_1_MONTH)
                    .amount(199000L)
                    .currency("VND")
                    .status(PaymentStatus.PENDING)
                    .paymentMethod("MOCK")
                    .paymentProvider(PaymentProvider.MOCK)
                    .build();
            return paymentOrderRepository.save(order).getPaymentId();
        });

        ExecutorService executor = Executors.newFixedThreadPool(2);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch endLatch = new CountDownLatch(2);
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger errorCount = new AtomicInteger(0);

        Runnable confirmOrder1 = () -> {
            try {
                startLatch.await();
                User user = userRepository.findById(testUser.getUserId()).orElseThrow();
                paymentService.markPaymentSuccess(user, orderId1);
                successCount.incrementAndGet();
            } catch (Exception e) {
                errorCount.incrementAndGet();
            } finally {
                endLatch.countDown();
            }
        };

        Runnable confirmOrder2 = () -> {
            try {
                startLatch.await();
                User user = userRepository.findById(testUser.getUserId()).orElseThrow();
                paymentService.markPaymentSuccess(user, orderId2);
                successCount.incrementAndGet();
            } catch (Exception e) {
                errorCount.incrementAndGet();
            } finally {
                endLatch.countDown();
            }
        };

        LocalDateTime before = LocalDateTime.now(ZoneOffset.UTC);
        executor.submit(confirmOrder1);
        executor.submit(confirmOrder2);
        startLatch.countDown();

        boolean finished = endLatch.await(10, TimeUnit.SECONDS);
        executor.shutdownNow();
        LocalDateTime after = LocalDateTime.now(ZoneOffset.UTC);

        assertTrue(finished, "Both concurrent confirmations should complete within timeout");
        assertEquals(2, successCount.get(), "Both independent payment orders should succeed");
        assertEquals(0, errorCount.get(), "Neither confirmation should throw");

        PaymentOrder finalOrder1 = paymentOrderRepository.findById(orderId1).orElseThrow();
        PaymentOrder finalOrder2 = paymentOrderRepository.findById(orderId2).orElseThrow();
        assertEquals(PaymentStatus.SUCCESS, finalOrder1.getStatus());
        assertEquals(PaymentStatus.SUCCESS, finalOrder2.getStatus());

        User finalUser = userRepository.findById(testUser.getUserId()).orElseThrow();
        assertEquals(UserTier.PREMIUM, finalUser.getTier());
        assertNotNull(finalUser.getTierExpiresAt());

        // Two sequential one-month renewals must both be applied — the
        // final expiry must be close to now + 2 months, NOT now + 1 month
        // (which would mean one renewal silently overwrote the other).
        LocalDateTime minExpected = before.plusMonths(2).minusMinutes(2);
        LocalDateTime maxExpected = after.plusMonths(2).plusMinutes(2);
        assertTrue(finalUser.getTierExpiresAt().isAfter(minExpected),
                "Expected expiry after " + minExpected + " but was " + finalUser.getTierExpiresAt());
        assertTrue(finalUser.getTierExpiresAt().isBefore(maxExpected),
                "Expected expiry before " + maxExpected + " but was " + finalUser.getTierExpiresAt());
    }

    /**
     * Mixed-tier concurrency case: one PREMIUM order and one ULTRA order for
     * the same user confirmed at (almost) the same time.
     *
     * The outcome is intentionally order-dependent (documented, not a bug):
     *   - If PREMIUM commits first, the user becomes PREMIUM, then ULTRA
     *     commits and upgrades to ULTRA (expiry reset to now + 1 month per
     *     the upgrade rule). Final tier = ULTRA, PREMIUM order still SUCCESS.
     *   - If ULTRA commits first, the user becomes ULTRA. The PREMIUM
     *     transaction then blocks on the user lock, re-reads the now-ULTRA
     *     effective tier, and is correctly rejected as a downgrade (409).
     *     That PREMIUM order remains PENDING.
     *
     * Either outcome is acceptable: what must NEVER happen is the user
     * ending up on PREMIUM after an ULTRA payment succeeded (a real
     * downgrade slipping through), or both transactions silently
     * succeeding with inconsistent final state.
     */
    @Test
    void markPaymentSuccess_PremiumAndUltraOrdersConcurrently_ShouldNeverEndOnADowngrade() throws Exception {
        Long premiumOrderId = transactionTemplate.execute(status -> {
            PaymentOrder order = PaymentOrder.builder()
                    .user(testUser)
                    .planCode(PlanCode.PREMIUM_1_MONTH)
                    .amount(199000L)
                    .currency("VND")
                    .status(PaymentStatus.PENDING)
                    .paymentMethod("MOCK")
                    .paymentProvider(PaymentProvider.MOCK)
                    .build();
            return paymentOrderRepository.save(order).getPaymentId();
        });

        Long ultraOrderId = transactionTemplate.execute(status -> {
            PaymentOrder order = PaymentOrder.builder()
                    .user(testUser)
                    .planCode(PlanCode.ULTRA_1_MONTH)
                    .amount(399000L)
                    .currency("VND")
                    .status(PaymentStatus.PENDING)
                    .paymentMethod("MOCK")
                    .paymentProvider(PaymentProvider.MOCK)
                    .build();
            return paymentOrderRepository.save(order).getPaymentId();
        });

        ExecutorService executor = Executors.newFixedThreadPool(2);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch endLatch = new CountDownLatch(2);

        Runnable confirmPremium = () -> {
            try {
                startLatch.await();
                User user = userRepository.findById(testUser.getUserId()).orElseThrow();
                paymentService.markPaymentSuccess(user, premiumOrderId);
            } catch (Exception ignored) {
                // Expected possible outcome: rejected as a downgrade if ULTRA won the race.
            } finally {
                endLatch.countDown();
            }
        };

        Runnable confirmUltra = () -> {
            try {
                startLatch.await();
                User user = userRepository.findById(testUser.getUserId()).orElseThrow();
                paymentService.markPaymentSuccess(user, ultraOrderId);
            } catch (Exception ignored) {
                // Should not normally happen for a valid ULTRA order, but
                // don't let a stray failure hang the test.
            } finally {
                endLatch.countDown();
            }
        };

        executor.submit(confirmPremium);
        executor.submit(confirmUltra);
        startLatch.countDown();

        boolean finished = endLatch.await(10, TimeUnit.SECONDS);
        executor.shutdownNow();

        assertTrue(finished, "Both concurrent confirmations should complete within timeout");

        PaymentOrder finalUltraOrder = paymentOrderRepository.findById(ultraOrderId).orElseThrow();
        PaymentOrder finalPremiumOrder = paymentOrderRepository.findById(premiumOrderId).orElseThrow();
        User finalUser = userRepository.findById(testUser.getUserId()).orElseThrow();

        // The ULTRA order must always end up SUCCESS regardless of ordering —
        // nothing in this scenario should ever cause a valid ULTRA purchase
        // to fail.
        assertEquals(PaymentStatus.SUCCESS, finalUltraOrder.getStatus());

        // The critical invariant: the user must never end up on PREMIUM
        // while an ULTRA payment has succeeded. Final tier must be ULTRA.
        assertEquals(UserTier.ULTRA, finalUser.getTier(),
                "User must never remain on/downgrade to PREMIUM once an ULTRA payment has succeeded");

        // The PREMIUM order either succeeded (if it committed first and was
        // later superseded by the ULTRA upgrade) or was correctly rejected
        // as a downgrade attempt (if ULTRA committed first). Both are valid;
        // an unhandled exception or a status other than these two is not.
        assertTrue(
                finalPremiumOrder.getStatus().equals(PaymentStatus.SUCCESS)
                        || finalPremiumOrder.getStatus().equals(PaymentStatus.PENDING),
                "Premium order must end up either SUCCESS (won the race) or still PENDING (rejected as downgrade), was: "
                        + finalPremiumOrder.getStatus()
        );
    }
}