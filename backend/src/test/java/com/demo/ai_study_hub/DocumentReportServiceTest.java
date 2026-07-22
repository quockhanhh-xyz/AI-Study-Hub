package com.demo.ai_study_hub;

import com.demo.ai_study_hub.entity.Document;
import com.demo.ai_study_hub.entity.DocumentReport;
import com.demo.ai_study_hub.entity.User;
import com.demo.ai_study_hub.repository.DocumentRepository;
import com.demo.ai_study_hub.repository.DocumentReportRepository;
import com.demo.ai_study_hub.repository.UserRepository;
import com.demo.ai_study_hub.service.DocumentReportService;
import com.demo.ai_study_hub.service.NotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DocumentReportServiceTest {

    @Mock
    private DocumentReportRepository documentReportRepository;
    @Mock
    private DocumentRepository documentRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private DocumentReportService documentReportService;

    private User reporter;
    private User owner;
    private User admin;
    private Document doc;

    @BeforeEach
    void setUp() {
        reporter = new User();
        reporter.setUserId(1);
        reporter.setEmail("reporter@test.com");

        owner = new User();
        owner.setUserId(2);
        owner.setEmail("owner@test.com");

        admin = new User();
        admin.setUserId(3);
        admin.setEmail("admin@test.com");

        doc = new Document();
        doc.setDocumentId(100);
        doc.setOwner(owner);
        doc.setVisibility("PUBLIC");
        doc.setApprovalStatus("APPROVED");
        doc.setStatus("ACTIVE");
    }

    @Test
    void reportDocument_Success() {
        when(userRepository.findByEmail(reporter.getEmail())).thenReturn(Optional.of(reporter));
        when(documentRepository.findById(doc.getDocumentId())).thenReturn(Optional.of(doc));
        when(documentReportRepository.findPendingReport(doc, reporter)).thenReturn(Optional.empty());
        when(documentReportRepository.save(any(DocumentReport.class))).thenAnswer(inv -> inv.getArgument(0));

        DocumentReport report = documentReportService.reportDocument(
                doc.getDocumentId(), "SPAM", "This is spam", reporter.getEmail());

        assertNotNull(report);
        assertEquals("SPAM", report.getReason());
        assertEquals("This is spam", report.getDescription());
        assertEquals("PENDING", report.getStatus());
        assertEquals(doc, report.getDocument());
        assertEquals(reporter, report.getReporter());
    }

    @Test
    void reportDocument_Fail_ReporterIsOwner() {
        doc.setOwner(reporter); // reporter owns the document
        when(userRepository.findByEmail(reporter.getEmail())).thenReturn(Optional.of(reporter));
        when(documentRepository.findById(doc.getDocumentId())).thenReturn(Optional.of(doc));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> {
            documentReportService.reportDocument(doc.getDocumentId(), "SPAM", "Violative", reporter.getEmail());
        });
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        assertEquals("You cannot report your own document", ex.getReason());
    }

    @Test
    void reportDocument_Fail_DocNotPublic() {
        doc.setVisibility("PRIVATE");
        when(userRepository.findByEmail(reporter.getEmail())).thenReturn(Optional.of(reporter));
        when(documentRepository.findById(doc.getDocumentId())).thenReturn(Optional.of(doc));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> {
            documentReportService.reportDocument(doc.getDocumentId(), "SPAM", "Violative", reporter.getEmail());
        });
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        assertEquals("Only public, approved, active documents can be reported", ex.getReason());
    }

    @Test
    void reportDocument_Fail_DuplicatePending() {
        DocumentReport existingReport = new DocumentReport();
        existingReport.setStatus("PENDING");

        when(userRepository.findByEmail(reporter.getEmail())).thenReturn(Optional.of(reporter));
        when(documentRepository.findById(doc.getDocumentId())).thenReturn(Optional.of(doc));
        when(documentReportRepository.findPendingReport(doc, reporter)).thenReturn(Optional.of(existingReport));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> {
            documentReportService.reportDocument(doc.getDocumentId(), "SPAM", "Violative", reporter.getEmail());
        });
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        assertEquals("DOCUMENT_ALREADY_REPORTED", ex.getReason());
    }

    @Test
    void resolveReport_Success() {
        DocumentReport report = new DocumentReport();
        report.setReportId(500L);
        report.setStatus("PENDING");
        report.setDocument(doc);
        report.setReporter(reporter);

        when(userRepository.findByEmail(admin.getEmail())).thenReturn(Optional.of(admin));
        when(documentReportRepository.findById(500L)).thenReturn(Optional.of(report));
        when(documentReportRepository.save(any(DocumentReport.class))).thenAnswer(inv -> inv.getArgument(0));

        DocumentReport result = documentReportService.resolveReport(500L, "Resolved with unpublishing", admin.getEmail());

        assertNotNull(result);
        assertEquals("RESOLVED", result.getStatus());
        assertEquals(admin, result.getResolvedBy());
        assertEquals("Resolved with unpublishing", result.getResolutionNote());
        assertNotNull(result.getResolvedAt());
    }

    @Test
    void dismissReport_Success() {
        DocumentReport report = new DocumentReport();
        report.setReportId(500L);
        report.setStatus("PENDING");
        report.setDocument(doc);
        report.setReporter(reporter);

        when(userRepository.findByEmail(admin.getEmail())).thenReturn(Optional.of(admin));
        when(documentReportRepository.findById(500L)).thenReturn(Optional.of(report));
        when(documentReportRepository.save(any(DocumentReport.class))).thenAnswer(inv -> inv.getArgument(0));

        DocumentReport result = documentReportService.dismissReport(500L, "Report is invalid", admin.getEmail());

        assertNotNull(result);
        assertEquals("DISMISSED", result.getStatus());
        assertEquals(admin, result.getResolvedBy());
        assertEquals("Report is invalid", result.getResolutionNote());
        assertNotNull(result.getResolvedAt());
    }

    @Test
    void getReportStats_Success() {
        when(documentReportRepository.countReportsFiltered(null, null, null)).thenReturn(10L);
        when(documentReportRepository.countReportsFiltered("PENDING", null, null)).thenReturn(5L);
        when(documentReportRepository.countReportsFiltered("RESOLVED", null, null)).thenReturn(3L);
        when(documentReportRepository.countReportsFiltered("DISMISSED", null, null)).thenReturn(2L);

        java.util.Map<String, Long> stats = documentReportService.getReportStats(null, null, null);

        assertEquals(10L, stats.get("total"));
        assertEquals(5L, stats.get("pending"));
        assertEquals(3L, stats.get("resolved"));
        assertEquals(2L, stats.get("dismissed"));
    }
}
