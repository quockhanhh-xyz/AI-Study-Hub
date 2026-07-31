package com.demo.ai_study_hub.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import com.demo.ai_study_hub.enums.UserTier;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_id")
    private Integer userId;

    @Column(name = "email", unique = true, nullable = false, length = 100)
    private String email;

    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    @Column(name = "full_name", nullable = false, length = 255)
    private String fullName;

    @Column(name = "role", nullable = false, length = 20)
    private String role = "USER";

    @Enumerated(EnumType.STRING)
    @Column(name = "tier", nullable = false, length = 20)
    private UserTier tier = UserTier.FREE;

    @Column(name = "tier_expires_at")
    private LocalDateTime tierExpiresAt;

    @Column(name = "status", nullable = false, length = 30)
    private String status = "INACTIVE";

    @Column(name = "avatar_url", length = 1000)
    private String avatarUrl;

    @Column(name = "avatar_public_id", length = 255)
    private String avatarPublicId;

    @Column(name = "phone", length = 20)
    private String phone;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "school_id")
    private School school;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "major_id")
    private Major major;

    @Column(name = "student_code", length = 100)
    private String studentCode;

    @Column(name = "graduation_year")
    private Integer graduationYear;

    @Column(name = "education_level", length = 50)
    private String educationLevel;

    @Column(name = "bio", length = 500)
    private String bio;

    @Column(name = "profile_public", nullable = false)
    private boolean profilePublic = true;

    @Column(name = "show_school", nullable = false)
    private boolean showSchool = true;

    @Column(name = "show_major", nullable = false)
    private boolean showMajor = true;

    @Column(name = "show_bio", nullable = false)
    private boolean showBio = true;

    @Column(name = "show_public_documents", nullable = false)
    private boolean showPublicDocuments = true;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public String getSchoolName() {
        return school != null ? school.getSchoolName() : null;
    }

    public String getMajorName() {
        return major != null ? major.getMajorName() : null;
    }
}
