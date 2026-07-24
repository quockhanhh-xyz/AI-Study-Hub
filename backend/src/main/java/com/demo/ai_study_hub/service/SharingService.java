package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.dto.DocumentShareRequest;
import com.demo.ai_study_hub.dto.DocumentShareResponse;
import com.demo.ai_study_hub.dto.DocumentSharingInfoResponse;
import com.demo.ai_study_hub.dto.GroupDocumentShareRequest;
import com.demo.ai_study_hub.dto.GroupDocumentShareResponse;
import com.demo.ai_study_hub.dto.MySharesResponse;

import java.util.List;

public interface SharingService {

    MySharesResponse getMySharedAndContributedItems(String email);

    DocumentShareResponse shareDocumentDirect(Integer documentId, DocumentShareRequest request, String email);

    List<DocumentShareResponse> getSharedWithMe(String email);

    DocumentSharingInfoResponse getDocumentShares(Integer documentId, String email);

    void revokeDirectShare(Integer shareId, String email);

    GroupDocumentShareResponse shareDocumentToGroup(Integer documentId, GroupDocumentShareRequest request, String email);

    List<GroupDocumentShareResponse> getGroupDocuments(Integer groupId, String email);

    void revokeGroupShare(Integer shareId, String email);
}
