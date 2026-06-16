package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.dto.FolderRequest;
import com.demo.ai_study_hub.dto.FolderResponse;

import java.util.List;

public interface FolderService {

    FolderResponse createFolder(FolderRequest request, String email);

    List<FolderResponse> getMyFolders(Integer parentFolderId, String email);

    FolderResponse getFolderDetail(Integer folderId, String email);

    FolderResponse updateFolder(Integer folderId, FolderRequest request, String email);

    void deleteFolder(Integer folderId, String email);

}
