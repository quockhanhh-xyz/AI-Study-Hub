package com.demo.ai_study_hub.repository;

import com.demo.ai_study_hub.entity.StudyGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface StudyGroupRepository extends JpaRepository<StudyGroup, Integer> {
    Optional<StudyGroup> findByInviteCodeAndStatus(String inviteCode, String status);
    boolean existsByInviteCode(String inviteCode);
    Optional<StudyGroup> findByGroupIdAndStatus(Integer groupId, String status);
}
