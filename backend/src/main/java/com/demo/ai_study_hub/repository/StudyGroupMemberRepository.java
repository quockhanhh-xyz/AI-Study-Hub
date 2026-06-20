package com.demo.ai_study_hub.repository;

import com.demo.ai_study_hub.entity.StudyGroup;
import com.demo.ai_study_hub.entity.StudyGroupMember;
import com.demo.ai_study_hub.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StudyGroupMemberRepository extends JpaRepository<StudyGroupMember, Integer> {

    Optional<StudyGroupMember> findByGroupAndUserAndStatus(StudyGroup group, User user, String status);

    Optional<StudyGroupMember> findByGroupAndUser(StudyGroup group, User user);

    List<StudyGroupMember> findByGroupAndStatus(StudyGroup group, String status);

    List<StudyGroupMember> findByUserAndStatus(User user, String status);

    boolean existsByGroupAndUserAndStatus(StudyGroup group, User user, String status);
}
