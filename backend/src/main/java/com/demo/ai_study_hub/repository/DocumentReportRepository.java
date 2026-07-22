package com.demo.ai_study_hub.repository;

import com.demo.ai_study_hub.entity.Document;
import com.demo.ai_study_hub.entity.DocumentReport;
import com.demo.ai_study_hub.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface DocumentReportRepository extends JpaRepository<DocumentReport, Long> {

    @Query("SELECT r FROM DocumentReport r WHERE r.document = :document AND r.reporter = :reporter AND r.status = 'PENDING'")
    Optional<DocumentReport> findPendingReport(
            @Param("document") Document document,
            @Param("reporter") User reporter
    );

    @Query("SELECT r FROM DocumentReport r WHERE r.document = :document AND r.reporter = :reporter")
    Optional<DocumentReport> findByDocumentAndReporter(
            @Param("document") Document document,
            @Param("reporter") User reporter
    );

    Page<DocumentReport> findByStatus(String status, Pageable pageable);
    long countByStatus(String status);

    @Query("SELECT r FROM DocumentReport r WHERE " +
           "(:status IS NULL OR :status = '' OR r.status = :status) AND " +
           "(:reason IS NULL OR :reason = '' OR r.reason = :reason) AND " +
           "(:search IS NULL OR :search = '' OR " +
           "LOWER(r.document.title) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(r.reporter.fullName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(r.reporter.email) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(r.description) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<DocumentReport> searchReports(
            @Param("status") String status,
            @Param("reason") String reason,
            @Param("search") String search,
            Pageable pageable
    );

    @Query("SELECT r FROM DocumentReport r WHERE " +
           "(:status IS NULL OR :status = '' OR r.status = :status) AND " +
           "(:reason IS NULL OR :reason = '' OR r.reason = :reason) AND " +
           "(:search IS NULL OR :search = '' OR " +
           "LOWER(r.document.title) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(r.reporter.fullName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(r.reporter.email) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(r.description) LIKE LOWER(CONCAT('%', :search, '%')))")
    java.util.List<DocumentReport> searchReportsList(
            @Param("status") String status,
            @Param("reason") String reason,
            @Param("search") String search
    );

    @Query("SELECT COUNT(r) FROM DocumentReport r WHERE " +
           "(:status IS NULL OR :status = '' OR r.status = :status) AND " +
           "(:reason IS NULL OR :reason = '' OR r.reason = :reason) AND " +
           "(:search IS NULL OR :search = '' OR " +
           "LOWER(r.document.title) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(r.reporter.fullName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(r.reporter.email) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(r.description) LIKE LOWER(CONCAT('%', :search, '%')))")
    long countReportsFiltered(
            @Param("status") String status,
            @Param("reason") String reason,
            @Param("search") String search
    );
}
