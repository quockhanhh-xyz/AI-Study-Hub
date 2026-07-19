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
public class AdminDashboardResponse {

    private long totalUsers;
    private long activeUsers;
    private long blockedUsers;
    private long totalDocuments;
    private long pendingPublicDocuments;
    private long approvedPublicDocuments;
    private long totalRevenue;
    private long successfulPayments;
    private long aiRequestsToday;
    private long aiRequestsThisMonth;
    private long aiRequestsTotal;

    private List<TierCountItem> usersByTier;
    private List<ApprovalStatusCountItem> documentsByApprovalStatus;
    private List<RevenueByMonthItem> revenueByMonth;
    private List<AiFeatureUsageItem> aiUsageByFeature;

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
    public static class RevenueByMonthItem {
        private String month; // e.g. "2026-07"
        private long revenue;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AiFeatureUsageItem {
        private String feature;
        private long count;
    }
}
