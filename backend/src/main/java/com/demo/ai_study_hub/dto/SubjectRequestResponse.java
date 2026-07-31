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

    private Integer schoolId;
    private String schoolCode;
    private String schoolName;
    private Integer majorId;
    private String majorCode;
    private String majorName;

    private String reviewedByEmail;
    private LocalDateTime reviewedAt;
}
