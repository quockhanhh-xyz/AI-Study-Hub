package com.demo.ai_study_hub.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "group_invitations", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"group_id", "email"})
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GroupInvitation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id", nullable = false)
    private StudyGroup group;

    @Column(name = "email", nullable = false, length = 255)
    private String email;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "inviter_id")
    private User inviter;

    @Builder.Default
    @Column(name = "status", nullable = false, length = 20)
    private String status = "PENDING"; // PENDING, ACCEPTED, DECLINED

    @Column(name = "invited_at", nullable = false)
    private LocalDateTime invitedAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
