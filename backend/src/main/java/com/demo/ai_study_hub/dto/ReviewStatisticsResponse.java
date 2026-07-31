package com.demo.ai_study_hub.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReviewStatisticsResponse {
    private long totalActiveReviews;
    private double averageRating;
    private long unrespondedCount;
    private Map<Integer, Long> ratingDistribution;
}
