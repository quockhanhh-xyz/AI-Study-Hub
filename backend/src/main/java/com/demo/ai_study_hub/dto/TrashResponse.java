package com.demo.ai_study_hub.dto;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class TrashResponse {
    private List<TrashDocumentItem> documents;
    private List<TrashFolderItem> folders;

    @Data
    @Builder
    public static class TrashDocumentItem {
        private Integer documentId;
        private String title;
        private String originalFileName;
        private String fileType;
        private Long fileSize;
        private Integer folderId;
        private LocalDateTime deletedAt;
    }

    @Data
    @Builder
    public static class TrashFolderItem {
        private Integer folderId;
        private String folderName;
        private String description;
        private Integer parentFolderId;
        private LocalDateTime deletedAt;
    }
}
