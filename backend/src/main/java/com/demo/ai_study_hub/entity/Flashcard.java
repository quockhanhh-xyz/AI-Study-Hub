package com.demo.ai_study_hub.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "flashcards")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Flashcard {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "flashcard_id")
    private Long flashcardId;

    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "flashcard_set_id", nullable = false)
    private FlashcardSet flashcardSet;

    @Lob
    @Column(name = "front_text", nullable = false, columnDefinition = "TEXT")
    private String frontText;

    @Lob
    @Column(name = "back_text", nullable = false, columnDefinition = "TEXT")
    private String backText;

    @Column(name = "source_page")
    private Integer sourcePage;

    /** EASY | MEDIUM | HARD, nullable per schema */
    @Column(name = "difficulty", length = 20)
    private String difficulty;

    @Column(name = "position", nullable = false)
    private Integer position;
}