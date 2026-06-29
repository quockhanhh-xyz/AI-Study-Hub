package com.demo.ai_study_hub.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "document_chunks", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"document_id", "chunk_index"})
}, indexes = {
    @Index(name = "idx_doc_chunks_doc_id", columnList = "document_id")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentChunk {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "chunk_id")
    private Long chunkId;

    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "document_id", nullable = false, foreignKey = @ForeignKey(name = "fk_doc_chunks_doc", foreignKeyDefinition = "FOREIGN KEY (document_id) REFERENCES documents(document_id) ON DELETE CASCADE"))
    private Document document;

    @Column(name = "chunk_index", nullable = false)
    private Integer chunkIndex;

    @Lob
    @Column(name = "chunk_text", nullable = false, columnDefinition = "LONGTEXT")
    private String chunkText;

    @Column(name = "character_count", nullable = false)
    private Integer characterCount;

    @Column(name = "page_number")
    private Integer pageNumber;

    @Column(name = "source_label", length = 255)
    private String sourceLabel;

    @Column(name = "start_offset")
    private Integer startOffset;

    @Column(name = "end_offset")
    private Integer endOffset;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
