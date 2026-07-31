package com.demo.ai_study_hub.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class SubjectResponse {
    private Integer subjectId;
    private String subjectCode;
    private String subjectName;
    private String description;
    private String scope;
    private Integer ownerId;
    private List<SubjectMappingResponse> mappings;
}
