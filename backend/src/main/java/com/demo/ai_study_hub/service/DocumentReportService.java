package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.entity.Document;
import com.demo.ai_study_hub.entity.DocumentReport;
import com.demo.ai_study_hub.entity.User;
import com.demo.ai_study_hub.repository.DocumentRepository;
import com.demo.ai_study_hub.repository.DocumentReportRepository;
import com.demo.ai_study_hub.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DocumentReportService {

    private final DocumentReportRepository documentReportRepository;
    private final DocumentRepository documentRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    private static final List<String> VALID_REASONS = Arrays.asList(
            "SPAM", "INAPPROPRIATE_CONTENT", "COPYRIGHT", 
            "MISLEADING_INFORMATION", "MALWARE_OR_UNSAFE_FILE", 
            "DUPLICATE_CONTENT", "OTHER"
    );

    @Transactional
    public DocumentReport reportDocument(Integer documentId, String reason, String description, String email) {
        User reporter = getUser(email);
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));

        // Validation: Must be PUBLIC, APPROVED, ACTIVE
        if (!"PUBLIC".equals(document.getVisibility()) || 
            !"APPROVED".equals(document.getApprovalStatus()) || 
            !"ACTIVE".equals(document.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only public, approved, active documents can be reported");
        }

        // Validation: Cannot report own document
        if (document.getOwner() != null && document.getOwner().getUserId().equals(reporter.getUserId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "You cannot report your own document");
        }

        // Validation: Reason must be valid
        if (reason == null || !VALID_REASONS.contains(reason.toUpperCase())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid report reason");
        }

        // Validation: Description required if reason is OTHER
        if ("OTHER".equalsIgnoreCase(reason) && (description == null || description.trim().isEmpty())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Description is required for 'OTHER' reason");
        }

        // Validation: Description limit 500 chars
        if (description != null && description.length() > 500) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Description cannot exceed 500 characters");
        }

        // Validation: Only one PENDING report per user per document
        documentReportRepository.findPendingReport(document, reporter).ifPresent(r -> {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "DOCUMENT_ALREADY_REPORTED");
        });

        DocumentReport report = new DocumentReport();
        report.setDocument(document);
        report.setReporter(reporter);
        report.setReason(reason.toUpperCase());
        report.setDescription(description != null ? description.trim() : null);
        report.setStatus("PENDING");

        DocumentReport savedReport = documentReportRepository.save(report);

        notificationService.notifyAllAdmins(
            "REPORT_SUBMITTED",
            "Document Reported",
            "Document '" + document.getTitle() + "' has been reported by " + reporter.getFullName() + " for: " + reason,
            "DOCUMENT_REPORT",
            savedReport.getReportId()
        );

        return savedReport;
    }

    public DocumentReport getReportStatus(Integer documentId, String email) {
        User reporter = getUser(email);
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));

        return documentReportRepository.findByDocumentAndReporter(document, reporter).orElse(null);
    }

    public Page<DocumentReport> getAdminReports(String status, Pageable pageable) {
        if (status != null && !status.trim().isEmpty()) {
            return documentReportRepository.findByStatus(status.trim().toUpperCase(), pageable);
        }
        return documentReportRepository.findAll(pageable);
    }

    public DocumentReport getAdminReportDetail(Long reportId) {
        return documentReportRepository.findById(reportId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Report not found"));
    }

    @Transactional
    public DocumentReport resolveReport(Long reportId, String resolutionNote, String adminEmail) {
        User admin = getUser(adminEmail);
        DocumentReport report = documentReportRepository.findById(reportId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Report not found"));

        if (!"PENDING".equals(report.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Report is already resolved or dismissed");
        }

        report.setStatus("RESOLVED");
        report.setResolvedBy(admin);
        report.setResolvedAt(LocalDateTime.now());
        report.setResolutionNote(resolutionNote != null ? resolutionNote.trim() : null);

        // Make the document PRIVATE
        if (report.getDocument() != null) {
            report.getDocument().setVisibility("PRIVATE");
            documentRepository.save(report.getDocument());
        }

        DocumentReport savedReport = documentReportRepository.save(report);

        // Notify reporter
        notificationService.createNotification(
            report.getReporter(),
            "REPORT_RESOLVED",
            "Your Report is Resolved",
            "Your report on document '" + report.getDocument().getTitle() + "' has been resolved. Action: Document Unpublished. Resolution: " + report.getResolutionNote(),
            "DOCUMENT_REPORT",
            report.getReportId()
        );

        return savedReport;
    }

    @Transactional
    public DocumentReport dismissReport(Long reportId, String resolutionNote, String adminEmail) {
        User admin = getUser(adminEmail);
        DocumentReport report = documentReportRepository.findById(reportId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Report not found"));

        if (!"PENDING".equals(report.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Report is already resolved or dismissed");
        }

        report.setStatus("DISMISSED");
        report.setResolvedBy(admin);
        report.setResolvedAt(LocalDateTime.now());
        report.setResolutionNote(resolutionNote != null ? resolutionNote.trim() : null);

        DocumentReport savedReport = documentReportRepository.save(report);

        // Notify reporter
        notificationService.createNotification(
            report.getReporter(),
            "REPORT_DISMISSED",
            "Your Report is Dismissed",
            "Your report on document '" + report.getDocument().getTitle() + "' has been dismissed. Resolution: " + report.getResolutionNote(),
            "DOCUMENT_REPORT",
            report.getReportId()
        );

        return savedReport;
    }

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }
}
