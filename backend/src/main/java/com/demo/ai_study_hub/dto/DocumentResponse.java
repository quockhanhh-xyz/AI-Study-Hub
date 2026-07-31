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
public class DocumentResponse {
    private Integer documentId;
    private String title;
    private String description;
    private Integer subjectId;
    private String subjectCode;
    private String subjectName;
    private String subjectScope;
    private Integer schoolId;
    private String schoolCode;
    private String schoolName;
    private Integer majorId;
    private String majorCode;
    private String majorName;
    private String originalFileName;
    private String fileType;
    private Long fileSize;
    private String fileUrl;
    
    private String mimeType;
    private String resourceType;
    private String previewUrl;
    private String downloadUrl;
    private PreviewMode previewMode;
    private String publicId;
    private Integer folderId;
    private String folderName;
    private String uploadedBy;
    private String uploadedByName;
    private Integer uploadedByUserId;
    private String status;
    private String visibility;
    private String approvalStatus;
    private String processingStatus;
    private LocalDateTime publishedAt;
    private Long viewCount;
    private Long downloadCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    private Boolean canPreview;
    private Boolean canOpen;
    private Boolean canDownload;
    private Boolean canEdit;
    private Boolean canDelete;
    private Boolean canMove;
    private Boolean canShare;
    private Boolean canPublish;
    private Boolean canUnpublish;
    private Boolean requiresSystemSubjectRequest;
    private Boolean canRequestSystemSubject;
    private Boolean favoritedByMe;
    private String subjectRequestStatus;
    private String subjectRequestRejectReason;

    // Rating & Reporting
    private Double averageRating;
    private Long ratingCount;
    private Integer myRating;
    private Boolean canRate;
    private Boolean canReport;
    private Boolean reportedByMe;
}
