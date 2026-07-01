package com.demo.ai_study_hub.repository;

import com.demo.ai_study_hub.entity.AiChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AiChatMessageRepository extends JpaRepository<AiChatMessage, Long> {

    /**
     * Retrieve all messages in a chat session ordered chronologically.
     */
    List<AiChatMessage> findBySession_SessionIdOrderByCreatedAtAsc(Long sessionId);
}
