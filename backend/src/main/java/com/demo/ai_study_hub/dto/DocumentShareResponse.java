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
public class DocumentShareResponse {
    private Integer shareId;
    private Integer documentId;
    private String title;
    private String fileType;
    private Long fileSize;
    private String fileUrl;
    private String sharedByName;
    private String sharedWithByName;
    private String sharedByEmail;
    private String sharedWithEmail;
    private String permission;
    private String status;
    private LocalDateTime createdAt;
}
