package com.demo.ai_study_hub.repository;

import com.demo.ai_study_hub.entity.FlashcardAttempt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FlashcardAttemptRepository extends JpaRepository<FlashcardAttempt, Long> {
    List<FlashcardAttempt> findByFlashcardSet_SetIdAndUser_UserIdOrderByCompletedAtDesc(Long setId, Integer userId);
    
    FlashcardAttempt findFirstByFlashcardSet_SetIdAndUser_UserIdOrderByCompletedAtDesc(Long setId, Integer userId);
}
