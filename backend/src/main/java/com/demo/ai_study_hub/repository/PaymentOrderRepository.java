package com.demo.ai_study_hub.repository;

import com.demo.ai_study_hub.entity.PaymentOrder;
import com.demo.ai_study_hub.entity.User;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentOrderRepository extends JpaRepository<PaymentOrder, Long> {

    List<PaymentOrder> findByUserOrderByCreatedAtDesc(User user);

    Optional<PaymentOrder> findByPaymentIdAndUser(Long paymentId, User user);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM PaymentOrder p WHERE p.paymentId = :paymentId AND p.user = :user")
    Optional<PaymentOrder> findByPaymentIdAndUserForUpdate(
            @Param("paymentId") Long paymentId,
            @Param("user") User user);
}
