package com.demo.ai_study_hub.repository;

import com.demo.ai_study_hub.entity.StudyGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface StudyGroupRepository extends JpaRepository<StudyGroup, Integer> {
    boolean existsByInviteCode(String inviteCode);
    Optional<StudyGroup> findByInviteCode(String inviteCode);
}
