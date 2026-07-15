package com.demo.ai_study_hub.repository;

import com.demo.ai_study_hub.entity.QuizAttempt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface QuizAttemptRepository extends JpaRepository<QuizAttempt, Long> {

    List<QuizAttempt> findByQuizSet_QuizSetIdAndUser_UserIdOrderByCreatedAtDesc(Long quizSetId, Integer userId);

    Optional<QuizAttempt> findFirstByQuizSet_QuizSetIdAndUser_UserIdOrderByCreatedAtDesc(Long quizSetId, Integer userId);

    Optional<QuizAttempt> findFirstByQuizSet_QuizSetIdAndUser_UserIdOrderByPercentageDescCreatedAtDesc(Long quizSetId, Integer userId);
}
