package com.demo.ai_study_hub.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PublicDocumentResponse {
    private Integer documentId;
    private String title;
    private String description;
    private Integer subjectId;
    private String subjectCode;
    private String subjectName;
    private String fileType;
    private Long fileSize;
    private String fileUrl;
    private String visibility;
    private String approvalStatus;
    private LocalDateTime publishedAt;
    private Long viewCount;
    private Long downloadCount;
    private LocalDateTime createdAt;
    private String ownerName;
    private String displayName;

    private Boolean canPreview;
    private Boolean canOpen;
    private Boolean canDownload;
}
