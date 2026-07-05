package com.demo.ai_study_hub;

import com.demo.ai_study_hub.dto.PaymentStatus;
import com.demo.ai_study_hub.dto.PlanCode;
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
                    .planCode(PlanCode.PREMIUM)
                    .amount(199000L)
                    .currency("VND")
                    .status(PaymentStatus.PENDING)
                    .paymentMethod("MOCK")
                    .build();
            return paymentOrderRepository.save(order).getPaymentId();
        });

        Long orderId2 = transactionTemplate.execute(status -> {
            PaymentOrder order = PaymentOrder.builder()
                    .user(testUser)
                    .planCode(PlanCode.PREMIUM)
                    .amount(199000L)
                    .currency("VND")
                    .status(PaymentStatus.PENDING)
                    .paymentMethod("MOCK")
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

        LocalDateTime before = LocalDateTime.now();
        executor.submit(confirmOrder1);
        executor.submit(confirmOrder2);
        startLatch.countDown();

        boolean finished = endLatch.await(10, TimeUnit.SECONDS);
        executor.shutdownNow();
        LocalDateTime after = LocalDateTime.now();

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
}