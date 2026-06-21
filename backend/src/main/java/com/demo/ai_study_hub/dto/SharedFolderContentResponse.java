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
public class SharedFolderContentResponse {
    private List<BreadcrumbItem> breadcrumb;
    private CurrentFolderInfo currentFolder;
    private List<FolderResponse> subfolders;
    private List<DocumentResponse> documents;
    private String permission;
    private Boolean isSharedView;
    private Boolean canUpload;
    private Boolean canEdit;
    private Boolean canDelete;
    private Boolean canMove;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BreadcrumbItem {
        private Integer folderId;
        private String folderName;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CurrentFolderInfo {
        private Integer folderId;
        private String folderName;
        private String ownerName;
        private String ownerEmail;
    }
}
