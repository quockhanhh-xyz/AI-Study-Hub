package com.demo.ai_study_hub.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class DocumentReportRequest {
    @NotBlank(message = "Reason is required")
    private String reason;

    @Size(max = 500, message = "Description cannot exceed 500 characters")
    private String description;
}
