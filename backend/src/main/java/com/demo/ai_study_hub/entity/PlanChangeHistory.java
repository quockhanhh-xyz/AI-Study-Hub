package com.demo.ai_study_hub.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import java.time.LocalDateTime;

@Entity
@Table(name = "plan_change_histories")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PlanChangeHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "plan_code", length = 50, nullable = false)
    private String planCode;

    @Column(name = "action_type", length = 50, nullable = false)
    private String actionType; // "UPDATE" | "ACTIVATE" | "DEACTIVATE"

    @Column(name = "details", columnDefinition = "TEXT")
    private String details;

    @Column(name = "changer", length = 100, nullable = false)
    private String changer;

    @Column(name = "changed_at", nullable = false)
    @Builder.Default
    private LocalDateTime changedAt = LocalDateTime.now();
}
