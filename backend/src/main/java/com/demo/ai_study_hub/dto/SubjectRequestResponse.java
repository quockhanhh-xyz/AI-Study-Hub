package com.demo.ai_study_hub.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class SubjectRequestResponse {
    private Integer requestId;
    private String requestedCode;
    private String requestedName;
    private String description;
    private String status;
    private String rejectReason;
    private LocalDateTime createdAt;
    
    private String requestedByEmail;
    private String requestedByName;
    
    private String reviewedByEmail;
    private LocalDateTime reviewedAt;
}
