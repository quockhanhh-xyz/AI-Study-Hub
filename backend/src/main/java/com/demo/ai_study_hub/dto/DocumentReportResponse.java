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
public class DocumentReportResponse {
    private Long reportId;
    private Integer documentId;
    private String documentTitle;
    private Integer reporterId;
    private String reporterEmail;
    private String reporterName;
    private String reason;
    private String description;
    private String status;
    private Integer resolvedById;
    private String resolvedByName;
    private String resolutionNote;
    private LocalDateTime createdAt;
    private LocalDateTime resolvedAt;
}
