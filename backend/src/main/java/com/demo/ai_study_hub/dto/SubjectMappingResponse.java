package com.demo.ai_study_hub.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class SubjectMappingResponse {
    private Integer subjectId;
    private Integer schoolId;
    private String schoolCode;
    private String schoolName;
    private Integer majorId;
    private String majorCode;
    private String majorName;
}
