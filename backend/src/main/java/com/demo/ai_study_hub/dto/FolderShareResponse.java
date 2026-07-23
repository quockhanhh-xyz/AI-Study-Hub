package com.demo.ai_study_hub.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FolderShareResponse {
    private Integer shareId;
    private Integer folderId;
    private String folderName;
    private Integer parentFolderId;
    private String ownerName;
    private String ownerEmail;
    private String sharedByName;
    private String sharedWithName;
    private String sharedByEmail;
    private String sharedWithEmail;
    private Integer sharedByUserId;
    private Integer groupId;
    private String groupName;
    private String permission;
    private String status;
    private LocalDateTime createdAt;
    private Boolean canRevoke;
}
