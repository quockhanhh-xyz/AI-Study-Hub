package com.demo.ai_study_hub.dto;

import com.demo.ai_study_hub.enums.PreviewMode;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentDownloadInfo {
    private String fileUrl;
    private String fileName;
    private String contentType;
    
    private String mimeType;
    private String resourceType;
    private String previewUrl;
    private String downloadUrl;
    private PreviewMode previewMode;
}
