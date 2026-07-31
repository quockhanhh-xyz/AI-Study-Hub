package com.demo.ai_study_hub.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UpdateGroupRequest {

    @NotBlank(message = "Group name is required")
    private String groupName;

    private String description;

    /** If null, the current requiresApproval setting is kept unchanged. */
    private Boolean requiresApproval;
}
