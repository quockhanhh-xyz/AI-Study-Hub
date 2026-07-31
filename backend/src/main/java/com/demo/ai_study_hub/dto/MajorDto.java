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
public class MajorDto {
    private Integer majorId;
    private Integer schoolId;
    private String schoolName;

    @NotBlank(message = "Major code is required")
    @Size(max = 50, message = "Major code must be at most 50 characters")
    private String majorCode;

    @NotBlank(message = "Major name is required")
    @Size(max = 255, message = "Major name must be at most 255 characters")
    private String majorName;

    @Size(max = 1000, message = "Description must be at most 1000 characters")
    private String description;

    @Pattern(regexp = "ACTIVE|INACTIVE", message = "Status must be ACTIVE or INACTIVE")
    private String status;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
