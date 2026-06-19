package com.demo.ai_study_hub.repository;

import com.demo.ai_study_hub.entity.StudyGroup;
import com.demo.ai_study_hub.entity.StudyGroupMember;
import com.demo.ai_study_hub.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface StudyGroupMemberRepository extends JpaRepository<StudyGroupMember, Integer> {
    List<StudyGroupMember> findByGroupAndStatus(StudyGroup group, String status);
    Optional<StudyGroupMember> findByGroupAndUserAndStatus(StudyGroup group, User user, String status);
    
    @Query("SELECT sgm FROM StudyGroupMember sgm WHERE sgm.user = :user AND sgm.status = :status AND sgm.group.status = 'ACTIVE'")
    List<StudyGroupMember> findActiveMembershipsByUser(@Param("user") User user, @Param("status") String status);

    boolean existsByGroupAndUserAndStatus(StudyGroup group, User user, String status);
}
