package com.demo.ai_study_hub.repository;

import com.demo.ai_study_hub.entity.GroupChatMessage;
import com.demo.ai_study_hub.entity.StudyGroup;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GroupChatMessageRepository extends JpaRepository<GroupChatMessage, Long> {

    /**
     * Get latest N ACTIVE messages for a group, newest first (for limiting),
     * then reversed by service to return ASC order.
     */
    @Query("SELECT m FROM GroupChatMessage m WHERE m.group = :group AND m.status = 'ACTIVE' " +
           "ORDER BY m.createdAt DESC")
    List<GroupChatMessage> findLatestActiveMessages(
            @Param("group") StudyGroup group,
            Pageable pageable);

    /**
     * Get ACTIVE messages after a specific messageId (for incremental polling).
     */
    @Query("SELECT m FROM GroupChatMessage m WHERE m.group = :group AND m.status = 'ACTIVE' " +
           "AND m.messageId > :afterMessageId ORDER BY m.createdAt ASC")
    List<GroupChatMessage> findActiveMessagesAfter(
            @Param("group") StudyGroup group,
            @Param("afterMessageId") Long afterMessageId);
}
