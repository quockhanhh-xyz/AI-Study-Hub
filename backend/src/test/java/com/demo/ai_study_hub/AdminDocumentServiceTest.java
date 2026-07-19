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
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

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
    void getAdminDocumentDownloadInfo_Success() {
        when(documentRepository.findById(1)).thenReturn(Optional.of(testDoc));

        DocumentDownloadInfo info = adminDocumentService.getAdminDocumentDownloadInfo(1);

        assertNotNull(info);
        assertEquals("http://example.com/file.pdf", info.getFileUrl());
        assertEquals("Test Title", info.getFileName());
        assertEquals("application/pdf", info.getContentType());
    }
}
