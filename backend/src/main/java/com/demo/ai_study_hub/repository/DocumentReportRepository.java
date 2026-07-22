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
}
