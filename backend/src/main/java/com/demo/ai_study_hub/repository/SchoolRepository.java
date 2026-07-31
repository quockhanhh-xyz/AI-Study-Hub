package com.demo.ai_study_hub.repository;

import com.demo.ai_study_hub.entity.School;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface SchoolRepository extends JpaRepository<School, Integer>, JpaSpecificationExecutor<School> {
    List<School> findByStatus(String status);
    Optional<School> findBySchoolCodeIgnoreCase(String schoolCode);
    boolean existsBySchoolCodeIgnoreCase(String schoolCode);
    boolean existsBySchoolCodeIgnoreCaseAndSchoolIdNot(String schoolCode, Integer schoolId);
}
