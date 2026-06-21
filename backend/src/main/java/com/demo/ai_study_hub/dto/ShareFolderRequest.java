package com.demo.ai_study_hub.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ShareFolderRequest {

    @NotBlank(message = "Email is required")
    private String email;
}
