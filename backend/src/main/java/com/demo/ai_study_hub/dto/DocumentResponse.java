package com.demo.ai_study_hub.dto;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class DocumentResponse {
    private Integer documentId;
    private String title;
    private String fileName;
    private String fileType;
    private Long fileSize;
    private String fileUrl;
    private String storagePath;
    private LocalDateTime createdAt;
}