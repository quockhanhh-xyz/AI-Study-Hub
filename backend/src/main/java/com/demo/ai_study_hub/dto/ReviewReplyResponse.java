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
public class ReviewReplyResponse {
    private Integer replyId;
    private Integer reviewId;
    private String senderEmail;
    private String senderFullName;
    private String senderRole;
    private String content;
    private LocalDateTime createdAt;
}
