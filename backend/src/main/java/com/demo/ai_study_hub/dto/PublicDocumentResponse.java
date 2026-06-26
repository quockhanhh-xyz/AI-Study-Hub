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
    private String originalFileName;
    private String fileType;
    private Long fileSize;
    private String fileUrl;
    private Integer subjectId;
    private String subjectCode;
    private String subjectName;
    private String uploadedBy;
    private LocalDateTime publishedAt;
    private Long viewCount;
    private Long downloadCount;
    private LocalDateTime createdAt;

    private Boolean canPreview;
    private Boolean canOpen;
    private Boolean canDownload;
    private Boolean canEdit;
    private Boolean canDelete;
    private Boolean canMove;
    private Boolean canShare;
    private Boolean canPublish;
    private Boolean canUnpublish;
}
