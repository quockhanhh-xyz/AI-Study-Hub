package com.demo.ai_study_hub.repository;

import com.demo.ai_study_hub.entity.PaymentOrder;
import com.demo.ai_study_hub.entity.User;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

@Repository
public interface PaymentOrderRepository extends JpaRepository<PaymentOrder, Long>, JpaSpecificationExecutor<PaymentOrder> {

    List<PaymentOrder> findByStatus(String status);

    long countByStatus(String status);

    @Query("SELECT SUM(p.amount) FROM PaymentOrder p WHERE p.status = 'SUCCESS'")
    Long sumSuccessfulRevenue();

    @Query("SELECT COALESCE(p.paidAt, p.createdAt), p.amount FROM PaymentOrder p WHERE p.status = 'SUCCESS'")
    List<Object[]> findSuccessPaymentDatesAndAmounts();

    List<PaymentOrder> findByUserOrderByCreatedAtDesc(User user);

    Optional<PaymentOrder> findByPaymentIdAndUser(Long paymentId, User user);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM PaymentOrder p WHERE p.paymentId = :paymentId AND p.user = :user")
    Optional<PaymentOrder> findByPaymentIdAndUserForUpdate(
            @Param("paymentId") Long paymentId,
            @Param("user") User user);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM PaymentOrder p WHERE p.paymentId = :paymentId")
    Optional<PaymentOrder> findByIdForUpdate(@Param("paymentId") Long paymentId);

    Optional<PaymentOrder> findByVnpTxnRef(String vnpTxnRef);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM PaymentOrder p WHERE p.vnpTxnRef = :vnpTxnRef")
    Optional<PaymentOrder> findByVnpTxnRefForUpdate(@Param("vnpTxnRef") String vnpTxnRef);

    /** Any currently-active pending order for this user, locked for update. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM PaymentOrder p WHERE p.user = :user AND p.status = 'PENDING' " +
            "AND (p.expiredAt IS NULL OR p.expiredAt > :now) ORDER BY p.createdAt DESC")
    List<PaymentOrder> findActivePendingForUpdate(@Param("user") User user, @Param("now") LocalDateTime now);

    /** Stale PENDING orders (past expiry) for this user, locked so they can be flipped to EXPIRED. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM PaymentOrder p WHERE p.user = :user AND p.status = 'PENDING' " +
            "AND p.expiredAt IS NOT NULL AND p.expiredAt <= :now")
    List<PaymentOrder> findStalePendingForUpdate(@Param("user") User user, @Param("now") LocalDateTime now);

    @Query("SELECT p FROM PaymentOrder p WHERE p.user = :user AND p.status = 'REVIEW_REQUIRED' " +
            "ORDER BY p.createdAt DESC")
    List<PaymentOrder> findUnresolvedReviewForUser(@Param("user") User user);
}