package com.demo.ai_study_hub.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentRatingSummaryResponse {
    private Double averageRating;
    private Long ratingCount;
    private Integer myRating;
    private Boolean canRate;
}
