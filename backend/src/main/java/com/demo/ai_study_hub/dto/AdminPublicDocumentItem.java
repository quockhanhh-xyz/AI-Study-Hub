package com.demo.ai_study_hub.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminPublicDocumentItem {
    private Integer documentId;
    private String title;
    private String ownerEmail;
    private String subject;
    private String fileType;
    private String visibility;
    private String approvalStatus;
    private String processingStatus;
    private long viewCount;
    private long downloadCount;
    private Instant createdAt;
    private Instant publishedAt;
}
