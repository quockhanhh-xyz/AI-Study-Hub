package com.demo.ai_study_hub.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class ChangePasswordRequest {

    @NotBlank(message = "Current password is required")
    private String currentPassword;

    @NotBlank(message = "New password is required")
    @Size(min = 8, max = 72, message = "Password must be between 8 and 72 characters")
    @Pattern(regexp = "^(?=.*[A-Za-z])(?=.*\\d)[A-Za-z\\d@$!%*#?&^_-]*$", message = "Password must contain at least one letter and one number")
    private String newPassword;
}
