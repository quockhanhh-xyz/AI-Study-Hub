package com.demo.ai_study_hub.repository;

import com.demo.ai_study_hub.entity.OtpCode;
import com.demo.ai_study_hub.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDateTime;
import java.util.Optional;

public interface OtpCodeRepository extends JpaRepository<OtpCode, Integer> {
    Optional<OtpCode> findTopByUserAndPurposeAndUsedFalseOrderByExpiredAtDesc(
            User user, String purpose
    );

    long countByUserAndPurposeAndCreatedAtAfter(
            User user, String purpose, LocalDateTime time
    );
}