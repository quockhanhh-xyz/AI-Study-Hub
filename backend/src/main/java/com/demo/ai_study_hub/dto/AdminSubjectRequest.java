package com.demo.ai_study_hub.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.List;

@Data
public class AdminSubjectRequest {
    @NotBlank(message = "Subject code is required")
    private String subjectCode;

    @NotBlank(message = "Subject name is required")
    private String subjectName;

    private String description;

    /**
     * A system subject may be used by multiple majors, including majors from
     * different schools. Null preserves existing mappings for legacy clients;
     * an empty list explicitly removes every mapping.
     */
    private List<Integer> majorIds;
}
