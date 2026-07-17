package com.demo.ai_study_hub.repository;

import com.demo.ai_study_hub.entity.AiUsageLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

@Repository
public interface AiUsageLogRepository extends JpaRepository<AiUsageLog, Long>, JpaSpecificationExecutor<AiUsageLog> {

    /**
     * Count successful AI questions used by a user since a given timestamp.
     * Used for daily quota enforcement.
     * Only counts entries where countedAsQuestion=true and status=SUCCESS.
     */
    @Query("SELECT COUNT(l) FROM AiUsageLog l " +
           "WHERE l.user.userId = :userId " +
           "AND l.countedAsQuestion = true " +
           "AND l.status = 'SUCCESS' " +
           "AND l.createdAt >= :since")
    long countSuccessfulQuestionsAfter(
            @Param("userId") Integer userId,
            @Param("since") LocalDateTime since);

    @Query("SELECT COUNT(l) FROM AiUsageLog l " +
           "WHERE l.user.userId = :userId " +
           "AND l.requestType = :requestType " +
           "AND l.status = 'SUCCESS' " +
           "AND l.createdAt >= :since")
    long countSuccessfulLogsByTypeAfter(
            @Param("userId") Integer userId,
            @Param("requestType") String requestType,
            @Param("since") LocalDateTime since);

    @Query("SELECT l.requestType, COUNT(l) FROM AiUsageLog l WHERE l.status = 'SUCCESS' GROUP BY l.requestType")
    List<Object[]> countUsageByRequestType();

    @Query("SELECT COUNT(l) FROM AiUsageLog l WHERE l.status = 'SUCCESS' AND l.createdAt >= :since")
    long countSuccessfulLogsAfter(@Param("since") LocalDateTime since);
}
