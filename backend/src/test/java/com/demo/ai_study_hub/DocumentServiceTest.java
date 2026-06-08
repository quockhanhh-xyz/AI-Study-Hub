package com.demo.ai_study_hub;

import com.demo.ai_study_hub.dto.DocumentResponse;
import com.demo.ai_study_hub.dto.DocumentUpdateDTO;
import com.demo.ai_study_hub.entity.Document;
import com.demo.ai_study_hub.entity.Subject;
import com.demo.ai_study_hub.entity.User;
import com.demo.ai_study_hub.repository.DocumentRepository;
import com.demo.ai_study_hub.repository.SubjectRepository;
import com.demo.ai_study_hub.repository.UserRepository;
import com.demo.ai_study_hub.service.CloudinaryStorageService;
import com.demo.ai_study_hub.service.DocumentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DocumentServiceTest {

    @Mock
    private DocumentRepository documentRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private CloudinaryStorageService cloudinaryStorageService;
    @Mock
    private SubjectRepository subjectRepository;

    @InjectMocks
    private DocumentService documentService;

    private User mockOwner;
    private User mockHacker;
    private Document mockDocument;
    private Subject mockSubject;

    @BeforeEach
    void setUp() {
        mockOwner = new User();
        mockOwner.setUserId(1);
        mockOwner.setEmail("doantam785@gmail.com");

        mockHacker = new User();
        mockHacker.setUserId(2);
        mockHacker.setEmail("hacker@test.com");

        mockSubject = new Subject();
        mockSubject.setSubjectId(1);
        mockSubject.setSubjectCode("SWP391");
        mockSubject.setSubjectName("Software Project");
        mockSubject.setStatus("ACTIVE");

        mockDocument = new Document();
        mockDocument.setDocumentId(4);
        mockDocument.setTitle("TailieuHot.pdf");
        mockDocument.setStatus("ACTIVE");
        mockDocument.setOwner(mockOwner);
        mockDocument.setSubject(mockSubject);
    }

    @Test
    void getDocumentDetail_WhenDocumentNotFound_ShouldThrow404() {
        when(userRepository.findByEmail("doantam785@gmail.com")).thenReturn(Optional.of(mockOwner));
        when(documentRepository.findById(999)).thenReturn(Optional.empty());

        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> {
            documentService.getDocumentDetail(999, "doantam785@gmail.com");
        });

        assertEquals(HttpStatus.NOT_FOUND, exception.getStatusCode());
        assertEquals("Document not found", exception.getReason());
    }

    @Test
    void getDocumentDetail_WhenDocumentDeleted_ShouldThrow404() {
        mockDocument.setStatus("DELETED");
        when(userRepository.findByEmail("doantam785@gmail.com")).thenReturn(Optional.of(mockOwner));
        when(documentRepository.findById(4)).thenReturn(Optional.of(mockDocument));

        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> {
            documentService.getDocumentDetail(4, "doantam785@gmail.com");
        });

        assertEquals(HttpStatus.NOT_FOUND, exception.getStatusCode());
        assertEquals("Document not found", exception.getReason());
    }

    @Test
    void getDocumentDetail_WhenUserIsNotOwner_ShouldThrow403() {
        when(userRepository.findByEmail("hacker@test.com")).thenReturn(Optional.of(mockHacker));
        when(documentRepository.findById(4)).thenReturn(Optional.of(mockDocument));

        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> {
            documentService.getDocumentDetail(4, "hacker@test.com");
        });

        assertEquals(HttpStatus.FORBIDDEN, exception.getStatusCode());
        assertEquals("Access denied", exception.getReason());
    }

    @Test
    void updateDocument_WhenSubjectIsInactive_ShouldThrow404() {
        mockSubject.setStatus("INACTIVE");
        DocumentUpdateDTO dto = new DocumentUpdateDTO();
        dto.setSubjectId(1);

        when(userRepository.findByEmail("doantam785@gmail.com")).thenReturn(Optional.of(mockOwner));
        when(documentRepository.findById(4)).thenReturn(Optional.of(mockDocument));
        when(subjectRepository.findById(1)).thenReturn(Optional.of(mockSubject));

        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> {
            documentService.updateDocument(4, dto, "doantam785@gmail.com");
        });

        assertEquals(HttpStatus.NOT_FOUND, exception.getStatusCode());
        assertEquals("Subject not found", exception.getReason());
    }

    @Test
    void updateDocument_WhenTitleIsEmpty_ShouldThrow400() {
        DocumentUpdateDTO dto = new DocumentUpdateDTO();
        dto.setTitle("    ");

        when(userRepository.findByEmail("doantam785@gmail.com")).thenReturn(Optional.of(mockOwner));
        when(documentRepository.findById(4)).thenReturn(Optional.of(mockDocument));

        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> {
            documentService.updateDocument(4, dto, "doantam785@gmail.com");
        });

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
        assertEquals("Title is required", exception.getReason());
    }

    @Test
    void getDocumentDetail_WithValidOwner_ShouldReturnFullData() {
        when(userRepository.findByEmail("doantam785@gmail.com")).thenReturn(Optional.of(mockOwner));
        when(documentRepository.findById(4)).thenReturn(Optional.of(mockDocument));

        DocumentResponse response = documentService.getDocumentDetail(4, "doantam785@gmail.com");

        assertNotNull(response);
        assertEquals(4, response.getDocumentId());
        assertEquals("TailieuHot.pdf", response.getTitle());
        assertEquals(1, response.getSubjectId());
        assertEquals("SWP391", response.getSubjectCode());
        assertEquals("Software Project", response.getSubjectName());
    }

    @Test
    void uploadDocument_WhenSubjectNotFound_ShouldThrow404AndNotUploadCloudinary() {
        MultipartFile mockFile = mock(MultipartFile.class);
        when(userRepository.findByEmail("doantam785@gmail.com")).thenReturn(Optional.of(mockOwner));
        when(subjectRepository.findById(999)).thenReturn(Optional.empty());

        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> {
            documentService.uploadDocument(mockFile, "Test Title", "Description", 999, "doantam785@gmail.com");
        });

        assertEquals(HttpStatus.NOT_FOUND, exception.getStatusCode());
        assertEquals("Subject not found", exception.getReason());
        verify(cloudinaryStorageService, never()).uploadFile(any(), any());
    }
}