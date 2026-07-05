package com.demo.ai_study_hub.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "ai_usage_reservations", indexes = {
    @Index(name = "idx_ai_reservation_user_status", columnList = "user_id, status"),
    @Index(name = "idx_ai_reservation_expires_at", columnList = "expires_at")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiUsageReservation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "reservation_id")
    private Long reservationId;

    @Column(name = "request_id", unique = true, nullable = false, length = 100)
    private String requestId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", referencedColumnName = "user_id", nullable = false)
    private User user;

    @Column(name = "request_type", nullable = false, length = 30)
    private String requestType;

    @Column(name = "status", nullable = false, length = 30)
    private String status;

    @Column(name = "reserved_at", nullable = false)
    private LocalDateTime reservedAt;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "confirmed_at")
    private LocalDateTime confirmedAt;

    @Column(name = "released_at")
    private LocalDateTime releasedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
