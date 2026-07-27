package com.demo.ai_study_hub;

import com.demo.ai_study_hub.dto.DocumentDownloadInfo;
import com.demo.ai_study_hub.dto.PublicDocumentResponse;
import com.demo.ai_study_hub.entity.Document;
import com.demo.ai_study_hub.repository.DocumentRepository;
import com.demo.ai_study_hub.service.AdminDocumentService;
import com.demo.ai_study_hub.service.DocumentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import com.demo.ai_study_hub.service.AdminAiUsageService;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminDocumentServiceTest {

    @Mock
    private DocumentRepository documentRepository;

    @Mock
    private DocumentService documentService;

    @Mock
    private AdminAiUsageService adminAiUsageService;
    @Spy
    private com.demo.ai_study_hub.service.DocumentPreviewHelper previewHelper;

    @Mock
    private com.demo.ai_study_hub.repository.UserFollowRepository userFollowRepository;

    @Mock
    private com.demo.ai_study_hub.service.NotificationService notificationService;

    @InjectMocks
    private AdminDocumentService adminDocumentService;

    private Document testDoc;
    private PublicDocumentResponse mockRes;

    @BeforeEach
    void setUp() {
        testDoc = new Document();
        testDoc.setDocumentId(1);
        testDoc.setFileUrl("http://example.com/file.pdf");
        testDoc.setTitle("Test Title");
        testDoc.setFileType("application/pdf");
        testDoc.setStatus("ACTIVE");
        testDoc.setVisibility("PUBLIC");

        mockRes = PublicDocumentResponse.builder()
                .documentId(1)
                .title("Test Title")
                .build();
    }

    @Test
    void getAdminDocumentDetail_Success() {
        when(documentRepository.findById(1)).thenReturn(Optional.of(testDoc));
        when(documentService.mapToPublicResponse(testDoc, null)).thenReturn(mockRes);

        PublicDocumentResponse res = adminDocumentService.getAdminDocumentDetail(1);

        assertNotNull(res);
        assertEquals(1, res.getDocumentId());
        assertEquals("Test Title", res.getTitle());
    }

    @Test
    void getAdminDocumentDetail_NotFound() {
        when(documentRepository.findById(1)).thenReturn(Optional.empty());

        assertThrows(ResponseStatusException.class, () -> adminDocumentService.getAdminDocumentDetail(1));
    }

    @Test
    void getAdminDocumentDetail_WhenPrivate_ShouldThrowForbidden() {
        testDoc.setVisibility("PRIVATE");
        when(documentRepository.findById(1)).thenReturn(Optional.of(testDoc));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                adminDocumentService.getAdminDocumentDetail(1));
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
    }

    @Test
    void getAdminDocumentDetail_WhenDeleted_ShouldThrowForbidden() {
        testDoc.setStatus("DELETED");
        when(documentRepository.findById(1)).thenReturn(Optional.of(testDoc));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                adminDocumentService.getAdminDocumentDetail(1));
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
    }

    @Test
    void getAdminDocumentDownloadInfo_Success() {
        when(documentRepository.findById(1)).thenReturn(Optional.of(testDoc));
        when(documentService.resolveDownloadFileName(testDoc)).thenReturn("Test Title");
        when(documentService.resolveContentType(testDoc)).thenReturn("application/pdf");

        DocumentDownloadInfo info = adminDocumentService.getAdminDocumentDownloadInfo(1);

        assertNotNull(info);
        assertEquals("http://example.com/file.pdf", info.getFileUrl());
        assertEquals("Test Title", info.getFileName());
        assertEquals("application/pdf", info.getContentType());
    }

    @Test
    void getAdminDocumentDownloadInfo_WhenPrivate_ShouldThrowForbidden() {
        testDoc.setVisibility("PRIVATE");
        when(documentRepository.findById(1)).thenReturn(Optional.of(testDoc));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                adminDocumentService.getAdminDocumentDownloadInfo(1));
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
    }

    @Test
    void getAdminDocumentDownloadInfo_WhenDeleted_ShouldThrowForbidden() {
        testDoc.setStatus("DELETED");
        when(documentRepository.findById(1)).thenReturn(Optional.of(testDoc));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                adminDocumentService.getAdminDocumentDownloadInfo(1));
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
    }

    @Test
    void getAdminDocumentDownloadInfo_NotFound() {
        when(documentRepository.findById(1)).thenReturn(Optional.empty());

        assertThrows(ResponseStatusException.class, () ->
                adminDocumentService.getAdminDocumentDownloadInfo(1));
    }

    @Test
    void approveDocument_Success_ShouldNotifyFollowers() {
        com.demo.ai_study_hub.entity.User creator = new com.demo.ai_study_hub.entity.User();
        creator.setUserId(10);
        creator.setFullName("Creator Name");

        testDoc.setOwner(creator);
        testDoc.setApprovalStatus("PENDING");

        com.demo.ai_study_hub.entity.User followerUser = new com.demo.ai_study_hub.entity.User();
        followerUser.setUserId(20);
        followerUser.setFullName("Follower Name");

        com.demo.ai_study_hub.entity.UserFollow follow = new com.demo.ai_study_hub.entity.UserFollow();
        follow.setFollower(followerUser);
        follow.setFollowing(creator);
        follow.setStatus("ACTIVE");

        when(documentRepository.findById(1)).thenReturn(Optional.of(testDoc));
        when(documentRepository.save(any(Document.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(userFollowRepository.findByFollowingAndStatus(creator, "ACTIVE")).thenReturn(java.util.List.of(follow));
        when(documentService.mapToPublicResponse(any(Document.class), eq(null))).thenReturn(mockRes);

        PublicDocumentResponse res = adminDocumentService.approveDocument(1);

        assertNotNull(res);
        assertEquals("APPROVED", testDoc.getApprovalStatus());
        org.mockito.Mockito.verify(notificationService).createNotification(
                eq(followerUser),
                eq("FOLLOWED_USER_DOCUMENT_APPROVED"),
                eq("New Document Uploaded"),
                org.mockito.Mockito.contains("published a new document"),
                eq("DOCUMENT"),
                eq(1L),
                eq(10)
        );
    }
}
