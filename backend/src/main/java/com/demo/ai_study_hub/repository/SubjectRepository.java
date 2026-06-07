package com.demo.ai_study_hub.repository;

import com.demo.ai_study_hub.entity.Subject;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SubjectRepository extends JpaRepository<Subject, Integer> {
    List<Subject> findByStatus(String status);
    boolean existsBySubjectCode(String subjectCode);
}