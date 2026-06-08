package com.demo.ai_study_hub.repository;

import com.demo.ai_study_hub.entity.Subject;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SubjectRepository extends JpaRepository<Subject, Integer> {
    List<Subject> findByStatus(String status);
    boolean existsBySubjectCode(String subjectCode);
}