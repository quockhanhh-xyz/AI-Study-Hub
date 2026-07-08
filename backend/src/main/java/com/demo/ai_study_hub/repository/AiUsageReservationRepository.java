package com.demo.ai_study_hub.repository;

import com.demo.ai_study_hub.entity.AiUsageReservation;
import com.demo.ai_study_hub.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import jakarta.persistence.LockModeType;
import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface AiUsageReservationRepository extends JpaRepository<AiUsageReservation, Long> {

    @Query("SELECT COUNT(r) FROM AiUsageReservation r WHERE r.user = :user " +
           "AND r.status = 'RESERVED' AND r.expiresAt > :now")
    long countActiveReservations(
            @Param("user") User user,
            @Param("now") LocalDateTime now);

    @Query("SELECT COUNT(r) FROM AiUsageReservation r WHERE r.user = :user " +
           "AND r.requestType = :requestType AND r.status = 'RESERVED' AND r.expiresAt > :now")
    long countActiveReservationsByType(
            @Param("user") User user,
            @Param("requestType") String requestType,
            @Param("now") LocalDateTime now);

    Optional<AiUsageReservation> findByRequestId(String requestId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM AiUsageReservation r WHERE r.requestId = :requestId")
    Optional<AiUsageReservation> findByRequestIdForUpdate(@Param("requestId") String requestId);
}
