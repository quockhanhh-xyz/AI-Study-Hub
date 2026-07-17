package com.demo.ai_study_hub.repository;

import com.demo.ai_study_hub.entity.StudyGroup;
import com.demo.ai_study_hub.entity.StudyGroupMember;
import com.demo.ai_study_hub.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StudyGroupMemberRepository extends JpaRepository<StudyGroupMember, Integer> {

    Optional<StudyGroupMember> findByGroupAndUserAndStatus(StudyGroup group, User user, String status);

    Optional<StudyGroupMember> findByGroupAndUser(StudyGroup group, User user);

    List<StudyGroupMember> findByGroupAndStatus(StudyGroup group, String status);

    List<StudyGroupMember> findByGroupAndStatusIn(StudyGroup group, List<String> statuses);

    List<StudyGroupMember> findByUserAndStatus(User user, String status);

    boolean existsByGroupAndUserAndStatus(StudyGroup group, User user, String status);

    @Query("SELECT m.group.groupId AS groupId, COUNT(m) AS cnt FROM StudyGroupMember m WHERE m.group.groupId IN :groupIds AND m.status = 'ACTIVE' GROUP BY m.group.groupId")
    List<Object[]> countActiveMembersByGroupIds(@Param("groupIds") List<Integer> groupIds);

    @Query("SELECT m.group.groupId AS groupId, COUNT(m) AS cnt FROM StudyGroupMember m WHERE m.group.groupId IN :groupIds AND m.status = 'PENDING' GROUP BY m.group.groupId")
    List<Object[]> countPendingMembersByGroupIds(@Param("groupIds") List<Integer> groupIds);

    @Query("SELECT COUNT(m) FROM StudyGroupMember m WHERE m.user = :user AND m.role = :role AND m.group.status = :groupStatus")
    long countByUserAndRoleAndGroupStatus(
        @Param("user") User user,
        @Param("role") String role,
        @Param("groupStatus") String groupStatus);

    long countByGroupAndStatus(StudyGroup group, String status);
}
