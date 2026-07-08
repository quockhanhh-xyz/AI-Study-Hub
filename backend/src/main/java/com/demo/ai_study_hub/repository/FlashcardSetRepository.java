package com.demo.ai_study_hub.repository;

import com.demo.ai_study_hub.entity.FlashcardSet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface FlashcardSetRepository extends JpaRepository<FlashcardSet, Long> {

    List<FlashcardSet> findByDocument_DocumentIdAndUser_UserIdOrderByCreatedAtDesc(
            Integer documentId, Integer userId);

    Optional<FlashcardSet> findByFlashcardSetIdAndUser_UserId(Long flashcardSetId, Integer userId);

    @Query("SELECT COUNT(f) FROM FlashcardSet f WHERE f.user.userId = :userId " +
            "AND f.createdAt >= :startOfDay AND f.createdAt < :startOfNextDay")
    long countByUserAndCreatedAtBetween(@Param("userId") Integer userId,
                                        @Param("startOfDay") LocalDateTime startOfDay,
                                        @Param("startOfNextDay") LocalDateTime startOfNextDay);
}