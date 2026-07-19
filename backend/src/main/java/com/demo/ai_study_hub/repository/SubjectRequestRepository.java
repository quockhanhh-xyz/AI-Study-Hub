package com.demo.ai_study_hub.repository;

import com.demo.ai_study_hub.entity.SubjectRequest;
import com.demo.ai_study_hub.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.List;

@Repository
public interface SubjectRequestRepository extends JpaRepository<SubjectRequest, Integer>, JpaSpecificationExecutor<SubjectRequest> {

    List<SubjectRequest> findByRequestedByUser(User user);

    Page<SubjectRequest> findByRequestedByUser(User user, Pageable pageable);

    boolean existsByRequestedCodeAndStatus(String requestedCode, String status);

    boolean existsByRequestedNameAndStatus(String requestedName, String status);
}
