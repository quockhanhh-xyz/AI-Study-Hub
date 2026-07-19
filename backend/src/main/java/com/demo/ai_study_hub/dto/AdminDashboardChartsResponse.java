package com.demo.ai_study_hub.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminDashboardChartsResponse {

    private List<TierCountItem> userTierDistribution;
    private List<ApprovalStatusCountItem> documentApprovalStatus;
    private List<RevenueByDayItem> revenueByDay;
    private List<AiUsageByDayItem> aiUsageByDay;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TierCountItem {
        private String tier;
        private long count;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ApprovalStatusCountItem {
        private String approvalStatus;
        private long count;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RevenueByDayItem {
        private String date; // e.g. "2026-07-18"
        private long revenue;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AiUsageByDayItem {
        private String date; // e.g. "2026-07-18"
        private long count;
    }
}
