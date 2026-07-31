package com.demo.ai_study_hub.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class UpdateSystemReviewRequest {

    @NotNull
    @Min(1)
    @Max(5)
    private Integer rating;

    @NotBlank
    @Size(max = 50)
    private String category;

    @NotBlank
    @Size(max = 150)
    private String title;

    @NotBlank
    @Size(min = 10, max = 2000)
    private String content;
}
