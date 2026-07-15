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

    /**
     * true nếu document đã COMPLETED và requester đã đăng nhập.
     * Guest (anonymous) luôn false vì các AI action cần login.
     */
    private Boolean canUseAiTools;

    /**
     * true nếu requester là owner VÀ processingStatus chưa được xử lý
     * (PENDING / FAILED / UNSUPPORTED / EMPTY_CONTENT).
     * Non-owner và guest luôn false.
     */
    private Boolean canProcess;

    /**
     * true nếu requester là owner VÀ document đã từng được process
     * (COMPLETED hoặc FAILED) — tức là có thể chạy lại.
     * Non-owner và guest luôn false.
     */
    private Boolean canReprocess;
}
