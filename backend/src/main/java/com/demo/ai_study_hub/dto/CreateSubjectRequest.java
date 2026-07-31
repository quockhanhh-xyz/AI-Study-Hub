package com.demo.ai_study_hub.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateSubjectRequest {

    @NotBlank(message = "Requested code is required")
    private String requestedCode;

    @NotBlank(message = "Requested name is required")
    private String requestedName;

    private String description;

    @NotNull(message = "School is required")
    private Integer schoolId;

    @NotNull(message = "Major is required")
    private Integer majorId;
}
