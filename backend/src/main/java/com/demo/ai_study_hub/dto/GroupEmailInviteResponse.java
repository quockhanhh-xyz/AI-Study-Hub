package com.demo.ai_study_hub.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GroupEmailInviteResponse {

    private Integer groupId;
    private String email;
    private String inviteCode;
    private String joinUrl;
}
