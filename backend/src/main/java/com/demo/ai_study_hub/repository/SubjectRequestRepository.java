package com.demo.ai_study_hub.repository;

import com.demo.ai_study_hub.entity.SubjectRequest;
import com.demo.ai_study_hub.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Optional;
import java.util.List;

@Repository
public interface SubjectRequestRepository extends JpaRepository<SubjectRequest, Integer>, JpaSpecificationExecutor<SubjectRequest> {

    List<SubjectRequest> findByRequestedByUser(User user);

    @Query("SELECT sr FROM SubjectRequest sr WHERE sr.requestedByUser = :user AND sr.requestedCode = :code ORDER BY sr.createdAt DESC")
    List<SubjectRequest> findByUserAndCodeOrderByCreatedAtDesc(@Param("user") User user, @Param("code") String code);

    Page<SubjectRequest> findByRequestedByUser(User user, Pageable pageable);

    boolean existsByRequestedCodeAndStatus(String requestedCode, String status);

    boolean existsByRequestedNameAndStatus(String requestedName, String status);

    @Query("""
           SELECT COUNT(sr) > 0
           FROM SubjectRequest sr
           WHERE sr.status = :status
             AND sr.major.majorId = :majorId
             AND (
                 UPPER(sr.requestedCode) = UPPER(:code)
                 OR LOWER(sr.requestedName) = LOWER(:name)
             )
           """)
    boolean existsPendingForMajor(
            @Param("code") String code,
            @Param("name") String name,
            @Param("majorId") Integer majorId,
            @Param("status") String status
    );

    long countByStatus(String status);

    @Query("SELECT COUNT(sr) FROM SubjectRequest sr WHERE " +
           "sr.status = :status AND " +
           "(:search IS NULL OR :search = '' OR " +
           "LOWER(sr.requestedCode) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(sr.requestedName) LIKE LOWER(CONCAT('%', :search, '%')))")
    long countFilteredRequestsByStatus(@Param("status") String status, @Param("search") String search);

    long countByRequestedCode(String requestedCode);
}
