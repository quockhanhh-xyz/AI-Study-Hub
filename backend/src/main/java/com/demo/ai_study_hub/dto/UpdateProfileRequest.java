package com.demo.ai_study_hub.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class UpdateProfileRequest {
    
    @NotBlank(message = "Full name is required")
    @Size(min = 2, max = 100, message = "Full name must be between 2 and 100 characters")
    private String fullName;

    @Size(max = 20, message = "Phone must be at most 20 characters")
    private String phone;

    @Size(max = 100, message = "School name must be at most 100 characters")
    private String schoolName;

    @Size(max = 100, message = "Major must be at most 100 characters")
    private String major;

    @Size(max = 100, message = "Student code must be at most 100 characters")
    private String studentCode;

    @Min(value = 1900, message = "Graduation year must be at least 1900")
    private Integer graduationYear;

    private String educationLevel;

    @Size(max = 500, message = "Bio must be at most 500 characters")
    private String bio;
}
