package com.demo.ai_study_hub.repository;

import com.demo.ai_study_hub.entity.GroupInvitation;
import com.demo.ai_study_hub.entity.StudyGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface GroupInvitationRepository extends JpaRepository<GroupInvitation, Long> {
    Optional<GroupInvitation> findByGroupAndEmail(StudyGroup group, String email);
    void deleteByGroupAndEmail(StudyGroup group, String email);
    boolean existsByGroupAndEmail(StudyGroup group, String email);
}
