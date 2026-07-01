package com.demo.ai_study_hub.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Response body for GET /api/ai/documents/{documentId}/chats
 * Returns the current user's active chat session and all messages.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiChatHistoryResponse {

    /** Session ID, or null if no session exists yet for this user+document. */
    private Long sessionId;

    /** The document this chat belongs to. */
    private Integer documentId;

    /** Ordered list of messages (USER then ASSISTANT pairs), oldest first. */
    private List<AiChatMessageDto> messages;
}
