package com.demo.ai_study_hub.repository;

import com.demo.ai_study_hub.entity.Subject;
import com.demo.ai_study_hub.entity.SubjectMajorMapping;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SubjectMajorMappingRepository extends JpaRepository<SubjectMajorMapping, Integer> {

    boolean existsBySubject_SubjectIdAndMajor_MajorId(Integer subjectId, Integer majorId);

    List<SubjectMajorMapping> findBySubject_SubjectIdOrderByMajor_School_SchoolNameAscMajor_MajorNameAsc(
            Integer subjectId
    );

    @Modifying(clearAutomatically = true)
    void deleteBySubject_SubjectId(Integer subjectId);

    @Query("""
            SELECT DISTINCT mapping.subject
            FROM SubjectMajorMapping mapping
            WHERE mapping.major.majorId = :majorId
              AND mapping.subject.status = 'ACTIVE'
              AND mapping.subject.scope = 'SYSTEM'
              AND mapping.major.status = 'ACTIVE'
              AND mapping.major.school.status = 'ACTIVE'
            ORDER BY mapping.subject.subjectCode, mapping.subject.subjectName
            """)
    List<Subject> findActiveSystemSubjectsByMajor(@Param("majorId") Integer majorId);

    @Query("""
            SELECT DISTINCT mapping.subject.subjectId
            FROM SubjectMajorMapping mapping
            WHERE (:schoolId IS NULL OR mapping.major.school.schoolId = :schoolId)
              AND (:majorId IS NULL OR mapping.major.majorId = :majorId)
            """)
    List<Integer> findSubjectIdsBySchoolAndMajor(
            @Param("schoolId") Integer schoolId,
            @Param("majorId") Integer majorId
    );
}
