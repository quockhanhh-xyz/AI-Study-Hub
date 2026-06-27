package com.demo.ai_study_hub;

import com.demo.ai_study_hub.dto.DocumentResponse;
import com.demo.ai_study_hub.dto.DocumentDownloadInfo;
import com.demo.ai_study_hub.dto.PublicDocumentResponse;
import com.demo.ai_study_hub.entity.*;
import com.demo.ai_study_hub.repository.*;
import com.demo.ai_study_hub.service.DocumentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PublicCommunityTest {

    @Mock
    private DocumentRepository documentRepository;
    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private DocumentService documentService;

    private User mockOwner;
    private Document mockDoc;

    @BeforeEach
    void setUp() {
        mockOwner = new User();
        mockOwner.setUserId(1);
        mockOwner.setEmail("owner@test.com");

        mockDoc = new Document();
        mockDoc.setDocumentId(10);
        mockDoc.setTitle("Study Guide");
        mockDoc.setOriginalFileName("guide.pdf");
        mockDoc.setFileType("PDF");
        mockDoc.setFileSize(2048L);
        mockDoc.setFileUrl("https://cloudinary.com/guide.pdf");
        mockDoc.setOwner(mockOwner);
        mockDoc.setStatus("ACTIVE");
        mockDoc.setVisibility("PRIVATE");
        mockDoc.setApprovalStatus("PENDING");
        mockDoc.setViewCount(0L);
        mockDoc.setDownloadCount(0L);
    }

    @Test
    void publishDocument_WhenSuccessful_ShouldSetPublicAndApproved() {
        when(userRepository.findByEmail("owner@test.com")).thenReturn(Optional.of(mockOwner));
        when(documentRepository.findById(10)).thenReturn(Optional.of(mockDoc));
        when(documentRepository.save(any(Document.class))).thenAnswer(i -> i.getArguments()[0]);

        DocumentResponse res = documentService.publishDocument(10, "owner@test.com");

        assertNotNull(res);
        assertEquals("PUBLIC", res.getVisibility());
        assertEquals("APPROVED", res.getApprovalStatus());
        assertNotNull(res.getPublishedAt());
        verify(documentRepository, times(1)).save(mockDoc);
    }

    @Test
    void unpublishDocument_WhenSuccessful_ShouldResetToPrivate() {
        mockDoc.setVisibility("PUBLIC");
        mockDoc.setApprovalStatus("APPROVED");
        mockDoc.setPublishedAt(LocalDateTime.now());

        when(userRepository.findByEmail("owner@test.com")).thenReturn(Optional.of(mockOwner));
        when(documentRepository.findById(10)).thenReturn(Optional.of(mockDoc));
        when(documentRepository.save(any(Document.class))).thenAnswer(i -> i.getArguments()[0]);

        DocumentResponse res = documentService.unpublishDocument(10, "owner@test.com");

        assertNotNull(res);
        assertEquals("PRIVATE", res.getVisibility());
        assertNull(res.getPublishedAt());
        verify(documentRepository, times(1)).save(mockDoc);
    }

    @Test
    void getPublicDocuments_ShouldFilterAndMapGuestPermissions() {
        mockDoc.setVisibility("PUBLIC");
        mockDoc.setApprovalStatus("APPROVED");
        when(documentRepository.findPublicDocumentsWithFilters(eq("physics"), eq(null), eq("PDF"), any(Sort.class)))
                .thenReturn(Collections.singletonList(mockDoc));

        List<PublicDocumentResponse> res = documentService.getPublicDocuments("physics", null, "PDF", "newest");

        assertNotNull(res);
        assertEquals(1, res.size());
        PublicDocumentResponse docRes = res.get(0);
        assertTrue(docRes.getCanPreview());
        assertTrue(docRes.getCanOpen());
        assertTrue(docRes.getCanDownload());
    }

    @Test
    void getPublicDocuments_WithDifferentSortTypes_ShouldPassCorrectSortToRepository() {
        mockDoc.setVisibility("PUBLIC");
        mockDoc.setApprovalStatus("APPROVED");

        // Test newest/default sort
        documentService.getPublicDocuments("physics", null, "PDF", "newest");
        verify(documentRepository).findPublicDocumentsWithFilters(
                eq("physics"), eq(null), eq("PDF"),
                eq(Sort.by(Sort.Order.desc("publishedAt"), Sort.Order.desc("createdAt")))
        );

        // Test mostViewed sort
        documentService.getPublicDocuments("physics", null, "PDF", "mostViewed");
        verify(documentRepository).findPublicDocumentsWithFilters(
                eq("physics"), eq(null), eq("PDF"),
                eq(Sort.by(Sort.Order.desc("viewCount"), Sort.Order.desc("publishedAt")))
        );

        // Test mostDownloaded sort
        documentService.getPublicDocuments("physics", null, "PDF", "mostDownloaded");
        verify(documentRepository).findPublicDocumentsWithFilters(
                eq("physics"), eq(null), eq("PDF"),
                eq(Sort.by(Sort.Order.desc("downloadCount"), Sort.Order.desc("publishedAt")))
        );
    }

    @Test
    void getPublicDocumentDetail_WhenPublicApproved_ShouldIncrementViewCount() {
        mockDoc.setVisibility("PUBLIC");
        mockDoc.setApprovalStatus("APPROVED");
        when(documentRepository.findById(10)).thenReturn(Optional.of(mockDoc));
        when(documentRepository.save(any(Document.class))).thenAnswer(i -> i.getArguments()[0]);

        PublicDocumentResponse res = documentService.getPublicDocumentDetail(10);

        assertNotNull(res);
        assertEquals(1, mockDoc.getViewCount());
        assertTrue(res.getCanOpen());
        verify(documentRepository, times(1)).save(mockDoc);
    }

    @Test
    void getPublicDocumentDetail_WhenPrivate_ShouldThrowNotFound() {
        mockDoc.setVisibility("PRIVATE");
        when(documentRepository.findById(10)).thenReturn(Optional.of(mockDoc));

        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> {
            documentService.getPublicDocumentDetail(10);
        });

        assertEquals(HttpStatus.NOT_FOUND, exception.getStatusCode());
        verify(documentRepository, never()).save(any());
    }

    @Test
    void getPublicDocumentDetail_WhenTrashed_ShouldThrowNotFound() {
        mockDoc.setVisibility("PUBLIC");
        mockDoc.setApprovalStatus("APPROVED");
        mockDoc.setStatus("DELETED");
        when(documentRepository.findById(10)).thenReturn(Optional.of(mockDoc));

        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> {
            documentService.getPublicDocumentDetail(10);
        });

        assertEquals(HttpStatus.NOT_FOUND, exception.getStatusCode());
        verify(documentRepository, never()).save(any());
    }

    @Test
    void getPublicDocumentDownloadInfo_WhenPublicApproved_ShouldNotIncrementDownloadCount() {
        mockDoc.setVisibility("PUBLIC");
        mockDoc.setApprovalStatus("APPROVED");
        when(documentRepository.findById(10)).thenReturn(Optional.of(mockDoc));

        DocumentDownloadInfo info = documentService.getPublicDocumentDownloadInfo(10);

        assertNotNull(info);
        assertEquals(0, mockDoc.getDownloadCount());
        assertEquals("https://cloudinary.com/guide.pdf", info.getFileUrl());
        verify(documentRepository, never()).save(any(Document.class));
    }

    @Test
    void incrementDownloadCount_ShouldIncrementSuccessfully() {
        when(documentRepository.existsById(10)).thenReturn(true);
        doNothing().when(documentRepository).incrementDownloadCountById(10);

        documentService.incrementDownloadCount(10);

        verify(documentRepository, times(1)).existsById(10);
        verify(documentRepository, times(1)).incrementDownloadCountById(10);
    }

    @Test
    void getPublicDocumentDownloadInfo_WhenPrivate_ShouldThrowNotFound() {
        mockDoc.setVisibility("PRIVATE");
        when(documentRepository.findById(10)).thenReturn(Optional.of(mockDoc));

        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> {
            documentService.getPublicDocumentDownloadInfo(10);
        });

        assertEquals(HttpStatus.NOT_FOUND, exception.getStatusCode());
        verify(documentRepository, never()).save(any());
    }
}
