package com.demo.ai_study_hub.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateReviewReplyRequest {

    @NotBlank
    @Size(min = 1, max = 5000)
    private String content;
}
