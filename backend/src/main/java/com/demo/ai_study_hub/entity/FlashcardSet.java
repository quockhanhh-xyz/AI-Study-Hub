package com.demo.ai_study_hub.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "flashcard_sets")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FlashcardSet {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "flashcard_set_id")
    private Long flashcardSetId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "document_id", nullable = false)
    private Document document;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", referencedColumnName = "user_id", nullable = false)
    private User user;

    @Column(name = "title", nullable = false, length = 255)
    private String title;

    @Column(name = "item_count", nullable = false)
    private Integer itemCount;

    @Column(name = "model", nullable = false, length = 100)
    private String model;

    @Column(name = "source_processed_at")
    private LocalDateTime sourceProcessedAt;

    @Column(name = "source_chunk_count", nullable = false)
    private Integer sourceChunkCount;

    @Column(name = "content_version", length = 50)
    private String contentVersion;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @ToString.Exclude
    @Builder.Default
    @OneToMany(mappedBy = "flashcardSet", fetch = FetchType.LAZY, cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Flashcard> flashcards = new ArrayList<>();
}