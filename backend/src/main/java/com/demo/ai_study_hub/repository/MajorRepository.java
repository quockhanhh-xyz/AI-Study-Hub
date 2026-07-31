package com.demo.ai_study_hub.repository;

import com.demo.ai_study_hub.entity.Major;
import com.demo.ai_study_hub.entity.School;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface MajorRepository extends JpaRepository<Major, Integer>, JpaSpecificationExecutor<Major> {
    List<Major> findBySchool_SchoolId(Integer schoolId);
    List<Major> findBySchool_SchoolIdAndStatus(Integer schoolId, String status);
    Optional<Major> findBySchool_SchoolIdAndMajorCodeIgnoreCase(Integer schoolId, String majorCode);
    Optional<Major> findBySchool_SchoolIdAndMajorNameIgnoreCase(Integer schoolId, String majorName);
    boolean existsBySchoolAndMajorCodeIgnoreCase(School school, String majorCode);
    boolean existsBySchoolAndMajorCodeIgnoreCaseAndMajorIdNot(School school, String majorCode, Integer majorId);
    boolean existsBySchoolAndMajorNameIgnoreCase(School school, String majorName);
    boolean existsBySchoolAndMajorNameIgnoreCaseAndMajorIdNot(School school, String majorName, Integer majorId);
    boolean existsBySchoolSchoolId(Integer schoolId);
}
