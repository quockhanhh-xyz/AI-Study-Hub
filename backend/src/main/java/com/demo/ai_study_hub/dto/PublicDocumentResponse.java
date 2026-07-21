package com.demo.ai_study_hub.dto;

import com.demo.ai_study_hub.enums.PreviewMode;

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

    private String mimeType;
    private String resourceType;
    private String previewUrl;
    private String downloadUrl;
    private PreviewMode previewMode;
    private String visibility;
    private String approvalStatus;
    private String processingStatus;
    private LocalDateTime publishedAt;
    private Long viewCount;
    private Long downloadCount;
    private LocalDateTime createdAt;
    /**
     * @deprecated Use {@link #displayName} instead.
     */
    @Deprecated
    private String ownerName;
    private String displayName;

    private Boolean canPreview;
    private Boolean canOpen;
    private Boolean canDownload;
    private Boolean favoritedByMe;


    private Boolean canUseAiTools;


    private Boolean canProcess;


    private Boolean canReprocess;
}
