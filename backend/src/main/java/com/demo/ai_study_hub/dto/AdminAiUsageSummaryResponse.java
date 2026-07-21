package com.demo.ai_study_hub.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminAiUsageSummaryResponse {
    private long totalRequests;
    private long successCount;
    private long failedCount;
    private long quotaBlockedCount;
    private long activeUsers;
}
