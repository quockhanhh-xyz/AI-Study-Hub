package com.demo.ai_study_hub.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationResponse {
    private Long notificationId;
    private String type;
    private String title;
    private String message;
    private String targetType;
    private Long targetId;
    private Integer actorUserId;
    private boolean read;
    private Instant createdAt;
}
