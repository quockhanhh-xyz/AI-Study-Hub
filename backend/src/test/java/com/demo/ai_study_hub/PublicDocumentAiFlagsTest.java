package com.demo.ai_study_hub;

import com.demo.ai_study_hub.dto.PublicDocumentResponse;
import com.demo.ai_study_hub.entity.*;
import com.demo.ai_study_hub.repository.*;
import com.demo.ai_study_hub.service.DocumentService;
import com.demo.ai_study_hub.service.TierPolicyService;
import com.demo.ai_study_hub.service.CloudinaryStorageService;
import com.demo.ai_study_hub.service.FolderShareService;
import com.demo.ai_study_hub.service.UsageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Tests for canUseAiTools / canProcess / canReprocess flags
 * on PublicDocumentResponse (Step A BE2).
 */
@ExtendWith(MockitoExtension.class)
class PublicDocumentAiFlagsTest {

    @Mock private DocumentRepository documentRepository;
    @Mock private UserRepository userRepository;
    @Mock private DocumentFavoriteRepository documentFavoriteRepository;
    @Mock private SubjectRequestRepository subjectRequestRepository;

    @Mock
    private TierPolicyService tierPolicyService;
    @Spy
    private com.demo.ai_study_hub.service.DocumentPreviewHelper previewHelper;
    @Mock
    private com.demo.ai_study_hub.repository.DocumentRatingRepository documentRatingRepository;
    @Mock
    private com.demo.ai_study_hub.repository.DocumentReportRepository documentReportRepository;
    @Mock
    private SubjectRepository subjectRepository;
    @Mock
    private FolderRepository folderRepository;
    @Mock
    private DocumentShareRepository documentShareRepository;
    @Mock
    private GroupDocumentShareRepository groupDocumentShareRepository;
    @Mock
    private StudyGroupMemberRepository studyGroupMemberRepository;
    @Mock
    private DocumentContentRepository documentContentRepository;
    @Mock
    private DocumentChunkRepository documentChunkRepository;
    @Mock
    private CloudinaryStorageService cloudinaryStorageService;
    @Mock
    private FolderShareService folderShareService;
    @Mock
    private UsageService usageService;
    @Mock
    private com.demo.ai_study_hub.service.NotificationService notificationService;
    @Mock
    private org.springframework.transaction.PlatformTransactionManager transactionManager;

    @InjectMocks
    private DocumentService documentService;

    private User owner;
    private User nonOwner;
    private Document doc;
    private DocumentContent content;

    @BeforeEach
    void setUp() {
        owner = new User();
        owner.setUserId(1);
        owner.setEmail("owner@test.com");

        nonOwner = new User();
        nonOwner.setUserId(2);
        nonOwner.setEmail("other@test.com");

        content = new DocumentContent();

        doc = new Document();
        doc.setDocumentId(10);
        doc.setTitle("Physics Notes");
        doc.setOwner(owner);
        doc.setStatus("ACTIVE");
        doc.setVisibility("PUBLIC");
        doc.setApprovalStatus("APPROVED");
        doc.setViewCount(0L);
        doc.setDownloadCount(0L);
        doc.setDocumentContent(content);

        lenient().when(documentFavoriteRepository.existsByUserAndDocument(any(), any())).thenReturn(false);
    }

    // --- Guest (no email) ---

    @Test
    void guest_AllAiFlagsFalse_WhenCompleted() {
        content.setProcessingStatus(ProcessingStatus.COMPLETED);

        when(documentRepository.findPublicDocumentsWithFilters(any(), any(), any(), any()))
                .thenReturn(Collections.singletonList(doc));

        List<PublicDocumentResponse> results = documentService.getPublicDocuments(null, null, null, null, null);
        PublicDocumentResponse res = results.get(0);

        assertFalse(res.getCanUseAiTools());
        assertFalse(res.getCanProcess());
        assertFalse(res.getCanReprocess());
    }

    // --- Authenticated non-owner ---

    @Test
    void nonOwner_WhenCompleted_CanUseAiToolsTrue_CanProcessFalse_CanReprocessFalse() {
        content.setProcessingStatus(ProcessingStatus.COMPLETED);

        when(documentRepository.findPublicDocumentsWithFilters(any(), any(), any(), any()))
                .thenReturn(Collections.singletonList(doc));
        when(userRepository.findByEmail("other@test.com")).thenReturn(Optional.of(nonOwner));

        List<PublicDocumentResponse> results = documentService.getPublicDocuments(null, null, null, null, "other@test.com");
        PublicDocumentResponse res = results.get(0);

        assertTrue(res.getCanUseAiTools());
        assertFalse(res.getCanProcess());
        assertFalse(res.getCanReprocess());
    }

    @Test
    void nonOwner_WhenPending_AllAiFlagsFalse() {
        content.setProcessingStatus(ProcessingStatus.PENDING);

        when(documentRepository.findPublicDocumentsWithFilters(any(), any(), any(), any()))
                .thenReturn(Collections.singletonList(doc));
        when(userRepository.findByEmail("other@test.com")).thenReturn(Optional.of(nonOwner));

        List<PublicDocumentResponse> results = documentService.getPublicDocuments(null, null, null, null, "other@test.com");
        PublicDocumentResponse res = results.get(0);

        assertFalse(res.getCanUseAiTools());
        assertFalse(res.getCanProcess());
        assertFalse(res.getCanReprocess());
    }

    // --- Owner ---

    @Test
    void owner_WhenCompleted_CanUseAiToolsTrue_CanProcessFalse_CanReprocessTrue() {
        content.setProcessingStatus(ProcessingStatus.COMPLETED);

        when(documentRepository.findPublicDocumentsWithFilters(any(), any(), any(), any()))
                .thenReturn(Collections.singletonList(doc));
        when(userRepository.findByEmail("owner@test.com")).thenReturn(Optional.of(owner));

        List<PublicDocumentResponse> results = documentService.getPublicDocuments(null, null, null, null, "owner@test.com");
        PublicDocumentResponse res = results.get(0);

        assertTrue(res.getCanUseAiTools());
        assertFalse(res.getCanProcess());
        assertTrue(res.getCanReprocess());
    }

    @Test
    void owner_WhenPending_CanProcessTrue_OthersFalse() {
        content.setProcessingStatus(ProcessingStatus.PENDING);

        when(documentRepository.findPublicDocumentsWithFilters(any(), any(), any(), any()))
                .thenReturn(Collections.singletonList(doc));
        when(userRepository.findByEmail("owner@test.com")).thenReturn(Optional.of(owner));

        List<PublicDocumentResponse> results = documentService.getPublicDocuments(null, null, null, null, "owner@test.com");
        PublicDocumentResponse res = results.get(0);

        assertFalse(res.getCanUseAiTools());
        assertTrue(res.getCanProcess());
        assertFalse(res.getCanReprocess());
    }

    @Test
    void owner_WhenFailed_CanProcessTrue_CanReprocessTrue_CanUseAiFalse() {
        content.setProcessingStatus(ProcessingStatus.FAILED);

        when(documentRepository.findPublicDocumentsWithFilters(any(), any(), any(), any()))
                .thenReturn(Collections.singletonList(doc));
        when(userRepository.findByEmail("owner@test.com")).thenReturn(Optional.of(owner));

        List<PublicDocumentResponse> results = documentService.getPublicDocuments(null, null, null, null, "owner@test.com");
        PublicDocumentResponse res = results.get(0);

        assertFalse(res.getCanUseAiTools());
        assertTrue(res.getCanProcess());
        assertTrue(res.getCanReprocess());
    }

    @Test
    void owner_WhenUnsupported_CanProcessTrue_CanReprocessFalse() {
        content.setProcessingStatus(ProcessingStatus.UNSUPPORTED);

        when(documentRepository.findPublicDocumentsWithFilters(any(), any(), any(), any()))
                .thenReturn(Collections.singletonList(doc));
        when(userRepository.findByEmail("owner@test.com")).thenReturn(Optional.of(owner));

        List<PublicDocumentResponse> results = documentService.getPublicDocuments(null, null, null, null, "owner@test.com");
        PublicDocumentResponse res = results.get(0);

        assertFalse(res.getCanUseAiTools());
        assertTrue(res.getCanProcess());
        assertFalse(res.getCanReprocess());
    }

    @Test
    void owner_WhenEmptyContent_CanProcessTrue_CanReprocessFalse() {
        content.setProcessingStatus(ProcessingStatus.EMPTY_CONTENT);

        when(documentRepository.findPublicDocumentsWithFilters(any(), any(), any(), any()))
                .thenReturn(Collections.singletonList(doc));
        when(userRepository.findByEmail("owner@test.com")).thenReturn(Optional.of(owner));

        List<PublicDocumentResponse> results = documentService.getPublicDocuments(null, null, null, null, "owner@test.com");
        PublicDocumentResponse res = results.get(0);

        assertFalse(res.getCanUseAiTools());
        assertTrue(res.getCanProcess());
        assertFalse(res.getCanReprocess());
    }

    @Test
    void noDocumentContent_AllAiFlagsFalse() {
        doc.setDocumentContent(null);

        when(documentRepository.findPublicDocumentsWithFilters(any(), any(), any(), any()))
                .thenReturn(Collections.singletonList(doc));
        when(userRepository.findByEmail("owner@test.com")).thenReturn(Optional.of(owner));

        List<PublicDocumentResponse> results = documentService.getPublicDocuments(null, null, null, null, "owner@test.com");
        PublicDocumentResponse res = results.get(0);

        assertFalse(res.getCanUseAiTools());
        assertTrue(res.getCanProcess()); // status is PENDING (default from null content)
        assertFalse(res.getCanReprocess());
    }
}
