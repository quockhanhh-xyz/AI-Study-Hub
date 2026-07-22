package com.demo.ai_study_hub.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "document_reports", indexes = {
    @Index(name = "idx_doc_report_doc_id", columnList = "document_id"),
    @Index(name = "idx_doc_report_reporter_id", columnList = "reporter_id"),
    @Index(name = "idx_doc_report_status", columnList = "status")
})
@Data
@NoArgsConstructor
public class DocumentReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long reportId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "document_id", nullable = false)
    private Document document;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reporter_id", nullable = false)
    private User reporter;

    @Column(nullable = false, length = 50)
    private String reason;

    @Column(columnDefinition = "TEXT", length = 500)
    private String description;

    @Column(nullable = false, length = 20)
    private String status = "PENDING"; // PENDING, RESOLVED, DISMISSED

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "resolved_by")
    private User resolvedBy;

    @Column(columnDefinition = "TEXT", length = 1000)
    private String resolutionNote;

    @Column(nullable = false, updatable = false)
    @CreationTimestamp
    private LocalDateTime createdAt;

    @Column
    private LocalDateTime resolvedAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
