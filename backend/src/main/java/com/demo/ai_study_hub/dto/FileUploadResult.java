package com.demo.ai_study_hub.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class FileUploadResult {
    private String fileUrl;
    private String publicId;
    private String originalFileName;
    private String fileType;
    private Long fileSize;
}