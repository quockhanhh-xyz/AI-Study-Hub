package com.demo.ai_study_hub.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "group_chat_messages", indexes = {
    @Index(name = "idx_group_chat_group_status_created_at", columnList = "group_id, status, created_at"),
    @Index(name = "idx_group_chat_group_created_at", columnList = "group_id, created_at"),
    @Index(name = "idx_group_chat_sender", columnList = "sender_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GroupChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "message_id")
    private Long messageId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id", referencedColumnName = "group_id", nullable = false)
    private StudyGroup group;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_id", referencedColumnName = "user_id", nullable = false)
    private User sender;

    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    private String status = "ACTIVE";

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;
}
