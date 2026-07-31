package com.demo.ai_study_hub.controller;

import com.demo.ai_study_hub.dto.ApiResponse;
import com.demo.ai_study_hub.dto.DocumentReportRequest;
import com.demo.ai_study_hub.dto.DocumentReportResponse;
import com.demo.ai_study_hub.entity.DocumentReport;
import com.demo.ai_study_hub.service.DocumentReportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.security.Principal;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class DocumentReportController {

    private final DocumentReportService documentReportService;

    @PostMapping("/api/public/documents/{documentId}/reports")
    public ResponseEntity<ApiResponse<DocumentReportResponse>> reportDocument(
            @PathVariable Integer documentId,
            @Valid @RequestBody DocumentReportRequest request,
            Principal principal) {
        try {
            DocumentReport report = documentReportService.reportDocument(
                    documentId, request.getReason(), request.getDescription(), principal.getName());
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.success(mapToResponse(report), "Report submitted successfully"));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(ApiResponse.error(e.getReason()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/api/public/documents/{documentId}/report-status")
    public ResponseEntity<ApiResponse<DocumentReportResponse>> getReportStatus(
            @PathVariable Integer documentId,
            Principal principal) {
        DocumentReport report = documentReportService.getReportStatus(documentId, principal.getName());
        return ResponseEntity.ok(ApiResponse.success(report != null ? mapToResponse(report) : null, "Report status retrieved"));
    }

    @GetMapping("/api/admin/document-reports")
    public ResponseEntity<ApiResponse<Page<DocumentReportResponse>>> getAdminReports(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String reason,
            @RequestParam(required = false) String search,
            Pageable pageable) {
        Page<DocumentReport> reports = documentReportService.getAdminReports(status, reason, search, pageable);
        return ResponseEntity.ok(ApiResponse.success(reports.map(this::mapToResponse), "Admin reports retrieved successfully"));
    }

    @GetMapping("/api/admin/document-reports/stats")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getReportStats(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String reason,
            @RequestParam(required = false) String search
    ) {
        Map<String, Long> stats = documentReportService.getReportStats(status, reason, search);
        return ResponseEntity.ok(ApiResponse.success(stats, "Report stats retrieved successfully"));
    }

    @GetMapping("/api/admin/document-reports/{reportId}")
    public ResponseEntity<ApiResponse<DocumentReportResponse>> getAdminReportDetail(
            @PathVariable Long reportId) {
        try {
            DocumentReport report = documentReportService.getAdminReportDetail(reportId);
            return ResponseEntity.ok(ApiResponse.success(mapToResponse(report), "Report details retrieved successfully"));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(ApiResponse.error(e.getReason()));
        }
    }

    @PatchMapping("/api/admin/document-reports/{reportId}/resolve")
    public ResponseEntity<ApiResponse<DocumentReportResponse>> resolveReport(
            @PathVariable Long reportId,
            @RequestBody(required = false) Map<String, String> body,
            Principal principal) {
        try {
            String note = body != null ? body.get("resolutionNote") : null;
            DocumentReport report = documentReportService.resolveReport(reportId, note, principal.getName());
            return ResponseEntity.ok(ApiResponse.success(mapToResponse(report), "Report resolved successfully"));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(ApiResponse.error(e.getReason()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.error(e.getMessage()));
        }
    }

    @PatchMapping("/api/admin/document-reports/{reportId}/dismiss")
    public ResponseEntity<ApiResponse<DocumentReportResponse>> dismissReport(
            @PathVariable Long reportId,
            @RequestBody(required = false) Map<String, String> body,
            Principal principal) {
        try {
            String note = body != null ? body.get("resolutionNote") : null;
            DocumentReport report = documentReportService.dismissReport(reportId, note, principal.getName());
            return ResponseEntity.ok(ApiResponse.success(mapToResponse(report), "Report dismissed successfully"));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(ApiResponse.error(e.getReason()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/api/admin/document-reports/export")
    public ResponseEntity<byte[]> exportReports(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String reason,
            @RequestParam(required = false) String search
    ) {
        byte[] data = documentReportService.exportReports(status, reason, search);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
        headers.setContentDispositionFormData("attachment", "violation_reports.xlsx");
        return ResponseEntity.ok().headers(headers).body(data);
    }

    private DocumentReportResponse mapToResponse(DocumentReport r) {
        return DocumentReportResponse.builder()
                .reportId(r.getReportId())
                .documentId(r.getDocument() != null ? r.getDocument().getDocumentId() : null)
                .documentTitle(r.getDocument() != null ? r.getDocument().getTitle() : null)
                .reporterId(r.getReporter() != null ? r.getReporter().getUserId() : null)
                .reporterEmail(r.getReporter() != null ? r.getReporter().getEmail() : null)
                .reporterName(r.getReporter() != null ? r.getReporter().getFullName() : null)
                .reason(r.getReason())
                .description(r.getDescription())
                .status(r.getStatus())
                .resolvedById(r.getResolvedBy() != null ? r.getResolvedBy().getUserId() : null)
                .resolvedByName(r.getResolvedBy() != null ? r.getResolvedBy().getFullName() : null)
                .resolutionNote(r.getResolutionNote())
                .createdAt(r.getCreatedAt())
                .resolvedAt(r.getResolvedAt())
                .build();
    }
}
