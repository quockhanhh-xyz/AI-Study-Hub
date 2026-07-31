package com.demo.ai_study_hub.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class SubjectMappingUpdateRequest {
    @NotNull(message = "Major IDs are required")
    private List<Integer> majorIds;
}
