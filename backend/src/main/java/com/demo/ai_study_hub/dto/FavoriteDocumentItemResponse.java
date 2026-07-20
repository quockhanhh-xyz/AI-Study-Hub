package com.demo.ai_study_hub.dto;

import com.demo.ai_study_hub.enums.PreviewMode;

import lombok.*;
import java.time.LocalDateTime;

/**
 * Minimal, safe representation of a favorited document for
 * GET /api/documents/favorites.
 *
 * INTEGRATION NOTE: for 100% field parity with GET /api/documents/my,
 * prefer mapping through the project's existing Document -> DocumentResponse
 * mapper (e.g. documentService.toResponse(doc)) if one is already exposed
 * as a reusable method, rather than this standalone DTO. This class exists
 * as a safe fallback so the endpoint never accidentally serializes the raw
 * JPA entity (which would leak Document.owner.passwordHash and other
 * internal fields through Jackson's default reflection-based serialization).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FavoriteDocumentItemResponse {
    private Integer documentId;
    private String title;
    private String fileType;
    private String visibility;
    private String approvalStatus;
    private Integer ownerId;
    private String ownerName;
    private LocalDateTime createdAt;
    private LocalDateTime favoritedAt;
    private boolean favoritedByMe;
    private Long fileSize;
    
    private String fileUrl;
    private String mimeType;
    private String resourceType;
    private String previewUrl;
    private String downloadUrl;
    private PreviewMode previewMode;
    private String subjectName;
    private String folderName;
    private Boolean canOpen;
    private Boolean canDownload;
    private String processingStatus;
}
