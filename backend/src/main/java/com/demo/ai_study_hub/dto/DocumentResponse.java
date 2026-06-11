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
public class DocumentResponse {
    private Integer documentId;
    private String title;
    private String description;
    private Integer subjectId;
    private String subjectCode;
    private String subjectName;
    private String originalFileName;
    private String fileType;
    private Long fileSize;
    private String fileUrl;
    private String publicId;
    private Integer folderId;
    private String folderName;
    private String uploadedBy;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}