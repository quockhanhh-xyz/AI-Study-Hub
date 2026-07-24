package com.demo.ai_study_hub;

import com.demo.ai_study_hub.dto.DocumentResponse;
import com.demo.ai_study_hub.dto.DocumentDownloadInfo;
import com.demo.ai_study_hub.dto.DocumentUpdateDTO;
import com.demo.ai_study_hub.dto.FileUploadResult;
import com.demo.ai_study_hub.entity.*;
import com.demo.ai_study_hub.repository.*;
import com.demo.ai_study_hub.service.CloudinaryStorageService;
import com.demo.ai_study_hub.service.DocumentService;
import com.demo.ai_study_hub.service.FolderShareService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import com.demo.ai_study_hub.service.TierPolicyService;
import com.demo.ai_study_hub.service.UsageService;
import com.demo.ai_study_hub.dto.TierLimits;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionStatus;
import static org.mockito.ArgumentMatchers.any;
import com.demo.ai_study_hub.repository.DocumentFavoriteRepository;

import java.util.List;
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
    @Mock
    private FolderRepository folderRepository;
    @Mock
    private DocumentShareRepository documentShareRepository;
    @Mock
    private GroupDocumentShareRepository groupDocumentShareRepository;
    @Mock
    private StudyGroupMemberRepository studyGroupMemberRepository;
    @Mock
    private FolderShareService folderShareService;
    @Mock
    private DocumentContentRepository documentContentRepository;
    @Mock
    private DocumentChunkRepository documentChunkRepository;
    @Mock
    private TierPolicyService tierPolicyService;
    @Mock
    private UsageService usageService;
    @Mock
    private PlatformTransactionManager transactionManager;
    @Mock
    private DocumentFavoriteRepository documentFavoriteRepository;
    @Spy
    private com.demo.ai_study_hub.service.DocumentPreviewHelper previewHelper;
    @Mock
    private com.demo.ai_study_hub.repository.DocumentRatingRepository documentRatingRepository;
    @Mock
    private com.demo.ai_study_hub.repository.DocumentReportRepository documentReportRepository;
    @Mock
    private com.demo.ai_study_hub.service.NotificationService notificationService;
    @Mock
    private com.demo.ai_study_hub.repository.SubjectRequestRepository subjectRequestRepository;

    @InjectMocks
    private DocumentService documentService;

    private User mockOwner;
    private User mockHacker;
    private Document mockDocument;
    private Subject mockSubject;

    @BeforeEach
    void setUp() {
        TransactionStatus mockStatus = mock(TransactionStatus.class);
        lenient().when(transactionManager.getTransaction(any())).thenReturn(mockStatus);

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
        mockDocument.setOriginalFileName("TailieuHot.pdf");
        mockDocument.setFileType("PDF");
        mockDocument.setStatus("ACTIVE");
        mockDocument.setOwner(mockOwner);
        mockDocument.setSubject(mockSubject);

        TierLimits mockLimits = new TierLimits(
                100L * 1024 * 1024, 30, 10L * 1024 * 1024, 20, 3, 3, 10, 30, 3, 500, 5, 500, 3, 500,
                "gemini-2.5-flash-lite", 1, 1, 1, 5
        );
        lenient().when(tierPolicyService.getLimitsForUser(any())).thenReturn(mockLimits);
        lenient().when(usageService.countActiveShares(any())).thenReturn(0L);
        lenient().when(documentFavoriteRepository.existsByUserAndDocument(any(), any())).thenReturn(false);
        lenient().when(userRepository.findByIdForUpdate(anyInt())).thenAnswer(inv -> {
            Integer userId = inv.getArgument(0);
            if (userId.equals(1)) {
                return Optional.of(mockOwner);
            } else if (userId.equals(2)) {
                return Optional.of(mockHacker);
            }
            return Optional.empty();
        });
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
    void getDocumentDetail_WhenUserIsNotOwner_ShouldThrow404() {
        when(userRepository.findByEmail("hacker@test.com")).thenReturn(Optional.of(mockHacker));
        when(documentRepository.findById(4)).thenReturn(Optional.of(mockDocument));

        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> {
            documentService.getDocumentDetail(4, "hacker@test.com");
        });

        assertEquals(HttpStatus.NOT_FOUND, exception.getStatusCode());
        assertEquals("Document not found", exception.getReason());
    }

    @Test
    void getDocumentDetail_WhenUserHasDirectShare_ShouldReturnDocument() {
        User mockRecipient = new User();
        mockRecipient.setUserId(3);
        mockRecipient.setEmail("recipient@test.com");

        DocumentShare mockDirectShare = new DocumentShare();
        mockDirectShare.setDocument(mockDocument);
        mockDirectShare.setSharedWith(mockRecipient);
        mockDirectShare.setStatus("ACTIVE");

        when(userRepository.findByEmail("recipient@test.com")).thenReturn(Optional.of(mockRecipient));
        when(documentRepository.findById(4)).thenReturn(Optional.of(mockDocument));
        when(documentShareRepository.findByDocumentAndSharedWithAndStatus(mockDocument, mockRecipient, "ACTIVE"))
                .thenReturn(Optional.of(mockDirectShare));

        DocumentResponse response = documentService.getDocumentDetail(4, "recipient@test.com");

        assertNotNull(response);
        assertEquals(4, response.getDocumentId());
    }

    @Test
    void getDocumentDetail_WhenUserIsActiveGroupMemberAndDocumentSharedInGroup_ShouldReturnDocument() {
        User mockMember = new User();
        mockMember.setUserId(4);
        mockMember.setEmail("member@test.com");

        StudyGroup mockGroup = new StudyGroup();
        mockGroup.setGroupId(10);
        mockGroup.setGroupName("Study Group");

        GroupDocumentShare mockGroupShare = new GroupDocumentShare();
        mockGroupShare.setGroup(mockGroup);
        mockGroupShare.setDocument(mockDocument);
        mockGroupShare.setStatus("ACTIVE");

        when(userRepository.findByEmail("member@test.com")).thenReturn(Optional.of(mockMember));
        when(documentRepository.findById(4)).thenReturn(Optional.of(mockDocument));
        when(documentShareRepository.findByDocumentAndSharedWithAndStatus(mockDocument, mockMember, "ACTIVE"))
                .thenReturn(Optional.empty());
        when(groupDocumentShareRepository.findByDocumentAndStatus(mockDocument, "ACTIVE"))
                .thenReturn(java.util.List.of(mockGroupShare));
        when(studyGroupMemberRepository.existsByGroupAndUserAndStatus(mockGroup, mockMember, "ACTIVE"))
                .thenReturn(true);

        DocumentResponse response = documentService.getDocumentDetail(4, "member@test.com");

        assertNotNull(response);
        assertEquals(4, response.getDocumentId());
    }

    @Test
    void getDocumentDetail_WhenUserIsGroupNonMemberAndDocumentSharedInGroup_ShouldThrow403() {
        User mockNonMember = new User();
        mockNonMember.setUserId(5);
        mockNonMember.setEmail("nonmember@test.com");

        StudyGroup mockGroup = new StudyGroup();
        mockGroup.setGroupId(10);
        mockGroup.setGroupName("Study Group");

        GroupDocumentShare mockGroupShare = new GroupDocumentShare();
        mockGroupShare.setGroup(mockGroup);
        mockGroupShare.setDocument(mockDocument);
        mockGroupShare.setStatus("ACTIVE");

        when(userRepository.findByEmail("nonmember@test.com")).thenReturn(Optional.of(mockNonMember));
        when(documentRepository.findById(4)).thenReturn(Optional.of(mockDocument));
        when(documentShareRepository.findByDocumentAndSharedWithAndStatus(mockDocument, mockNonMember, "ACTIVE"))
                .thenReturn(Optional.empty());
        when(groupDocumentShareRepository.findByDocumentAndStatus(mockDocument, "ACTIVE"))
                .thenReturn(java.util.List.of(mockGroupShare));
        when(studyGroupMemberRepository.existsByGroupAndUserAndStatus(mockGroup, mockNonMember, "ACTIVE"))
                .thenReturn(false);

        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> {
            documentService.getDocumentDetail(4, "nonmember@test.com");
        });

        assertEquals(HttpStatus.NOT_FOUND, exception.getStatusCode());
        assertEquals("Document not found", exception.getReason());
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
            documentService.uploadDocument(mockFile, "Test Title", "Description", 999, null, "doantam785@gmail.com");
        });

        assertEquals(HttpStatus.NOT_FOUND, exception.getStatusCode());
        assertEquals("Subject not found", exception.getReason());
        verify(cloudinaryStorageService, never()).uploadFile(any(), any());
    }

    @Test
    void uploadDocument_WhenMissingSubject_ShouldThrow400AndNotUploadCloudinary() {
        MultipartFile mockFile = mock(MultipartFile.class);
        when(userRepository.findByEmail("doantam785@gmail.com")).thenReturn(Optional.of(mockOwner));

        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> {
            documentService.uploadDocument(mockFile, "Test Title", "Description", null, null, "doantam785@gmail.com");
        });

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
        assertEquals("Subject is required", exception.getReason());
        verify(cloudinaryStorageService, never()).uploadFile(any(), any());
    }

    @Test
    void uploadDocument_WhenDuplicateFile_ShouldThrow409AndNotUploadCloudinary() {
        MultipartFile mockFile = mock(MultipartFile.class);
        when(mockFile.getOriginalFilename()).thenReturn("TailieuHot.pdf");
        when(mockFile.getSize()).thenReturn(102400L);

        when(userRepository.findByEmail("doantam785@gmail.com")).thenReturn(Optional.of(mockOwner));
        when(subjectRepository.findById(1)).thenReturn(Optional.of(mockSubject));
        when(documentRepository.existsDuplicate(mockOwner, "TailieuHot.pdf", 102400L, null)).thenReturn(true);

        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> {
            documentService.uploadDocument(mockFile, "Test Title", "Description", 1, null, "doantam785@gmail.com");
        });

        assertEquals(HttpStatus.CONFLICT, exception.getStatusCode());
        assertEquals("A file with the same name already exists in this folder.", exception.getReason());
        verify(cloudinaryStorageService, never()).uploadFile(any(), any());
    }

    @Test
    void uploadDocument_WhenDuplicateFileInSubfolder_ShouldThrow409AndNotUploadCloudinary() {
        MultipartFile mockFile = mock(MultipartFile.class);
        when(mockFile.getOriginalFilename()).thenReturn("TailieuHot.pdf");
        when(mockFile.getSize()).thenReturn(102400L);

        Folder mockFolder = new Folder();
        mockFolder.setFolderId(5);
        mockFolder.setName("Subfolder");
        mockFolder.setOwner(mockOwner);
        mockFolder.setStatus("ACTIVE");

        when(userRepository.findByEmail("doantam785@gmail.com")).thenReturn(Optional.of(mockOwner));
        when(subjectRepository.findById(1)).thenReturn(Optional.of(mockSubject));
        when(folderRepository.findById(5)).thenReturn(Optional.of(mockFolder));
        when(documentRepository.existsDuplicate(mockOwner, "TailieuHot.pdf", 102400L, 5)).thenReturn(true);

        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> {
            documentService.uploadDocument(mockFile, "Test Title", "Description", 1, 5, "doantam785@gmail.com");
        });

        assertEquals(HttpStatus.CONFLICT, exception.getStatusCode());
        assertEquals("A file with the same name already exists in this folder.", exception.getReason());
        verify(cloudinaryStorageService, never()).uploadFile(any(), any());
    }

    @Test
    void uploadDocument_WhenSameFileNameButDifferentSize_ShouldSucceed() {
        MultipartFile mockFile = mock(MultipartFile.class);
        when(mockFile.getOriginalFilename()).thenReturn("TailieuHot.pdf");
        when(mockFile.getSize()).thenReturn(204800L);

        FileUploadResult mockUploadResult = mock(FileUploadResult.class);
        when(mockUploadResult.getFileUrl()).thenReturn("http://cloudinary.com/file.pdf");
        when(mockUploadResult.getOriginalFileName()).thenReturn("TailieuHot.pdf");
        when(mockUploadResult.getFileType()).thenReturn("PDF");
        when(mockUploadResult.getFileSize()).thenReturn(204800L);
        when(mockUploadResult.getPublicId()).thenReturn("public-id");

        when(userRepository.findByEmail("doantam785@gmail.com")).thenReturn(Optional.of(mockOwner));
        when(subjectRepository.findById(1)).thenReturn(Optional.of(mockSubject));
        when(documentRepository.existsDuplicate(mockOwner, "TailieuHot.pdf", 204800L, null)).thenReturn(false);
        when(cloudinaryStorageService.uploadFile(mockFile, mockOwner.getUserId())).thenReturn(mockUploadResult);

        Document savedDoc = new Document();
        savedDoc.setDocumentId(10);
        savedDoc.setTitle("Test Title");
        savedDoc.setOwner(mockOwner);
        savedDoc.setSubject(mockSubject);
        savedDoc.setStatus("ACTIVE");
        when(documentRepository.saveAndFlush(any(Document.class))).thenReturn(savedDoc);

        DocumentResponse response = documentService.uploadDocument(mockFile, "Test Title", "Description", 1, null, "doantam785@gmail.com");

        assertNotNull(response);
        assertEquals(10, response.getDocumentId());
        verify(cloudinaryStorageService, times(1)).uploadFile(mockFile, mockOwner.getUserId());
    }

    @Test
    void uploadDocument_WhenDocumentContentAlreadyExists_ShouldReuseExistingContent() {
        MultipartFile mockFile = mock(MultipartFile.class);
        when(mockFile.getOriginalFilename()).thenReturn("TailieuHot.pdf");
        when(mockFile.getSize()).thenReturn(204800L);

        FileUploadResult mockUploadResult = mock(FileUploadResult.class);
        when(mockUploadResult.getFileUrl()).thenReturn("http://cloudinary.com/file.pdf");
        when(mockUploadResult.getOriginalFileName()).thenReturn("TailieuHot.pdf");
        when(mockUploadResult.getFileType()).thenReturn("PDF");
        when(mockUploadResult.getFileSize()).thenReturn(204800L);
        when(mockUploadResult.getPublicId()).thenReturn("public-id");

        when(userRepository.findByEmail("doantam785@gmail.com")).thenReturn(Optional.of(mockOwner));
        when(subjectRepository.findById(1)).thenReturn(Optional.of(mockSubject));
        when(documentRepository.existsDuplicate(mockOwner, "TailieuHot.pdf", 204800L, null)).thenReturn(false);
        when(cloudinaryStorageService.uploadFile(mockFile, mockOwner.getUserId())).thenReturn(mockUploadResult);

        Document savedDoc = new Document();
        savedDoc.setDocumentId(18);
        savedDoc.setTitle("Test Title");
        savedDoc.setOriginalFileName("TailieuHot.pdf");
        savedDoc.setFileType("PDF");
        savedDoc.setFileSize(204800L);
        savedDoc.setFileUrl("http://cloudinary.com/file.pdf");
        savedDoc.setPublicId("public-id");
        savedDoc.setOwner(mockOwner);
        savedDoc.setSubject(mockSubject);
        savedDoc.setStatus("ACTIVE");
        when(documentRepository.saveAndFlush(any(Document.class))).thenReturn(savedDoc);

        DocumentContent existingContent = DocumentContent.builder()
                .document(savedDoc)
                .processingStatus(ProcessingStatus.PENDING)
                .characterCount(0)
                .originalCharacterCount(0)
                .wordCount(0)
                .isTruncated(false)
                .build();
        when(documentContentRepository.findByDocument_DocumentId(18)).thenReturn(Optional.of(existingContent));

        DocumentResponse response = documentService.uploadDocument(mockFile, "Test Title", "Description", 1, null, "doantam785@gmail.com");

        assertNotNull(response);
        assertEquals(18, response.getDocumentId());
        verify(documentContentRepository, never()).saveAndFlush(any(DocumentContent.class));
        verify(cloudinaryStorageService, never()).deleteFile(anyString(), anyString());
    }

    @Test
    void uploadDocument_WhenSameFileNameButDifferentFolder_ShouldSucceed() {
        MultipartFile mockFile = mock(MultipartFile.class);
        when(mockFile.getOriginalFilename()).thenReturn("TailieuHot.pdf");
        when(mockFile.getSize()).thenReturn(102400L);

        Folder mockFolder = new Folder();
        mockFolder.setFolderId(5);
        mockFolder.setName("Subfolder");
        mockFolder.setOwner(mockOwner);
        mockFolder.setStatus("ACTIVE");

        FileUploadResult mockUploadResult = mock(FileUploadResult.class);
        when(mockUploadResult.getFileUrl()).thenReturn("http://cloudinary.com/file.pdf");
        when(mockUploadResult.getOriginalFileName()).thenReturn("TailieuHot.pdf");
        when(mockUploadResult.getFileType()).thenReturn("PDF");
        when(mockUploadResult.getFileSize()).thenReturn(102400L);
        when(mockUploadResult.getPublicId()).thenReturn("public-id");

        when(userRepository.findByEmail("doantam785@gmail.com")).thenReturn(Optional.of(mockOwner));
        when(subjectRepository.findById(1)).thenReturn(Optional.of(mockSubject));
        when(folderRepository.findById(5)).thenReturn(Optional.of(mockFolder));
        when(documentRepository.existsDuplicate(mockOwner, "TailieuHot.pdf", 102400L, 5)).thenReturn(false);
        when(cloudinaryStorageService.uploadFile(mockFile, mockOwner.getUserId())).thenReturn(mockUploadResult);

        Document savedDoc = new Document();
        savedDoc.setDocumentId(10);
        savedDoc.setTitle("Test Title");
        savedDoc.setOwner(mockOwner);
        savedDoc.setFolder(mockFolder);
        savedDoc.setSubject(mockSubject);
        savedDoc.setStatus("ACTIVE");
        when(documentRepository.saveAndFlush(any(Document.class))).thenReturn(savedDoc);

        DocumentResponse response = documentService.uploadDocument(mockFile, "Test Title", "Description", 1, 5, "doantam785@gmail.com");

        assertNotNull(response);
        assertEquals(10, response.getDocumentId());
        verify(cloudinaryStorageService, times(1)).uploadFile(mockFile, mockOwner.getUserId());
    }

    @Test
    void uploadDocument_WhenMatchingDeletedDocument_ShouldSucceed() {
        MultipartFile mockFile = mock(MultipartFile.class);
        when(mockFile.getOriginalFilename()).thenReturn("TailieuHot.pdf");
        when(mockFile.getSize()).thenReturn(102400L);

        FileUploadResult mockUploadResult = mock(FileUploadResult.class);
        when(mockUploadResult.getFileUrl()).thenReturn("http://cloudinary.com/file.pdf");
        when(mockUploadResult.getOriginalFileName()).thenReturn("TailieuHot.pdf");
        when(mockUploadResult.getFileType()).thenReturn("PDF");
        when(mockUploadResult.getFileSize()).thenReturn(102400L);
        when(mockUploadResult.getPublicId()).thenReturn("public-id");

        when(userRepository.findByEmail("doantam785@gmail.com")).thenReturn(Optional.of(mockOwner));
        when(subjectRepository.findById(1)).thenReturn(Optional.of(mockSubject));
        when(documentRepository.existsDuplicate(mockOwner, "TailieuHot.pdf", 102400L, null)).thenReturn(false);
        when(cloudinaryStorageService.uploadFile(mockFile, mockOwner.getUserId())).thenReturn(mockUploadResult);

        Document savedDoc = new Document();
        savedDoc.setDocumentId(10);
        savedDoc.setTitle("Test Title");
        savedDoc.setOwner(mockOwner);
        savedDoc.setSubject(mockSubject);
        savedDoc.setStatus("ACTIVE");
        when(documentRepository.saveAndFlush(any(Document.class))).thenReturn(savedDoc);

        DocumentResponse response = documentService.uploadDocument(mockFile, "Test Title", "Description", 1, null, "doantam785@gmail.com");

        assertNotNull(response);
        assertEquals(10, response.getDocumentId());
        verify(cloudinaryStorageService, times(1)).uploadFile(mockFile, mockOwner.getUserId());
    }

    @Test
    void uploadDocument_WhenUsingOtherUsersCustomSubject_ShouldThrow403() {
        MultipartFile mockFile = mock(MultipartFile.class);

        Subject otherUserCustomSubject = new Subject();
        otherUserCustomSubject.setSubjectId(99);
        otherUserCustomSubject.setStatus("ACTIVE");
        otherUserCustomSubject.setScope("USER_CUSTOM");
        otherUserCustomSubject.setOwner(mockHacker); // không phải mockOwner

        when(userRepository.findByEmail("doantam785@gmail.com")).thenReturn(Optional.of(mockOwner));
        when(subjectRepository.findById(99)).thenReturn(Optional.of(otherUserCustomSubject));

        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> {
            documentService.uploadDocument(mockFile, "Test Title", "Description", 99, null, "doantam785@gmail.com");
        });

        assertEquals(HttpStatus.FORBIDDEN, exception.getStatusCode());
        verify(cloudinaryStorageService, never()).uploadFile(any(), any());
    }

    @Test
    void updateDocument_WhenUsingOtherUsersCustomSubject_ShouldThrow403() {
        DocumentUpdateDTO dto = new DocumentUpdateDTO();
        dto.setSubjectId(99);

        Subject otherUserCustomSubject = new Subject();
        otherUserCustomSubject.setSubjectId(99);
        otherUserCustomSubject.setStatus("ACTIVE");
        otherUserCustomSubject.setScope("USER_CUSTOM");
        otherUserCustomSubject.setOwner(mockHacker);

        when(userRepository.findByEmail("doantam785@gmail.com")).thenReturn(Optional.of(mockOwner));
        when(documentRepository.findById(4)).thenReturn(Optional.of(mockDocument));
        when(subjectRepository.findById(99)).thenReturn(Optional.of(otherUserCustomSubject));

        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> {
            documentService.updateDocument(4, dto, "doantam785@gmail.com");
        });

        assertEquals(HttpStatus.FORBIDDEN, exception.getStatusCode());
    }

    @Test
    void getDocumentDetail_ByOwner_ShouldReturnAllPermissionFlagsTrue() {
        when(userRepository.findByEmail("doantam785@gmail.com")).thenReturn(Optional.of(mockOwner));
        when(documentRepository.findById(4)).thenReturn(Optional.of(mockDocument));

        DocumentResponse response = documentService.getDocumentDetail(4, "doantam785@gmail.com");

        assertNotNull(response);
        assertTrue(response.getCanPreview());
        assertTrue(response.getCanOpen());
        assertTrue(response.getCanDownload());
        assertTrue(response.getCanEdit());
        assertTrue(response.getCanDelete());
        assertTrue(response.getCanMove());
        assertTrue(response.getCanShare());
    }

    @Test
    void getDocumentDetail_BySharedUser_ShouldReturnCorrectPermissionFlags() {
        User mockRecipient = new User();
        mockRecipient.setUserId(3);
        mockRecipient.setEmail("recipient@test.com");

        DocumentShare mockDirectShare = new DocumentShare();
        mockDirectShare.setDocument(mockDocument);
        mockDirectShare.setSharedWith(mockRecipient);
        mockDirectShare.setStatus("ACTIVE");

        when(userRepository.findByEmail("recipient@test.com")).thenReturn(Optional.of(mockRecipient));
        when(documentRepository.findById(4)).thenReturn(Optional.of(mockDocument));
        when(documentShareRepository.findByDocumentAndSharedWithAndStatus(mockDocument, mockRecipient, "ACTIVE"))
                .thenReturn(Optional.of(mockDirectShare));

        DocumentResponse response = documentService.getDocumentDetail(4, "recipient@test.com");

        assertNotNull(response);
        assertTrue(response.getCanPreview());
        assertTrue(response.getCanOpen());
        assertTrue(response.getCanDownload());
        assertFalse(response.getCanEdit());
        assertFalse(response.getCanDelete());
        assertFalse(response.getCanMove());
        assertFalse(response.getCanShare());
    }

    @Test
    void getDocumentDetail_ByFolderSharedUser_ShouldReturnCorrectPermissionFlags() {
        User mockFolderRecipient = new User();
        mockFolderRecipient.setUserId(3);
        mockFolderRecipient.setEmail("recipient@test.com");

        Folder mockFolder = new Folder();
        mockFolder.setFolderId(100);
        mockFolder.setName("Shared Folder");
        mockFolder.setOwner(mockOwner);
        mockFolder.setStatus("ACTIVE");

        mockDocument.setFolder(mockFolder);

        when(userRepository.findByEmail("recipient@test.com")).thenReturn(Optional.of(mockFolderRecipient));
        when(documentRepository.findById(4)).thenReturn(Optional.of(mockDocument));
        when(documentShareRepository.findByDocumentAndSharedWithAndStatus(mockDocument, mockFolderRecipient, "ACTIVE"))
                .thenReturn(Optional.empty());
        when(groupDocumentShareRepository.findByDocumentAndStatus(mockDocument, "ACTIVE"))
                .thenReturn(java.util.List.of());
        when(folderShareService.hasAccessToFolder(100, "recipient@test.com"))
                .thenReturn(true);

        DocumentResponse response = documentService.getDocumentDetail(4, "recipient@test.com");

        assertNotNull(response);
        assertTrue(response.getCanPreview());
        assertTrue(response.getCanOpen());
        assertTrue(response.getCanDownload());
        assertFalse(response.getCanEdit());
        assertFalse(response.getCanDelete());
        assertFalse(response.getCanMove());
        assertFalse(response.getCanShare());
    }

    @Test
    void getDocumentDownloadUrl_ByOwner_ShouldReturnCloudinaryUrl() {
        mockDocument.setFileUrl("https://cloudinary.com/testfile.pdf");
        when(userRepository.findByEmail("doantam785@gmail.com")).thenReturn(Optional.of(mockOwner));
        when(documentRepository.findById(4)).thenReturn(Optional.of(mockDocument));

        DocumentDownloadInfo info = documentService.getDocumentDownloadInfo(4, "doantam785@gmail.com");

        assertEquals("https://cloudinary.com/testfile.pdf", info.getFileUrl());
        assertEquals("TailieuHot.pdf", info.getFileName());
        assertEquals("application/pdf", info.getContentType());
    }

    @Test
    void getDocumentDownloadUrl_BySharedUser_ShouldReturnCloudinaryUrl() {
        mockDocument.setFileUrl("https://cloudinary.com/testfile.pdf");
        User mockRecipient = new User();
        mockRecipient.setUserId(3);
        mockRecipient.setEmail("recipient@test.com");

        DocumentShare mockDirectShare = new DocumentShare();
        mockDirectShare.setDocument(mockDocument);
        mockDirectShare.setSharedWith(mockRecipient);
        mockDirectShare.setStatus("ACTIVE");

        when(userRepository.findByEmail("recipient@test.com")).thenReturn(Optional.of(mockRecipient));
        when(documentRepository.findById(4)).thenReturn(Optional.of(mockDocument));
        when(documentShareRepository.findByDocumentAndSharedWithAndStatus(mockDocument, mockRecipient, "ACTIVE"))
                .thenReturn(Optional.of(mockDirectShare));

        DocumentDownloadInfo info = documentService.getDocumentDownloadInfo(4, "recipient@test.com");

        assertEquals("https://cloudinary.com/testfile.pdf", info.getFileUrl());
        assertEquals("TailieuHot.pdf", info.getFileName());
        assertEquals("application/pdf", info.getContentType());
    }

    @Test
    void getDocumentDownloadUrl_ByUnauthorizedUser_ShouldThrow404() {
        when(userRepository.findByEmail("hacker@test.com")).thenReturn(Optional.of(mockHacker));
        when(documentRepository.findById(4)).thenReturn(Optional.of(mockDocument));

        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> {
            documentService.getDocumentDownloadInfo(4, "hacker@test.com");
        });

        assertEquals(HttpStatus.NOT_FOUND, exception.getStatusCode());
        assertEquals("Document not found", exception.getReason());
    }

    @Test
    void getDocumentDownloadUrl_WhenDocumentDeleted_ShouldThrow404() {
        mockDocument.setStatus("DELETED");
        when(userRepository.findByEmail("doantam785@gmail.com")).thenReturn(Optional.of(mockOwner));
        when(documentRepository.findById(4)).thenReturn(Optional.of(mockDocument));

        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> {
            documentService.getDocumentDownloadInfo(4, "doantam785@gmail.com");
        });

        assertEquals(HttpStatus.NOT_FOUND, exception.getStatusCode());
        assertEquals("Document not found", exception.getReason());
    }

    @Test
    void getDocumentDownloadUrl_WhenShareRevoked_ShouldThrow404() {
        User mockRecipient = new User();
        mockRecipient.setUserId(3);
        mockRecipient.setEmail("recipient@test.com");

        when(userRepository.findByEmail("recipient@test.com")).thenReturn(Optional.of(mockRecipient));
        when(documentRepository.findById(4)).thenReturn(Optional.of(mockDocument));
        when(documentShareRepository.findByDocumentAndSharedWithAndStatus(mockDocument, mockRecipient, "ACTIVE"))
                .thenReturn(Optional.empty());

        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> {
            documentService.getDocumentDownloadInfo(4, "recipient@test.com");
        });

        assertEquals(HttpStatus.NOT_FOUND, exception.getStatusCode());
        assertEquals("Document not found", exception.getReason());
    }

    @Test
    void getDocumentDetail_ByGroupSharedUser_ShouldReturnCorrectPermissionFlags() {
        User mockGroupMember = new User();
        mockGroupMember.setUserId(3);
        mockGroupMember.setEmail("groupmember@test.com");

        StudyGroup mockGroup = new StudyGroup();
        mockGroup.setGroupId(10);
        mockGroup.setStatus("ACTIVE");

        GroupDocumentShare mockGroupShare = new GroupDocumentShare();
        mockGroupShare.setDocument(mockDocument);
        mockGroupShare.setGroup(mockGroup);
        mockGroupShare.setStatus("ACTIVE");

        when(userRepository.findByEmail("groupmember@test.com")).thenReturn(Optional.of(mockGroupMember));
        when(documentRepository.findById(4)).thenReturn(Optional.of(mockDocument));
        when(documentShareRepository.findByDocumentAndSharedWithAndStatus(mockDocument, mockGroupMember, "ACTIVE"))
                .thenReturn(Optional.empty());
        when(groupDocumentShareRepository.findByDocumentAndStatus(mockDocument, "ACTIVE"))
                .thenReturn(java.util.List.of(mockGroupShare));
        when(studyGroupMemberRepository.existsByGroupAndUserAndStatus(mockGroup, mockGroupMember, "ACTIVE"))
                .thenReturn(true);

        DocumentResponse response = documentService.getDocumentDetail(4, "groupmember@test.com");

        assertNotNull(response);
        assertTrue(response.getCanPreview());
        assertTrue(response.getCanOpen());
        assertTrue(response.getCanDownload());
        assertFalse(response.getCanEdit());
        assertFalse(response.getCanDelete());
        assertFalse(response.getCanMove());
        assertFalse(response.getCanShare());
    }

    @Test
    void getDocumentDetail_WhenUnsupportedFileType_ShouldReturnCanPreviewFalse() {
        mockDocument.setOriginalFileName("archive.zip");
        mockDocument.setFileType("ZIP");
        when(userRepository.findByEmail("doantam785@gmail.com")).thenReturn(Optional.of(mockOwner));
        when(documentRepository.findById(4)).thenReturn(Optional.of(mockDocument));

        DocumentResponse response = documentService.getDocumentDetail(4, "doantam785@gmail.com");

        assertNotNull(response);
        assertFalse(response.getCanPreview());
        assertTrue(response.getCanOpen());
        assertTrue(response.getCanDownload());
        assertTrue(response.getCanEdit());
        assertTrue(response.getCanDelete());
        assertTrue(response.getCanMove());
        assertTrue(response.getCanShare());
    }

    @Test
    void uploadDocument_WhenPersistenceFails_ShouldRollbackCloudinaryUpload() {
        MultipartFile mockFile = mock(MultipartFile.class);
        when(mockFile.getOriginalFilename()).thenReturn("TailieuHot.pdf");
        when(mockFile.getSize()).thenReturn(102400L);

        FileUploadResult mockUploadResult = mock(FileUploadResult.class);
        when(mockUploadResult.getFileUrl()).thenReturn("http://cloudinary.com/file.pdf");
        when(mockUploadResult.getOriginalFileName()).thenReturn("TailieuHot.pdf");
        when(mockUploadResult.getFileType()).thenReturn("PDF");
        when(mockUploadResult.getFileSize()).thenReturn(102400L);
        when(mockUploadResult.getPublicId()).thenReturn("public-id-rollback");

        when(userRepository.findByEmail("doantam785@gmail.com")).thenReturn(Optional.of(mockOwner));
        when(subjectRepository.findById(1)).thenReturn(Optional.of(mockSubject));
        when(documentRepository.existsDuplicate(mockOwner, "TailieuHot.pdf", 102400L, null)).thenReturn(false);
        when(cloudinaryStorageService.uploadFile(mockFile, mockOwner.getUserId())).thenReturn(mockUploadResult);
        when(documentRepository.saveAndFlush(any(Document.class)))
            .thenThrow(new RuntimeException("Simulated DB constraint violation"));
        when(cloudinaryStorageService.deleteFile("public-id-rollback", "PDF")).thenReturn(true);

        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> {
            documentService.uploadDocument(mockFile, "Test Title", "Description", 1, null, "doantam785@gmail.com");
        });

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, exception.getStatusCode());
        verify(cloudinaryStorageService, times(1)).deleteFile("public-id-rollback", "PDF");
    }

// =========================================================================
// Duplicate upload check tests
// =========================================================================

    @Test
    void uploadDocument_WhenDuplicateInRoot_ShouldThrow409() {
        MultipartFile mockFile = mock(MultipartFile.class);
        when(mockFile.getOriginalFilename()).thenReturn("report.pdf");
        when(mockFile.getSize()).thenReturn(1024L);
        lenient().when(mockFile.getContentType()).thenReturn("application/pdf");

        when(userRepository.findByEmail("doantam785@gmail.com")).thenReturn(Optional.of(mockOwner));
        when(subjectRepository.findById(1)).thenReturn(Optional.of(mockSubject));
        // folderId = null → root → duplicate found
        when(documentRepository.existsDuplicate(mockOwner, "report.pdf", 1024L, null)).thenReturn(true);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
            documentService.uploadDocument(mockFile, "Report", null, 1, null, "doantam785@gmail.com"));

        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
    }

    @Test
    void uploadDocument_WhenDuplicateInSameFolder_ShouldThrow409() {
        MultipartFile mockFile = mock(MultipartFile.class);
        when(mockFile.getOriginalFilename()).thenReturn("report.pdf");
        when(mockFile.getSize()).thenReturn(1024L);
        lenient().when(mockFile.getContentType()).thenReturn("application/pdf");

        Folder folder = new Folder();
        folder.setFolderId(5);
        folder.setOwner(mockOwner);
        folder.setStatus("ACTIVE");

        when(userRepository.findByEmail("doantam785@gmail.com")).thenReturn(Optional.of(mockOwner));
        when(subjectRepository.findById(1)).thenReturn(Optional.of(mockSubject));
        when(folderRepository.findById(5)).thenReturn(Optional.of(folder));
        when(documentRepository.existsDuplicate(mockOwner, "report.pdf", 1024L, 5)).thenReturn(true);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
            documentService.uploadDocument(mockFile, "Report", null, 1, 5, "doantam785@gmail.com"));

        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
    }

    @Test
    void uploadDocument_WhenSameFileInDifferentFolder_ShouldNotThrow409() throws Exception {
        MultipartFile mockFile = mock(MultipartFile.class);
        when(mockFile.getOriginalFilename()).thenReturn("report.pdf");
        when(mockFile.getSize()).thenReturn(1024L);
        lenient().when(mockFile.getContentType()).thenReturn("application/pdf");

        Folder folder = new Folder();
        folder.setFolderId(5);
        folder.setOwner(mockOwner);
        folder.setStatus("ACTIVE");

        FileUploadResult mockUploadResult = mock(FileUploadResult.class);
        when(mockUploadResult.getFileUrl()).thenReturn("https://cloudinary.com/file.pdf");
        when(mockUploadResult.getPublicId()).thenReturn("public-id-1");
        when(mockUploadResult.getOriginalFileName()).thenReturn("report.pdf");
        when(mockUploadResult.getFileType()).thenReturn("PDF");
        when(mockUploadResult.getFileSize()).thenReturn(1024L);

        when(userRepository.findByEmail("doantam785@gmail.com")).thenReturn(Optional.of(mockOwner));
        when(subjectRepository.findById(1)).thenReturn(Optional.of(mockSubject));
        when(folderRepository.findById(5)).thenReturn(Optional.of(folder));
        // File exists in folder 5 but we are uploading to folder 10 → not duplicate
        when(documentRepository.existsDuplicate(mockOwner, "report.pdf", 1024L, 5)).thenReturn(false);
        when(cloudinaryStorageService.uploadFile(mockFile, mockOwner.getUserId())).thenReturn(mockUploadResult);
        when(documentRepository.saveAndFlush(any(Document.class))).thenAnswer(inv -> inv.getArgument(0));

        assertDoesNotThrow(() ->
            documentService.uploadDocument(mockFile, "Report", null, 1, 5, "doantam785@gmail.com"));
    }

    @Test
    void uploadDocument_WhenSameNameDifferentSize_ShouldNotThrow409() throws Exception {
        MultipartFile mockFile = mock(MultipartFile.class);
        when(mockFile.getOriginalFilename()).thenReturn("report.pdf");
        when(mockFile.getSize()).thenReturn(2048L); // different size

        FileUploadResult mockUploadResult = mock(FileUploadResult.class);
        when(mockUploadResult.getFileUrl()).thenReturn("https://cloudinary.com/file.pdf");
        when(mockUploadResult.getPublicId()).thenReturn("public-id-2");
        when(mockUploadResult.getOriginalFileName()).thenReturn("report.pdf");
        when(mockUploadResult.getFileType()).thenReturn("PDF");
        when(mockUploadResult.getFileSize()).thenReturn(2048L);

        when(userRepository.findByEmail("doantam785@gmail.com")).thenReturn(Optional.of(mockOwner));
        when(subjectRepository.findById(1)).thenReturn(Optional.of(mockSubject));
        when(documentRepository.existsDuplicate(mockOwner, "report.pdf", 2048L, null)).thenReturn(false);
        when(cloudinaryStorageService.uploadFile(mockFile, mockOwner.getUserId())).thenReturn(mockUploadResult);
        when(documentRepository.saveAndFlush(any(Document.class))).thenAnswer(inv -> inv.getArgument(0));

        assertDoesNotThrow(() ->
            documentService.uploadDocument(mockFile, "Report", null, 1, null, "doantam785@gmail.com"));
    }

    @Test
    void uploadDocument_WhenOldDocumentDeleted_ShouldNotThrow409() throws Exception {
        MultipartFile mockFile = mock(MultipartFile.class);
        when(mockFile.getOriginalFilename()).thenReturn("report.pdf");
        when(mockFile.getSize()).thenReturn(1024L);

        FileUploadResult mockUploadResult = mock(FileUploadResult.class);
        when(mockUploadResult.getFileUrl()).thenReturn("https://cloudinary.com/file.pdf");
        when(mockUploadResult.getPublicId()).thenReturn("public-id-3");
        when(mockUploadResult.getOriginalFileName()).thenReturn("report.pdf");
        when(mockUploadResult.getFileType()).thenReturn("PDF");
        when(mockUploadResult.getFileSize()).thenReturn(1024L);

        when(userRepository.findByEmail("doantam785@gmail.com")).thenReturn(Optional.of(mockOwner));
        when(subjectRepository.findById(1)).thenReturn(Optional.of(mockSubject));
        // old doc is DELETED → existsDuplicate returns false (query checks ACTIVE only)
        when(documentRepository.existsDuplicate(mockOwner, "report.pdf", 1024L, null)).thenReturn(false);
        when(cloudinaryStorageService.uploadFile(mockFile, mockOwner.getUserId())).thenReturn(mockUploadResult);
        when(documentRepository.saveAndFlush(any(Document.class))).thenAnswer(inv -> inv.getArgument(0));

        assertDoesNotThrow(() ->
            documentService.uploadDocument(mockFile, "Report", null, 1, null, "doantam785@gmail.com"));
    }
}
