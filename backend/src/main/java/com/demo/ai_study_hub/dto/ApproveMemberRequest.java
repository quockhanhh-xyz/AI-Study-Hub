package com.demo.ai_study_hub.dto;

import lombok.Data;

@Data
public class ApproveMemberRequest {
    /** memberId to approve or reject. */
    private Integer memberId;
}
