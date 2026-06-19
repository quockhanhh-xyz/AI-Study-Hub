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
public class StudyGroupResponse {
    private Integer groupId;
    private String groupName;
    private String description;
    private String inviteCode;
    private Integer ownerId;
    private String status;
    private String role; // OWNER, MEMBER (context-specific representation)
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<GroupMemberResponse> members;
}
