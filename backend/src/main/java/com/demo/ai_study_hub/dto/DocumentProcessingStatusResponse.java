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
public class DocumentProcessingStatusResponse {
    private Integer documentId;
    private String processingStatus;
    private Integer characterCount;
    private Integer originalCharacterCount;
    private Integer wordCount;
    private Integer chunkCount;
    private Boolean isTruncated;
    private LocalDateTime processingStartedAt;
    private LocalDateTime processedAt;
    private String lastAttemptStatus;
    private String lastAttemptError;
    private LocalDateTime lastAttemptedAt;
}
