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
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import java.io.ByteArrayOutputStream;
import java.io.IOException;

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
        return getAdminReports(status, null, null, pageable);
    }

    public Page<DocumentReport> getAdminReports(String status, String reason, String search, Pageable pageable) {
        String cleanStatus = (status != null && !status.trim().isEmpty()) ? status.trim().toUpperCase() : null;
        String cleanReason = (reason != null && !reason.trim().isEmpty()) ? reason.trim().toUpperCase() : null;
        String cleanSearch = (search != null && !search.trim().isEmpty()) ? search.trim() : null;
        return documentReportRepository.searchReports(cleanStatus, cleanReason, cleanSearch, pageable);
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

    public java.util.Map<String, Long> getReportStats(String status, String reason, String search) {
        String cleanStatus = (status != null && !status.trim().isEmpty()) ? status.trim().toUpperCase() : null;
        String cleanReason = (reason != null && !reason.trim().isEmpty()) ? reason.trim().toUpperCase() : null;
        String cleanSearch = (search != null && !search.trim().isEmpty()) ? search.trim() : null;

        java.util.Map<String, Long> stats = new java.util.HashMap<>();
        // Total = all matching filter (no status restriction)
        stats.put("total", documentReportRepository.countReportsFiltered(null, cleanReason, cleanSearch));
        stats.put("pending", documentReportRepository.countReportsFiltered("PENDING", cleanReason, cleanSearch));
        stats.put("resolved", documentReportRepository.countReportsFiltered("RESOLVED", cleanReason, cleanSearch));
        stats.put("dismissed", documentReportRepository.countReportsFiltered("DISMISSED", cleanReason, cleanSearch));
        return stats;
    }

    public byte[] exportReports(String status, String reason, String search) {
        String cleanStatus = (status != null && !status.trim().isEmpty()) ? status.trim().toUpperCase() : null;
        String cleanReason = (reason != null && !reason.trim().isEmpty()) ? reason.trim().toUpperCase() : null;
        String cleanSearch = (search != null && !search.trim().isEmpty()) ? search.trim() : null;

        List<DocumentReport> reports = documentReportRepository.searchReportsList(cleanStatus, cleanReason, cleanSearch);

        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Violation Reports");
            Row headerRow = sheet.createRow(0);
            headerRow.createCell(0).setCellValue("Report ID");
            headerRow.createCell(1).setCellValue("Document Title");
            headerRow.createCell(2).setCellValue("Reporter Name");
            headerRow.createCell(3).setCellValue("Reporter Email");
            headerRow.createCell(4).setCellValue("Reason");
            headerRow.createCell(5).setCellValue("Description");
            headerRow.createCell(6).setCellValue("Status");
            headerRow.createCell(7).setCellValue("Resolved By");
            headerRow.createCell(8).setCellValue("Resolution Note");
            headerRow.createCell(9).setCellValue("Created At");
            headerRow.createCell(10).setCellValue("Resolved At");

            int rowIdx = 1;
            for (DocumentReport report : reports) {
                Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(report.getReportId());
                row.createCell(1).setCellValue(report.getDocument() != null ? report.getDocument().getTitle() : "Deleted Document");
                row.createCell(2).setCellValue(report.getReporter() != null ? report.getReporter().getFullName() : "Unknown");
                row.createCell(3).setCellValue(report.getReporter() != null ? report.getReporter().getEmail() : "");
                row.createCell(4).setCellValue(report.getReason());
                row.createCell(5).setCellValue(report.getDescription());
                row.createCell(6).setCellValue(report.getStatus());
                row.createCell(7).setCellValue(report.getResolvedBy() != null ? report.getResolvedBy().getFullName() : "");
                row.createCell(8).setCellValue(report.getResolutionNote());
                row.createCell(9).setCellValue(report.getCreatedAt() != null ? report.getCreatedAt().toString() : "");
                row.createCell(10).setCellValue(report.getResolvedAt() != null ? report.getResolvedAt().toString() : "");
            }

            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Error exporting violation reports to Excel", e);
        }
    }

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }
}
