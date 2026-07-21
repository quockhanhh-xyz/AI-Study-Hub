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
public class DocumentShareResponse {
    private Integer shareId;
    private Integer documentId;
    private String title;
    private String fileType;
    private Long fileSize;
    private String fileUrl;
    
    private String mimeType;
    private String resourceType;
    private String previewUrl;
    private String downloadUrl;
    private PreviewMode previewMode;
    private String sharedByName;
    private String sharedWithName;
    private String sharedByEmail;
    private String sharedWithEmail;
    private String permission;
    private String status;
    private LocalDateTime createdAt;
    private Boolean favoritedByMe;
}
