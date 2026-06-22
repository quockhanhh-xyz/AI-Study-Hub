package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.dto.FolderShareResponse;
import com.demo.ai_study_hub.dto.FolderSharesListResponse;
import com.demo.ai_study_hub.dto.ShareFolderRequest;
import com.demo.ai_study_hub.dto.SharedFolderContentResponse;

import java.util.List;

public interface FolderShareService {

    FolderShareResponse shareFolderToUser(Integer folderId, ShareFolderRequest request, String email);

    List<FolderShareResponse> getSharedWithMe(String email);

    FolderSharesListResponse getFolderShares(Integer folderId, String email);

    void revokeFolderShare(Integer shareId, String email);

    SharedFolderContentResponse getSharedContent(Integer folderId, String email);

    boolean hasAccessToFolder(Integer folderId, String email);
}
