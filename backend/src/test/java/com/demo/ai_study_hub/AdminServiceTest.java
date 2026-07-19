package com.demo.ai_study_hub;

import com.demo.ai_study_hub.service.AdminServiceImpl;
import com.demo.ai_study_hub.entity.Document;
import com.demo.ai_study_hub.repository.DocumentRepository;
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
class AdminServiceTest {

    @Mock
    private DocumentRepository documentRepository;

    @InjectMocks
    private AdminServiceImpl adminService;

    private Document publicDoc;
    private Document privateDoc;

    @BeforeEach
    void setUp() {
        publicDoc = new Document();
        publicDoc.setDocumentId(1);
        publicDoc.setStatus("ACTIVE");
        publicDoc.setVisibility("PUBLIC");
        publicDoc.setApprovalStatus("PENDING");

        privateDoc = new Document();
        privateDoc.setDocumentId(2);
        privateDoc.setStatus("ACTIVE");
        privateDoc.setVisibility("PRIVATE");
        privateDoc.setApprovalStatus("PENDING");
    }

    @Test
    void approveDocument_PublicDoc_ShouldSucceed() {
        when(documentRepository.findById(1)).thenReturn(Optional.of(publicDoc));

        adminService.approveDocument(1);

        assertEquals("APPROVED", publicDoc.getApprovalStatus());
        assertNotNull(publicDoc.getPublishedAt());
        verify(documentRepository, times(1)).save(publicDoc);
    }

    @Test
    void approveDocument_PrivateDoc_ShouldThrowBadRequest() {
        when(documentRepository.findById(2)).thenReturn(Optional.of(privateDoc));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> {
            adminService.approveDocument(2);
        });

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        assertEquals("Only public documents can be moderated", ex.getReason());
        verify(documentRepository, never()).save(any());
    }

    @Test
    void rejectDocument_PublicDoc_ShouldSucceed() {
        when(documentRepository.findById(1)).thenReturn(Optional.of(publicDoc));

        adminService.rejectDocument(1, null);

        assertEquals("REJECTED", publicDoc.getApprovalStatus());
        verify(documentRepository, times(1)).save(publicDoc);
    }

    @Test
    void rejectDocument_PrivateDoc_ShouldThrowBadRequest() {
        when(documentRepository.findById(2)).thenReturn(Optional.of(privateDoc));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> {
            adminService.rejectDocument(2, null);
        });

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        assertEquals("Only public documents can be moderated", ex.getReason());
        verify(documentRepository, never()).save(any());
    }

    @Test
    void unpublishDocument_PublicDoc_ShouldSucceed() {
        when(documentRepository.findById(1)).thenReturn(Optional.of(publicDoc));

        adminService.unpublishDocument(1);

        assertEquals("PRIVATE", publicDoc.getVisibility());
        verify(documentRepository, times(1)).save(publicDoc);
    }

    @Test
    void unpublishDocument_PrivateDoc_ShouldThrowBadRequest() {
        when(documentRepository.findById(2)).thenReturn(Optional.of(privateDoc));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> {
            adminService.unpublishDocument(2);
        });

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        assertEquals("Only public documents can be unpublished", ex.getReason());
        verify(documentRepository, never()).save(any());
    }

    @Test
    void makeDocumentPending_PublicDoc_ShouldSucceed() {
        when(documentRepository.findById(1)).thenReturn(Optional.of(publicDoc));

        adminService.makeDocumentPending(1);

        assertEquals("PENDING", publicDoc.getApprovalStatus());
        assertNull(publicDoc.getPublishedAt());
        verify(documentRepository, times(1)).save(publicDoc);
    }

    @Test
    void makeDocumentPending_PrivateDoc_ShouldThrowBadRequest() {
        when(documentRepository.findById(2)).thenReturn(Optional.of(privateDoc));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> {
            adminService.makeDocumentPending(2);
        });

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        assertEquals("Only public documents can be moderated", ex.getReason());
        verify(documentRepository, never()).save(any());
    }
}
