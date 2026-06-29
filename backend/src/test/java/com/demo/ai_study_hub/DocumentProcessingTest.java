package com.demo.ai_study_hub;

import com.demo.ai_study_hub.dto.DocumentResponse;
import com.demo.ai_study_hub.dto.ExtractionResult;
import com.demo.ai_study_hub.entity.*;
import com.demo.ai_study_hub.repository.*;
import com.demo.ai_study_hub.service.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DocumentProcessingTest {

    @Mock
    private DocumentRepository documentRepository;
    @Mock
    private DocumentContentRepository documentContentRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private DocumentProcessingWorker documentProcessingWorker;
    @Mock
    private DocumentShareRepository documentShareRepository;
    @Mock
    private GroupDocumentShareRepository groupDocumentShareRepository;
    @Mock
    private StudyGroupMemberRepository studyGroupMemberRepository;
    @Mock
    private FolderShareService folderShareService;
    @Mock
    private DocumentService documentService;

    @InjectMocks
    private DocumentProcessingService documentProcessingService;

    private User owner;
    private User otherUser;
    private Document document;
    private DocumentContent pendingContent;
    private DocumentContent processingContent;
    private DocumentContent completedContent;

    @BeforeEach
    void setUp() {
        owner = new User();
        owner.setUserId(1);
        owner.setEmail("owner@gmail.com");
        owner.setFullName("Document Owner");

        otherUser = new User();
        otherUser.setUserId(2);
        otherUser.setEmail("other@gmail.com");
        otherUser.setFullName("Shared User");

        document = new Document();
        document.setDocumentId(10);
        document.setTitle("Test Doc");
        document.setOwner(owner);
        document.setStatus("ACTIVE");
        document.setVisibility("PRIVATE");

        pendingContent = DocumentContent.builder()
                .contentId(1L)
                .document(document)
                .processingStatus(ProcessingStatus.PENDING)
                .build();

        processingContent = DocumentContent.builder()
                .contentId(1L)
                .document(document)
                .processingStatus(ProcessingStatus.PROCESSING)
                .processingStartedAt(LocalDateTime.now())
                .build();

        completedContent = DocumentContent.builder()
                .contentId(1L)
                .document(document)
                .processingStatus(ProcessingStatus.COMPLETED)
                .extractedText("Mock Text")
                .build();
    }

    @Test
    void startProcessing_WhenOwnerAndPending_ShouldSucceedAndTriggerWorker() {
        when(userRepository.findByEmail("owner@gmail.com")).thenReturn(Optional.of(owner));
        when(documentRepository.findById(10)).thenReturn(Optional.of(document));
        when(documentService.findOrCreatePending(document)).thenReturn(pendingContent);
        when(documentContentRepository.findByDocumentIdForWrite(10)).thenReturn(Optional.of(pendingContent));

        DocumentResponse mockResponse = DocumentResponse.builder()
                .documentId(10)
                .processingStatus("PROCESSING")
                .build();
        when(documentService.mapToResponseList(anyList(), eq(owner))).thenReturn(List.of(mockResponse));

        DocumentResponse response = documentProcessingService.startProcessing(10, "owner@gmail.com");

        assertNotNull(response);
        assertEquals("PROCESSING", response.getProcessingStatus());
        verify(documentContentRepository, times(1)).save(pendingContent);
        verify(documentProcessingWorker, times(1)).processDocumentAsync(eq(10), eq(ProcessingStatus.PENDING));
    }

    @Test
    void startProcessing_WhenAlreadyProcessing_ShouldThrowConflict() {
        when(userRepository.findByEmail("owner@gmail.com")).thenReturn(Optional.of(owner));
        when(documentRepository.findById(10)).thenReturn(Optional.of(document));
        when(documentService.findOrCreatePending(document)).thenReturn(processingContent);
        when(documentContentRepository.findByDocumentIdForWrite(10)).thenReturn(Optional.of(processingContent));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                documentProcessingService.startProcessing(10, "owner@gmail.com")
        );

        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
        assertEquals("Document is already being processed", ex.getReason());
    }

    @Test
    void startProcessing_WhenAlreadyCompleted_ShouldThrowConflict() {
        when(userRepository.findByEmail("owner@gmail.com")).thenReturn(Optional.of(owner));
        when(documentRepository.findById(10)).thenReturn(Optional.of(document));
        when(documentService.findOrCreatePending(document)).thenReturn(completedContent);
        when(documentContentRepository.findByDocumentIdForWrite(10)).thenReturn(Optional.of(completedContent));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                documentProcessingService.startProcessing(10, "owner@gmail.com")
        );

        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
        assertTrue(ex.getReason().contains("already processed"));
    }

    @Test
    void startProcessing_WhenNotOwner_ShouldThrowForbidden() {
        when(userRepository.findByEmail("other@gmail.com")).thenReturn(Optional.of(otherUser));
        when(documentRepository.findById(10)).thenReturn(Optional.of(document));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                documentProcessingService.startProcessing(10, "other@gmail.com")
        );

        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
    }

    @Test
    void startReprocessing_WhenOwnerAndCompleted_ShouldSucceed() {
        when(userRepository.findByEmail("owner@gmail.com")).thenReturn(Optional.of(owner));
        when(documentRepository.findById(10)).thenReturn(Optional.of(document));
        when(documentService.findOrCreatePending(document)).thenReturn(completedContent);
        when(documentContentRepository.findByDocumentIdForWrite(10)).thenReturn(Optional.of(completedContent));

        DocumentResponse mockResponse = DocumentResponse.builder()
                .documentId(10)
                .processingStatus("PROCESSING")
                .build();
        when(documentService.mapToResponseList(anyList(), eq(owner))).thenReturn(List.of(mockResponse));

        DocumentResponse response = documentProcessingService.startReprocessing(10, "owner@gmail.com");

        assertNotNull(response);
        assertEquals("PROCESSING", response.getProcessingStatus());
        verify(documentContentRepository, times(1)).save(completedContent);
        verify(documentProcessingWorker, times(1)).processDocumentAsync(eq(10), eq(ProcessingStatus.COMPLETED));
    }

    @Test
    void getProcessingStatus_WhenOutsider_ShouldThrowNotFound() {
        when(userRepository.findByEmail("other@gmail.com")).thenReturn(Optional.of(otherUser));
        when(documentRepository.findById(10)).thenReturn(Optional.of(document));
        when(documentShareRepository.findByDocumentAndSharedWithAndStatus(document, otherUser, "ACTIVE")).thenReturn(Optional.empty());

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                documentProcessingService.getProcessingStatus(10, "other@gmail.com")
        );

        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
    }

    @Test
    void getExtractedContent_WhenOwner_ShouldReturnText() {
        when(userRepository.findByEmail("owner@gmail.com")).thenReturn(Optional.of(owner));
        when(documentRepository.findById(10)).thenReturn(Optional.of(document));
        when(documentContentRepository.findByDocument_DocumentId(10)).thenReturn(Optional.of(completedContent));

        String content = documentProcessingService.getExtractedContent(10, "owner@gmail.com");

        assertEquals("Mock Text", content);
    }

    @Test
    void getExtractedContent_WhenNotOwner_ShouldThrowForbidden() {
        when(userRepository.findByEmail("other@gmail.com")).thenReturn(Optional.of(otherUser));
        when(documentRepository.findById(10)).thenReturn(Optional.of(document));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                documentProcessingService.getExtractedContent(10, "other@gmail.com")
        );

        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
    }

    @Test
    void recoverStaleJobs_ShouldUpdateProcessingToFailed() {
        DocumentContent staleContent = DocumentContent.builder()
                .contentId(2L)
                .processingStatus(ProcessingStatus.PROCESSING)
                .processingStartedAt(LocalDateTime.now().minusMinutes(15))
                .build();

        when(documentContentRepository.findAll()).thenReturn(List.of(staleContent));

        documentProcessingService.recoverStaleJobs();

        assertEquals(ProcessingStatus.FAILED, staleContent.getProcessingStatus());
        assertEquals(ProcessingStatus.FAILED, staleContent.getLastAttemptStatus());
        assertNotNull(staleContent.getLastAttemptError());
        verify(documentContentRepository, times(1)).save(staleContent);
    }
}
