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
public class PendingMemberResponse {
    private Integer memberId;
    private Integer userId;
    private String fullName;
    private String email;
    private LocalDateTime requestedAt;
}
