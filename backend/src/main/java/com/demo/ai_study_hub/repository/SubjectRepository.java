package com.demo.ai_study_hub.repository;

import com.demo.ai_study_hub.entity.Subject;
import com.demo.ai_study_hub.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

@Repository
public interface SubjectRepository extends JpaRepository<Subject, Integer>, JpaSpecificationExecutor<Subject> {

    List<Subject> findByStatus(String status);

    boolean existsBySubjectCode(String subjectCode);

    boolean existsBySubjectCodeAndStatus(String subjectCode, String status);

    boolean existsBySubjectCodeAndScope(String subjectCode, String scope);

    boolean existsBySubjectCodeAndScopeAndStatus(String subjectCode, String scope, String status);

    @Query("SELECT COUNT(s) > 0 FROM Subject s WHERE LOWER(s.subjectCode) = LOWER(:subjectCode) AND s.scope = :scope AND s.subjectId <> :subjectId")
    boolean existsBySubjectCodeAndScopeAndSubjectIdNot(
            @Param("subjectCode") String subjectCode,
            @Param("scope") String scope,
            @Param("subjectId") Integer subjectId
    );

    java.util.Optional<Subject> findBySubjectCode(String subjectCode);

    @Query("SELECT s FROM Subject s WHERE s.scope = 'SYSTEM' AND LOWER(s.subjectCode) = LOWER(:code)")
    java.util.Optional<Subject> findSystemSubjectByCodeIgnoreCase(@Param("code") String code);

    @Query("SELECT s FROM Subject s WHERE s.scope = 'SYSTEM' AND LOWER(s.subjectName) = LOWER(:name)")
    java.util.Optional<Subject> findSystemSubjectByNameIgnoreCase(@Param("name") String name);

    @Query("SELECT s FROM Subject s WHERE s.status = 'ACTIVE' " +
            "AND (s.scope = 'SYSTEM' OR (s.scope IS NULL AND s.owner IS NULL) OR (s.scope = 'USER_CUSTOM' AND s.owner = :owner))")
    List<Subject> findVisibleSubjects(@Param("owner") User owner);

    @Query("SELECT COUNT(s) > 0 FROM Subject s WHERE s.status = 'ACTIVE' " +
            "AND (LOWER(s.subjectCode) = LOWER(:code) OR LOWER(s.subjectName) = LOWER(:name)) " +
            "AND (s.scope = 'SYSTEM' OR (s.scope = 'USER_CUSTOM' AND s.owner = :owner))")
    boolean existsDuplicateForUser(
            @Param("code") String code,
            @Param("name") String name,
            @Param("owner") User owner
    );

    @Query("SELECT DISTINCT s FROM Subject s " +
           "JOIN Document d ON d.subject = s " +
           "WHERE s.status = 'ACTIVE' " +
           "AND s.scope = 'SYSTEM' " +
           "AND d.status = 'ACTIVE' " +
           "AND d.visibility = 'PUBLIC' " +
           "AND d.approvalStatus = 'APPROVED'")
    List<Subject> findPublicSubjectsInUse();

    @Query("SELECT s FROM Subject s WHERE s.status = 'ACTIVE' " +
           "AND (s.scope = 'SYSTEM' OR (s.scope IS NULL AND s.owner IS NULL)) " +
           "ORDER BY s.subjectCode ASC, s.subjectName ASC")
    List<Subject> findActiveSystemSubjects();

    @Query("SELECT COUNT(s) > 0 FROM Subject s WHERE s.status = 'ACTIVE' " +
           "AND (LOWER(s.subjectCode) = LOWER(:code)) " +
           "AND (s.scope = 'SYSTEM' OR (s.scope = 'USER_CUSTOM' AND s.owner = :owner)) " +
           "AND s.subjectId <> :subjectId")
    boolean existsDuplicateCodeForUpdate(
            @Param("code") String code,
            @Param("owner") User owner,
            @Param("subjectId") Integer subjectId
    );

    @Query("SELECT COUNT(s) FROM Subject s WHERE " +
           "(s.scope = 'SYSTEM' OR s.owner IS NULL) AND " +
           "(:search IS NULL OR :search = '' OR " +
           "LOWER(s.subjectCode) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(s.subjectName) LIKE LOWER(CONCAT('%', :search, '%')))")
    long countSystemSubjectsFiltered(@Param("search") String search);

    @Query("SELECT COUNT(s) FROM Subject s WHERE " +
           "(s.scope = 'SYSTEM' OR s.owner IS NULL) AND " +
           "s.status = :status AND " +
           "(:search IS NULL OR :search = '' OR " +
           "LOWER(s.subjectCode) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(s.subjectName) LIKE LOWER(CONCAT('%', :search, '%')))")
    long countSystemSubjectsFilteredByStatus(@Param("status") String status, @Param("search") String search);
}
