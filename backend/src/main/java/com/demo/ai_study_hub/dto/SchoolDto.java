package com.demo.ai_study_hub.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SchoolDto {
    private Integer schoolId;

    @NotBlank(message = "School code is required")
    @Size(max = 50, message = "School code must be at most 50 characters")
    private String schoolCode;

    @NotBlank(message = "School name is required")
    @Size(max = 255, message = "School name must be at most 255 characters")
    private String schoolName;

    @NotBlank(message = "Short name is required")
    @Size(max = 50, message = "Short name must be at most 50 characters")
    private String shortName;

    @Size(max = 1000, message = "Description must be at most 1000 characters")
    private String description;

    @Pattern(regexp = "ACTIVE|INACTIVE", message = "Status must be ACTIVE or INACTIVE")
    private String status;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
