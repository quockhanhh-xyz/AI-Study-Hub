package com.demo.ai_study_hub.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GroupDetailResponse {
    private Integer groupId;
    private String groupName;
    private String description;
    private String inviteCode;
    private Integer ownerId;
    private String status;
    private String currentUserRole;
    private List<GroupMemberItem> members;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    private Long memberCount;
    private Long documentCount;
    private Long folderCount;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GroupMemberItem {
        private Integer memberId;
        private Integer userId;
        private String fullName;
        private String displayName;
        private String email;
        private String role;
        private String status;
        private LocalDateTime joinedAt;
    }
}
