package com.demo.ai_study_hub.repository;

import com.demo.ai_study_hub.entity.StudyGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface StudyGroupRepository extends JpaRepository<StudyGroup, Integer> {
    boolean existsByInviteCode(String inviteCode);
    Optional<StudyGroup> findByInviteCode(String inviteCode);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("SELECT g FROM StudyGroup g WHERE g.groupId = :id")
    Optional<StudyGroup> findByIdForUpdate(@org.springframework.data.repository.query.Param("id") Integer id);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("SELECT g FROM StudyGroup g WHERE g.inviteCode = :inviteCode")
    Optional<StudyGroup> findByInviteCodeForUpdate(@org.springframework.data.repository.query.Param("inviteCode") String inviteCode);
}
