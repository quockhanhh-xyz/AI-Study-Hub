package com.demo.ai_study_hub.repository;

import com.demo.ai_study_hub.entity.QuizSet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface QuizSetRepository extends JpaRepository<QuizSet, Long> {

    List<QuizSet> findByDocument_DocumentIdAndUser_UserIdOrderByCreatedAtDesc(
            Integer documentId, Integer userId);

    Optional<QuizSet> findByQuizSetIdAndUser_UserId(Long quizSetId, Integer userId);

    @Query("SELECT COUNT(q) FROM QuizSet q WHERE q.user.userId = :userId " +
            "AND q.createdAt >= :startOfDay AND q.createdAt < :startOfNextDay")
    long countByUserAndCreatedAtBetween(@Param("userId") Integer userId,
                                        @Param("startOfDay") LocalDateTime startOfDay,
                                        @Param("startOfNextDay") LocalDateTime startOfNextDay);
}