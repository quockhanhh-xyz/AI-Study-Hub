package com.demo.ai_study_hub.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class AdminSubjectItem {
    private Integer subjectId;
    private String subjectCode;
    private String subjectName;
    private String description;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private long documentsCount;
}
