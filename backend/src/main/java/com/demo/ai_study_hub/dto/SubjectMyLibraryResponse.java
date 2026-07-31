package com.demo.ai_study_hub.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubjectMyLibraryResponse {
    private Integer subjectId;
    private String code;
    private String name;
    private String description;
    private String sourceType; // SYSTEM or PERSONAL
    private String status;
    private Long documentCount;
    private Boolean canEdit;
    private Boolean canDelete;
    private java.util.List<SubjectMappingResponse> mappings;
}
