package com.demo.ai_study_hub;

import com.demo.ai_study_hub.dto.EmptyTrashResponse;
import com.demo.ai_study_hub.entity.Document;
import com.demo.ai_study_hub.entity.Folder;
import com.demo.ai_study_hub.entity.User;
import com.demo.ai_study_hub.repository.*;
import com.demo.ai_study_hub.service.CloudinaryStorageService;
import com.demo.ai_study_hub.service.TrashService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionStatus;


import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TrashServiceTest {

    @Mock
    private DocumentRepository documentRepository;
    @Mock
    private FolderRepository folderRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private CloudinaryStorageService cloudinaryStorageService;
    @Mock
    private FolderShareRepository folderShareRepository;
    @Mock
    private GroupFolderShareRepository groupFolderShareRepository;
    @Mock
    private DocumentShareRepository documentShareRepository;
    @Mock
    private GroupDocumentShareRepository groupDocumentShareRepository;
    @Mock
    private PlatformTransactionManager transactionManager;
    @Mock
    private TransactionStatus transactionStatus;

    @InjectMocks
    private TrashService trashService;

    private User mockUser;

    @BeforeEach
    void setUp() {
        mockUser = new User();
        mockUser.setUserId(1);
        mockUser.setEmail("user@test.com");


        lenient().when(transactionManager.getTransaction(any())).thenReturn(transactionStatus);
    }

    @Test
    void emptyTrash_WhenAllItemsDeleteSuccessfully_ShouldReturnSuccess() {
        Document doc = new Document();
        doc.setDocumentId(1);
        doc.setTitle("Doc1.pdf");
        doc.setPublicId("public-1");
        doc.setFileType("PDF");
        doc.setStatus("DELETED");

        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));
        when(documentRepository.findByOwner_UserIdAndStatus(1, "DELETED")).thenReturn(List.of(doc));
        when(folderRepository.findByOwnerAndStatusOrderByCreatedAtDesc(mockUser, "DELETED")).thenReturn(List.of());
        when(cloudinaryStorageService.deleteFile("public-1", "PDF")).thenReturn(true);
        when(documentRepository.findById(1)).thenReturn(Optional.of(doc));

        EmptyTrashResponse response = trashService.emptyTrash("user@test.com");

        assertEquals("SUCCESS", response.getOutcome());
        assertEquals(1, response.getDeletedCount());
        assertEquals(0, response.getFailedCount());
        assertTrue(response.getFailures().isEmpty());
        verify(documentRepository, times(1)).delete(doc);
    }

    @Test
    void emptyTrash_WhenCloudinaryDeleteFails_ShouldRecordFailureAndKeepMetadata() {
        Document doc = new Document();
        doc.setDocumentId(1);
        doc.setTitle("Doc1.pdf");
        doc.setPublicId("public-1");
        doc.setFileType("PDF");
        doc.setStatus("DELETED");

        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));
        when(documentRepository.findByOwner_UserIdAndStatus(1, "DELETED")).thenReturn(List.of(doc));
        when(folderRepository.findByOwnerAndStatusOrderByCreatedAtDesc(mockUser, "DELETED")).thenReturn(List.of());
        when(cloudinaryStorageService.deleteFile("public-1", "PDF")).thenReturn(false);

        EmptyTrashResponse response = trashService.emptyTrash("user@test.com");

        assertEquals("FAILED", response.getOutcome());
        assertEquals(0, response.getDeletedCount());
        assertEquals(1, response.getFailedCount());
        assertEquals("DOCUMENT", response.getFailures().get(0).getType());
        assertEquals(1, response.getFailures().get(0).getId());
        assertEquals("Doc1.pdf", response.getFailures().get(0).getTitle());
        assertEquals("Cloudinary delete failed", response.getFailures().get(0).getReason());

        // Metadata must NOT be deleted when Cloudinary cleanup fails
        verify(documentRepository, never()).delete(any(Document.class));
        verify(documentShareRepository, never()).deleteByDocument(any());
    }

    @Test
    void emptyTrash_WhenOneItemFailsAndAnotherSucceeds_ShouldReturnPartialSuccess() {
        Document docOk = new Document();
        docOk.setDocumentId(1);
        docOk.setTitle("OkDoc.pdf");
        docOk.setPublicId("public-ok");
        docOk.setFileType("PDF");
        docOk.setStatus("DELETED");

        Document docFail = new Document();
        docFail.setDocumentId(2);
        docFail.setTitle("FailDoc.pdf");
        docFail.setPublicId("public-fail");
        docFail.setFileType("PDF");
        docFail.setStatus("DELETED");

        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));
        when(documentRepository.findByOwner_UserIdAndStatus(1, "DELETED")).thenReturn(List.of(docOk, docFail));
        when(folderRepository.findByOwnerAndStatusOrderByCreatedAtDesc(mockUser, "DELETED")).thenReturn(List.of());
        when(cloudinaryStorageService.deleteFile("public-ok", "PDF")).thenReturn(true);
        when(cloudinaryStorageService.deleteFile("public-fail", "PDF")).thenReturn(false);
        when(documentRepository.findById(1)).thenReturn(Optional.of(docOk));

        EmptyTrashResponse response = trashService.emptyTrash("user@test.com");

        assertEquals("PARTIAL_SUCCESS", response.getOutcome());
        assertEquals(1, response.getDeletedCount());
        assertEquals(1, response.getFailedCount());
        assertEquals(2, response.getFailures().get(0).getId());
        verify(documentRepository, times(1)).delete(docOk);
        verify(documentRepository, never()).delete(docFail);
    }

    @Test
    void emptyTrash_ShouldProcessFoldersInDepthDescendingOrder() {
        Folder root = new Folder();
        root.setFolderId(1);
        root.setName("Root");
        root.setStatus("DELETED");
        root.setParentFolder(null);

        Folder child = new Folder();
        child.setFolderId(2);
        child.setName("Child");
        child.setStatus("DELETED");
        child.setParentFolder(root);

        Folder grandchild = new Folder();
        grandchild.setFolderId(3);
        grandchild.setName("Grandchild");
        grandchild.setStatus("DELETED");
        grandchild.setParentFolder(child);

        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));
        when(documentRepository.findByOwner_UserIdAndStatus(1, "DELETED")).thenReturn(List.of());
        when(folderRepository.findByOwnerAndStatusOrderByCreatedAtDesc(mockUser, "DELETED"))
            .thenReturn(List.of(root, grandchild, child));

        when(folderRepository.findFolderDepth(1)).thenReturn(0);
        when(folderRepository.findFolderDepth(2)).thenReturn(1);
        when(folderRepository.findFolderDepth(3)).thenReturn(2);

        when(folderRepository.findById(1)).thenReturn(Optional.of(root));
        when(folderRepository.findById(2)).thenReturn(Optional.of(child));
        when(folderRepository.findById(3)).thenReturn(Optional.of(grandchild));

        EmptyTrashResponse response = trashService.emptyTrash("user@test.com");

        assertEquals("SUCCESS", response.getOutcome());
        assertEquals(3, response.getDeletedCount());

        var inOrder = inOrder(folderRepository);
        inOrder.verify(folderRepository).delete(grandchild);
        inOrder.verify(folderRepository).delete(child);
        inOrder.verify(folderRepository).delete(root);
    }

    @Test
    void emptyTrash_ShouldDeleteShareRecordsBeforeDeletingDocument() {
        Document doc = new Document();
        doc.setDocumentId(1);
        doc.setTitle("Doc1.pdf");
        doc.setPublicId("public-1");
        doc.setFileType("PDF");
        doc.setStatus("DELETED");

        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));
        when(documentRepository.findByOwner_UserIdAndStatus(1, "DELETED")).thenReturn(List.of(doc));
        when(folderRepository.findByOwnerAndStatusOrderByCreatedAtDesc(mockUser, "DELETED")).thenReturn(List.of());
        when(cloudinaryStorageService.deleteFile("public-1", "PDF")).thenReturn(true);
        when(documentRepository.findById(1)).thenReturn(Optional.of(doc));

        trashService.emptyTrash("user@test.com");

        var inOrder = inOrder(documentShareRepository, groupDocumentShareRepository, documentRepository);
        inOrder.verify(documentShareRepository).deleteByDocument(doc);
        inOrder.verify(groupDocumentShareRepository).deleteByDocument(doc);
        inOrder.verify(documentRepository).delete(doc);
    }

    @Test
    void emptyTrash_ShouldOnlyAffectCurrentUserTrash() {
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));
        when(documentRepository.findByOwner_UserIdAndStatus(1, "DELETED")).thenReturn(List.of());
        when(folderRepository.findByOwnerAndStatusOrderByCreatedAtDesc(mockUser, "DELETED")).thenReturn(List.of());

        trashService.emptyTrash("user@test.com");

        verify(documentRepository, times(1)).findByOwner_UserIdAndStatus(1, "DELETED");
        verify(folderRepository, times(1)).findByOwnerAndStatusOrderByCreatedAtDesc(mockUser, "DELETED");
    }

    @Test
    void emptyTrash_WhenCloudinaryFileAlreadyMissing_ShouldStillDeleteMetadata() {
        Document doc = new Document();
        doc.setDocumentId(1);
        doc.setTitle("Doc1.pdf");
        doc.setPublicId("public-missing");
        doc.setFileType("PDF");
        doc.setStatus("DELETED");

        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));
        when(documentRepository.findByOwner_UserIdAndStatus(1, "DELETED")).thenReturn(List.of(doc));
        when(folderRepository.findByOwnerAndStatusOrderByCreatedAtDesc(mockUser, "DELETED")).thenReturn(List.of());

        when(cloudinaryStorageService.deleteFile("public-missing", "PDF")).thenReturn(true);
        when(documentRepository.findById(1)).thenReturn(Optional.of(doc));

        EmptyTrashResponse response = trashService.emptyTrash("user@test.com");

        assertEquals("SUCCESS", response.getOutcome());
        assertEquals(1, response.getDeletedCount());
        verify(documentRepository, times(1)).delete(doc);
    }
}
