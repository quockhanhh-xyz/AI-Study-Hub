package com.demo.ai_study_hub.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class FolderRequest {

    @NotBlank(message = "Folder name cannot be empty")
    private String folderName;

    private String description;
}
