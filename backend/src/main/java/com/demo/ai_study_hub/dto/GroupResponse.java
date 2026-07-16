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
public class GroupResponse {
    private Integer groupId;
    private String groupName;
    private String description;
    private String inviteCode;
    private Integer ownerId;
    private String role;
    private String status;
    private boolean requiresApproval;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    private Long memberCount;
    private Long pendingMemberCount;
    private Long documentCount;
    private Long folderCount;

    /** Populated on joinGroup response. Values: ACTIVE | PENDING */
    private String membershipStatus;
}
