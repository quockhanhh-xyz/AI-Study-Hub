package com.demo.ai_study_hub.entity;

import jakarta.persistence.*;
import lombok.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "quiz_questions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuizQuestion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "question_id")
    private Long questionId;

    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "quiz_set_id", nullable = false)
    private QuizSet quizSet;

    @Lob
    @Column(name = "question_text", nullable = false, columnDefinition = "TEXT")
    private String questionText;

    /** A | B | C | D */
    @Column(name = "correct_option", nullable = false, length = 1)
    private String correctOption;

    @Lob
    @Column(name = "explanation", nullable = false, columnDefinition = "TEXT")
    private String explanation;

    /** EASY | MEDIUM | HARD */
    @Column(name = "difficulty", nullable = false, length = 20)
    private String difficulty;

    @Column(name = "position", nullable = false)
    private Integer position;

    @ToString.Exclude
    @Builder.Default
    @OneToMany(mappedBy = "question", fetch = FetchType.LAZY, cascade = CascadeType.ALL, orphanRemoval = true)
    private List<QuizOption> options = new ArrayList<>();
}