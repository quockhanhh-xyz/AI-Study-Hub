package com.demo.ai_study_hub;

import com.demo.ai_study_hub.dto.FavoriteDocumentItemResponse;
import com.demo.ai_study_hub.dto.FavoriteResponse;
import com.demo.ai_study_hub.entity.*;
import com.demo.ai_study_hub.exception.QuotaExceededException;
import com.demo.ai_study_hub.repository.*;
import com.demo.ai_study_hub.service.DocumentFavoriteService;
import com.demo.ai_study_hub.service.FolderShareService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DocumentFavoriteServiceTest {

    @Mock private DocumentFavoriteRepository documentFavoriteRepository;
    @Mock private DocumentRepository documentRepository;
    @Mock private DocumentShareRepository documentShareRepository;
    @Mock private GroupDocumentShareRepository groupDocumentShareRepository;
    @Mock private StudyGroupMemberRepository studyGroupMemberRepository;
    @Mock private FolderShareService folderShareService;
    @Mock private UserRepository userRepository;

    private DocumentFavoriteService favoriteService;

    private User user;
    private User otherOwner;
    private Document ownedDoc;
    private Document deletedDoc;
    private Document inaccessibleDoc;

    @BeforeEach
    void setUp() {
        favoriteService = new DocumentFavoriteService(
                documentFavoriteRepository, documentRepository, documentShareRepository,
                groupDocumentShareRepository, studyGroupMemberRepository,
                folderShareService, userRepository);

        user = new User();
        user.setUserId(1);
        user.setEmail("user@test.com");

        otherOwner = new User();
        otherOwner.setUserId(2);
        otherOwner.setEmail("owner@test.com");

        ownedDoc = new Document();
        ownedDoc.setDocumentId(10);
        ownedDoc.setTitle("My Doc");
        ownedDoc.setStatus("ACTIVE");
        ownedDoc.setOwner(user);

        deletedDoc = new Document();
        deletedDoc.setDocumentId(20);
        deletedDoc.setTitle("Deleted Doc");
        deletedDoc.setStatus("DELETED");
        deletedDoc.setOwner(user);

        inaccessibleDoc = new Document();
        inaccessibleDoc.setDocumentId(30);
        inaccessibleDoc.setTitle("Private Doc of Someone Else");
        inaccessibleDoc.setStatus("ACTIVE");
        inaccessibleDoc.setOwner(otherOwner);
        inaccessibleDoc.setVisibility("PRIVATE");

        lenient().when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(user));
    }

    // =========================================================================
    // Favorite — success
    // =========================================================================

    @Test
    void favorite_WhenOwnerFavoritesOwnDocument_ShouldSucceed() {
        when(documentRepository.findById(10)).thenReturn(Optional.of(ownedDoc));
        when(documentFavoriteRepository.existsByUserAndDocument(user, ownedDoc)).thenReturn(false);
        when(documentFavoriteRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        FavoriteResponse response = favoriteService.favorite(10, "user@test.com");

        assertNotNull(response);
        assertEquals(10, response.getDocumentId());
        assertTrue(response.isFavoritedByMe());
        verify(documentFavoriteRepository, times(1)).save(any());
    }

    @Test
    void favorite_WhenPublicApprovedDocument_ShouldSucceedEvenIfNotOwner() {
        inaccessibleDoc.setVisibility("PUBLIC");
        inaccessibleDoc.setApprovalStatus("APPROVED");

        when(documentRepository.findById(30)).thenReturn(Optional.of(inaccessibleDoc));
        when(documentFavoriteRepository.existsByUserAndDocument(user, inaccessibleDoc)).thenReturn(false);
        when(documentFavoriteRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        FavoriteResponse response = favoriteService.favorite(30, "user@test.com");

        assertTrue(response.isFavoritedByMe());
    }

    @Test
    void favorite_WhenDirectlyShared_ShouldSucceed() {
        when(documentRepository.findById(30)).thenReturn(Optional.of(inaccessibleDoc));
        when(documentShareRepository.findByDocumentAndSharedWithAndStatus(inaccessibleDoc, user, "ACTIVE"))
                .thenReturn(Optional.of(new DocumentShare()));
        when(documentFavoriteRepository.existsByUserAndDocument(user, inaccessibleDoc)).thenReturn(false);
        when(documentFavoriteRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        FavoriteResponse response = favoriteService.favorite(30, "user@test.com");

        assertTrue(response.isFavoritedByMe());
    }

    // =========================================================================
    // Favorite — duplicate is idempotent, not an error
    // =========================================================================

    @Test
    void favorite_WhenAlreadyFavorited_ShouldBeIdempotent_NotThrow() {
        when(documentRepository.findById(10)).thenReturn(Optional.of(ownedDoc));
        when(documentFavoriteRepository.existsByUserAndDocument(user, ownedDoc)).thenReturn(true);

        FavoriteResponse response = favoriteService.favorite(10, "user@test.com");

        assertTrue(response.isFavoritedByMe());
        // Must NOT attempt a second insert — the unique constraint (and this
        // check) is what prevents duplicate favorite rows.
        verify(documentFavoriteRepository, never()).save(any());
    }

    // =========================================================================
    // Favorite — blocked cases
    // =========================================================================

    @Test
    void favorite_WhenDocumentDeleted_ShouldThrow400WithCode() {
        when(documentRepository.findById(20)).thenReturn(Optional.of(deletedDoc));

        QuotaExceededException ex = assertThrows(QuotaExceededException.class,
                () -> favoriteService.favorite(20, "user@test.com"));

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        assertEquals("DOCUMENT_DELETED", ex.getCode());
        verify(documentFavoriteRepository, never()).save(any());
    }

    @Test
    void favorite_WhenDocumentDoesNotExist_ShouldThrow404WithCode() {
        when(documentRepository.findById(999)).thenReturn(Optional.empty());

        QuotaExceededException ex = assertThrows(QuotaExceededException.class,
                () -> favoriteService.favorite(999, "user@test.com"));

        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
        assertEquals("DOCUMENT_NOT_FOUND", ex.getCode());
    }

    @Test
    void favorite_WhenNoViewPermission_ShouldThrow403WithCode_NotSave() {
        when(documentRepository.findById(30)).thenReturn(Optional.of(inaccessibleDoc));
        when(documentShareRepository.findByDocumentAndSharedWithAndStatus(inaccessibleDoc, user, "ACTIVE"))
                .thenReturn(Optional.empty());
        when(groupDocumentShareRepository.findByDocumentAndStatus(inaccessibleDoc, "ACTIVE"))
                .thenReturn(List.of());
        // inaccessibleDoc.folder is null and visibility=PRIVATE -> no path grants access

        QuotaExceededException ex = assertThrows(QuotaExceededException.class,
                () -> favoriteService.favorite(30, "user@test.com"));

        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
        assertEquals("DOCUMENT_ACCESS_DENIED", ex.getCode());
        verify(documentFavoriteRepository, never()).save(any());
    }

    // =========================================================================
    // Unfavorite
    // =========================================================================

    @Test
    void unfavorite_WhenFavorited_ShouldDeleteAndReturnFalse() {
        DocumentFavorite existing = DocumentFavorite.builder()
                .favoriteId(1L).user(user).document(ownedDoc).createdAt(LocalDateTime.now()).build();

        when(documentRepository.findById(10)).thenReturn(Optional.of(ownedDoc));
        when(documentFavoriteRepository.findByUserAndDocument(user, ownedDoc)).thenReturn(Optional.of(existing));

        FavoriteResponse response = favoriteService.unfavorite(10, "user@test.com");

        assertFalse(response.isFavoritedByMe());
        verify(documentFavoriteRepository, times(1)).delete(existing);
    }

    @Test
    void unfavorite_WhenNotFavorited_ShouldBeIdempotent_NotThrow() {
        when(documentRepository.findById(10)).thenReturn(Optional.of(ownedDoc));
        when(documentFavoriteRepository.findByUserAndDocument(user, ownedDoc)).thenReturn(Optional.empty());

        FavoriteResponse response = favoriteService.unfavorite(10, "user@test.com");

        assertFalse(response.isFavoritedByMe());
        verify(documentFavoriteRepository, never()).delete(any(DocumentFavorite.class));
    }

    @Test
    void unfavorite_DoesNotRequireViewPermission_OwnFavoriteDataAlwaysRemovable() {
        // Access was revoked after favoriting (e.g. share pulled) — user
        // must still be able to remove their own favorite entry.
        DocumentFavorite existing = DocumentFavorite.builder()
                .favoriteId(2L).user(user).document(inaccessibleDoc).createdAt(LocalDateTime.now()).build();

        when(documentRepository.findById(30)).thenReturn(Optional.of(inaccessibleDoc));
        when(documentFavoriteRepository.findByUserAndDocument(user, inaccessibleDoc)).thenReturn(Optional.of(existing));

        FavoriteResponse response = favoriteService.unfavorite(30, "user@test.com");

        assertFalse(response.isFavoritedByMe());
        verify(documentFavoriteRepository, times(1)).delete(existing);
        // Crucially: no permission-check repositories were even consulted.
        verifyNoInteractions(documentShareRepository, groupDocumentShareRepository, folderShareService);
    }

    // =========================================================================
    // List favorites — filtered to ACTIVE + still-viewable
    // =========================================================================

    @Test
    void listFavoritedDocuments_ShouldExcludeDeletedDocuments() {
        DocumentFavorite favA = DocumentFavorite.builder()
                .favoriteId(1L).user(user).document(ownedDoc).createdAt(LocalDateTime.now()).build();
        DocumentFavorite favDeleted = DocumentFavorite.builder()
                .favoriteId(2L).user(user).document(deletedDoc).createdAt(LocalDateTime.now()).build();

        when(documentFavoriteRepository.findByUserOrderByCreatedAtDesc(user))
                .thenReturn(List.of(favA, favDeleted));

        List<FavoriteDocumentItemResponse> result = favoriteService.listFavoritedDocuments("user@test.com");

        assertEquals(1, result.size());
        assertEquals(10, result.get(0).getDocumentId());
    }

    @Test
    void listFavoritedDocuments_ShouldExcludeDocumentsAccessNoLongerGranted() {
        // Favorited while shared; share has since been revoked (no longer
        // owner, no active share, not public) — must be filtered out on read.
        DocumentFavorite favRevoked = DocumentFavorite.builder()
                .favoriteId(3L).user(user).document(inaccessibleDoc).createdAt(LocalDateTime.now()).build();

        when(documentFavoriteRepository.findByUserOrderByCreatedAtDesc(user))
                .thenReturn(List.of(favRevoked));
        when(documentShareRepository.findByDocumentAndSharedWithAndStatus(inaccessibleDoc, user, "ACTIVE"))
                .thenReturn(Optional.empty());
        when(groupDocumentShareRepository.findByDocumentAndStatus(inaccessibleDoc, "ACTIVE"))
                .thenReturn(List.of());

        List<FavoriteDocumentItemResponse> result = favoriteService.listFavoritedDocuments("user@test.com");

        assertTrue(result.isEmpty());
    }

    @Test
    void listFavoritedDocuments_ShouldReturnOnlyCurrentUsersFavorites() {
        favoriteService.listFavoritedDocuments("user@test.com");

        // Scoped by the repository query itself (findByUserOrderByCreatedAtDesc(user))
        verify(documentFavoriteRepository, times(1)).findByUserOrderByCreatedAtDesc(user);
    }
}
