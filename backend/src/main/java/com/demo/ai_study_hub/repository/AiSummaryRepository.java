package com.demo.ai_study_hub.repository;

import com.demo.ai_study_hub.entity.AiSummary;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface AiSummaryRepository extends JpaRepository<AiSummary, Long> {

    Optional<AiSummary> findByDocument_DocumentIdAndUser_UserIdOrderByCreatedAtDesc(
            Integer documentId, Integer userId);

    List<AiSummary> findByDocument_DocumentIdAndUser_UserIdOrderByCreatedAtDesc(
            Integer documentId, Integer userId, org.springframework.data.domain.Pageable pageable);

    Optional<AiSummary> findBySummaryIdAndUser_UserId(Long summaryId, Integer userId);

    @Query("SELECT COUNT(s) FROM AiSummary s WHERE s.user.userId = :userId " +
            "AND s.createdAt >= :startOfDay AND s.createdAt < :startOfNextDay")
    long countByUserAndCreatedAtBetween(@Param("userId") Integer userId,
                                        @Param("startOfDay") LocalDateTime startOfDay,
                                        @Param("startOfNextDay") LocalDateTime startOfNextDay);
}