package com.demo.ai_study_hub.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "otp_codes")
@Data
@NoArgsConstructor
public class OtpCode {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer otpId;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "otp_code", nullable = false, length = 6)
    private String code;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiredAt;

    @Column(nullable = false, length = 20)
    private String purpose = "REGISTER";

    @Column(nullable = false)
    private boolean used = false;

    @org.hibernate.annotations.CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}