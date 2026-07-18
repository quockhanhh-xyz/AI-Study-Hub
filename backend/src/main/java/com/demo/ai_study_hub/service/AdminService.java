package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.dto.AdminDashboardResponse;
import com.demo.ai_study_hub.dto.AdminPublicDocumentListResponse;

public interface AdminService {
    AdminDashboardResponse getDashboardSummary();
    AdminPublicDocumentListResponse getPublicDocuments(String search, String approvalStatus, String fileType, Integer subjectId, int page, int size);
    void approveDocument(Integer id);
    void rejectDocument(Integer id);
    void unpublishDocument(Integer id);
    void makeDocumentPending(Integer id);
    byte[] exportPublicDocuments(String search, String approvalStatus, String fileType, Integer subjectId);
}
