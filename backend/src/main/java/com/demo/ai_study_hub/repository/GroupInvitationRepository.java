package com.demo.ai_study_hub.repository;

import com.demo.ai_study_hub.entity.GroupInvitation;
import com.demo.ai_study_hub.entity.StudyGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.List;

@Repository
public interface GroupInvitationRepository extends JpaRepository<GroupInvitation, Long> {
    Optional<GroupInvitation> findByGroupAndEmail(StudyGroup group, String email);
    void deleteByGroupAndEmail(StudyGroup group, String email);
    boolean existsByGroupAndEmailAndStatus(StudyGroup group, String email, String status);
    boolean existsByGroupAndEmail(StudyGroup group, String email);
    
    List<GroupInvitation> findByEmailAndStatus(String email, String status);
    List<GroupInvitation> findByGroupAndStatus(StudyGroup group, String status);
}
