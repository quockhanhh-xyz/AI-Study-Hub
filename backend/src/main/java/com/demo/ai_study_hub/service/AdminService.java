package com.demo.ai_study_hub.service;

import java.util.List;
import com.demo.ai_study_hub.dto.AdminDashboardResponse;
import com.demo.ai_study_hub.dto.AdminPublicDocumentListResponse;
import com.demo.ai_study_hub.dto.AdminDashboardChartsResponse;

public interface AdminService {
    AdminDashboardResponse getDashboardSummary();
    AdminDashboardChartsResponse getDashboardCharts();
    AdminPublicDocumentListResponse getPublicDocuments(String search, String approvalStatus, String fileType, Integer subjectId, int page, int size);
    void approveDocument(Integer id);
    void rejectDocument(Integer id);
    void unpublishDocument(Integer id);
    void makeDocumentPending(Integer id);
    byte[] exportPublicDocuments(String search, String approvalStatus, String fileType, Integer subjectId);

    // Plan Management
    List<com.demo.ai_study_hub.entity.PlanConfig> getAllPlanConfigs();
    com.demo.ai_study_hub.entity.PlanConfig getPlanConfig(String planCode);
    com.demo.ai_study_hub.entity.PlanConfig updatePlanConfig(String planCode, com.demo.ai_study_hub.dto.PlanUpdateRequest request);
    com.demo.ai_study_hub.entity.PlanConfig patchPlanStatus(String planCode, String status);
    byte[] exportPlanConfigs();
}
