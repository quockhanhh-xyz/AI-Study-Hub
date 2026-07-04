package com.demo.ai_study_hub.dto;

import lombok.*;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GroupChatMessageResponse {
    private Long messageId;
    private Integer groupId;
    private Integer senderId;
    private String senderName;
    private String senderRole;
    private String content;
    private String status;
    private Boolean isMine;
    private LocalDateTime createdAt;
}
