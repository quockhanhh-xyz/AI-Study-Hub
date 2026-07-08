package com.demo.ai_study_hub.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "ai_summaries")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiSummary {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "summary_id")
    private Long summaryId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "document_id", nullable = false)
    private Document document;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", referencedColumnName = "user_id", nullable = false)
    private User user;

    @Lob
    @Column(name = "overview", nullable = false, columnDefinition = "TEXT")
    private String overview;

    /** JSON array of strings: ["point 1", "point 2", ...] */
    @Lob
    @Column(name = "key_points_json", nullable = false, columnDefinition = "TEXT")
    private String keyPointsJson;

    /** JSON array of {term, definition} objects */
    @Lob
    @Column(name = "important_terms_json", nullable = false, columnDefinition = "TEXT")
    private String importantTermsJson;

    /** JSON array of strings */
    @Lob
    @Column(name = "review_questions_json", nullable = false, columnDefinition = "TEXT")
    private String reviewQuestionsJson;

    @Column(name = "model", nullable = false, length = 100)
    private String model;

    /** SUCCESS is the only status ever persisted — failed attempts are never saved. */
    @Column(name = "status", nullable = false, length = 30)
    private String status;

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
}