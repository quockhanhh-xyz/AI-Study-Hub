package com.demo.ai_study_hub.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "quiz_attempt_answers")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuizAttemptAnswer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "attempt_answer_id")
    private Long attemptAnswerId;

    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "attempt_id", nullable = false)
    private QuizAttempt quizAttempt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", nullable = false)
    private QuizQuestion quizQuestion;

    @Column(name = "selected_option", length = 10)
    private String selectedOption;

    @Column(name = "correct_option", nullable = false, length = 10)
    private String correctOption;

    @Column(name = "is_correct", nullable = false)
    private Boolean isCorrect;

    @Column(name = "answered_at")
    private LocalDateTime answeredAt;
}
