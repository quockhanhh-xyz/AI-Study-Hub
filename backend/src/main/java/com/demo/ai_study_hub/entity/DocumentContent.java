package com.demo.ai_study_hub.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "document_contents", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"document_id"})
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentContent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "content_id")
    private Long contentId;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "document_id", nullable = false, foreignKey = @ForeignKey(name = "fk_doc_contents_doc", foreignKeyDefinition = "FOREIGN KEY (document_id) REFERENCES documents(document_id) ON DELETE CASCADE"))
    private Document document;

    @Lob
    @Column(name = "extracted_text", columnDefinition = "LONGTEXT")
    private String extractedText;

    @Enumerated(EnumType.STRING)
    @Column(name = "processing_status", nullable = false, length = 30)
    private ProcessingStatus processingStatus;

    @Column(name = "character_count", nullable = false)
    @Builder.Default
    private Integer characterCount = 0;

    @Column(name = "original_character_count", nullable = false)
    @Builder.Default
    private Integer originalCharacterCount = 0;

    @Column(name = "word_count", nullable = false)
    @Builder.Default
    private Integer wordCount = 0;

    @Column(name = "is_truncated", nullable = false)
    @Builder.Default
    private Boolean isTruncated = false;

    @Column(name = "processing_started_at")
    private LocalDateTime processingStartedAt;

    @Column(name = "processed_at")
    private LocalDateTime processedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "last_attempt_status", length = 30)
    private ProcessingStatus lastAttemptStatus;

    @Column(name = "last_attempt_error", length = 1000)
    private String lastAttemptError;

    @Column(name = "last_attempted_at")
    private LocalDateTime lastAttemptedAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Version
    @Column(name = "version", nullable = false)
    @Builder.Default
    private Long version = 0L;
}
