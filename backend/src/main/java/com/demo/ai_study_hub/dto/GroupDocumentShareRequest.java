package com.demo.ai_study_hub.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GroupDocumentShareRequest {

    @NotNull(message = "Group ID is required")
    private Integer groupId;
}
