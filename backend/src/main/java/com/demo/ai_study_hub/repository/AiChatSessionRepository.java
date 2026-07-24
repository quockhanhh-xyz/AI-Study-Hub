package com.demo.ai_study_hub.repository;

import com.demo.ai_study_hub.entity.AiChatSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AiChatSessionRepository extends JpaRepository<AiChatSession, Long> {

    /**
     * Find the active chat session for a user on a specific document.
     * Used to resume an existing session instead of creating a new one.
     */
    Optional<AiChatSession> findByUser_UserIdAndDocument_DocumentIdAndStatus(
            Integer userId, Integer documentId, String status);
            
    Optional<AiChatSession> findByUser_UserIdAndDocumentIsNullAndStatus(
            Integer userId, String status);

    long countByUser_UserIdAndDocumentIsNullAndStatus(Integer userId, String status);

    /**
     * Find all sessions (any status) for a user on a specific document.
     * Ordered newest first.
     */
    @Query("SELECT s FROM AiChatSession s WHERE s.user.userId = :userId " +
           "AND s.document.documentId = :documentId ORDER BY s.createdAt DESC")
    List<AiChatSession> findByUserAndDocument(
            @Param("userId") Integer userId,
            @Param("documentId") Integer documentId);

    /**
     * Check if user owns a session (for delete permission check).
     */
    Optional<AiChatSession> findBySessionIdAndUser_UserId(Long sessionId, Integer userId);
    long countByUser_UserIdAndDocument_DocumentIdAndStatus(Integer userId, Integer documentId, String status);
}
