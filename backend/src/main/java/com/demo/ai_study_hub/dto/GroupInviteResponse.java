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
public class GroupInviteResponse {
    private Long id;
    private Integer groupId;
    private String groupName;
    private String groupInviteCode;
    private String inviterName;
    private String inviterEmail;
    private String email; // The invitee's email
    private String status;
    private LocalDateTime invitedAt;
}
