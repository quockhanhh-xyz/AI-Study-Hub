package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.dto.FavoriteDocumentItemResponse;
import com.demo.ai_study_hub.dto.FavoriteResponse;
import com.demo.ai_study_hub.entity.*;
import com.demo.ai_study_hub.exception.QuotaExceededException;
import com.demo.ai_study_hub.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Document Favorites.
 *
 * NOTE on duplicated permission logic: the "can this user view this
 * document" check below is the SAME 4-path rule already implemented in
 * AiChatServiceImpl.validateViewPermission() (Step 10) and
 * AiLearningAccessGuard (Step 14): owner OR direct share OR active
 * group-document share OR folder share (delegates to Step 6) OR
 * PUBLIC+APPROVED. It is intentionally re-implemented here (not extracted
 * into a shared class) to avoid touching/risking regressions in Step 10/14
 * code during this Mini Step. A follow-up refactor should pull all three
 * copies into one shared `DocumentAccessPolicy` component.
 */
@Service
@RequiredArgsConstructor
public class DocumentFavoriteService {

    private final DocumentFavoriteRepository documentFavoriteRepository;
    private final DocumentRepository documentRepository;
    private final DocumentShareRepository documentShareRepository;
    private final GroupDocumentShareRepository groupDocumentShareRepository;
    private final StudyGroupMemberRepository studyGroupMemberRepository;
    private final FolderShareService folderShareService;
    private final UserRepository userRepository;

    @Transactional
    public FavoriteResponse favorite(Integer documentId, String userEmail) {
        User user = loadUser(userEmail);
        Document doc = requireViewableActiveDocument(documentId, user);

        boolean alreadyFavorited = documentFavoriteRepository.existsByUserAndDocument(user, doc);
        if (alreadyFavorited) {
            return FavoriteResponse.builder().documentId(documentId).favoritedByMe(true).build();
        }

        DocumentFavorite favorite = DocumentFavorite.builder()
                .user(user)
                .document(doc)
                .createdAt(LocalDateTime.now(ZoneOffset.UTC))
                .build();

        try {
            documentFavoriteRepository.saveAndFlush(favorite);
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            return FavoriteResponse.builder().documentId(documentId).favoritedByMe(true).build();
        }

        return FavoriteResponse.builder().documentId(documentId).favoritedByMe(true).build();
    }

    @Transactional
    public FavoriteResponse unfavorite(Integer documentId, String userEmail) {
        User user = loadUser(userEmail);
        Document doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new QuotaExceededException(HttpStatus.NOT_FOUND,
                        "Document not found", "DOCUMENT_NOT_FOUND"));

        // Unfavorite does NOT re-check view permission - if access was
        // revoked after favoriting (e.g. share was pulled), the user must
        // still be able to remove their own favorite entry. It is their
        // own data (documentFavoriteRepository query is scoped to user+doc),
        // not a document-content operation.
        documentFavoriteRepository.findByUserAndDocument(user, doc)
                .ifPresent(documentFavoriteRepository::delete);

        return FavoriteResponse.builder().documentId(documentId).favoritedByMe(false).build();
    }

    @Transactional(readOnly = true)
    public List<FavoriteDocumentItemResponse> listFavoritedDocuments(String userEmail) {
        User user = loadUser(userEmail);
        return documentFavoriteRepository.findByUserOrderByCreatedAtDesc(user)
                .stream()
                // A favorite row can point to a document that was later
                // deleted, or whose sharing was revoked - filter those out
                // at read time rather than eagerly deleting the favorite
                // row (soft-delete-friendly: if the document comes back
                // ACTIVE / re-shared, the favorite silently reappears).
                .filter(f -> "ACTIVE".equals(f.getDocument().getStatus()))
                .filter(f -> canView(f.getDocument(), user))
                .map(f -> toFavoriteItemResponse(f.getDocument(), f.getCreatedAt()))
                .collect(Collectors.toList());
    }

    private FavoriteDocumentItemResponse toFavoriteItemResponse(Document doc, LocalDateTime favoritedAt) {
        String processingStatusVal = "PENDING";
        if (doc.getDocumentContent() != null) {
            processingStatusVal = doc.getDocumentContent().getProcessingStatus().name();
        }

        return FavoriteDocumentItemResponse.builder()
                .documentId(doc.getDocumentId())
                .title(doc.getTitle())
                .fileType(doc.getFileType())
                .visibility(doc.getVisibility())
                .approvalStatus(doc.getApprovalStatus())
                .ownerId(doc.getOwner().getUserId())
                .ownerName(doc.getOwner().getFullName())
                .createdAt(doc.getCreatedAt())
                .favoritedAt(favoritedAt)
                .favoritedByMe(true)
                .fileSize(doc.getFileSize())
                .subjectName(doc.getSubject() != null ? doc.getSubject().getSubjectName() : null)
                .folderName(doc.getFolder() != null ? doc.getFolder().getName() : null)
                .canOpen(true)
                .canDownload(true)
                .processingStatus(processingStatusVal)
                .build();
    }

    /**
     * Bulk helper for list endpoints (my/public/shared-with-me) to compute
     * favoritedByMe without N+1 queries - one query for the whole page.
     */
    @Transactional(readOnly = true)
    public Set<Integer> getFavoritedDocumentIds(String userEmail, List<Integer> documentIds) {
        if (documentIds == null || documentIds.isEmpty()) {
            return Set.of();
        }
        User user = loadUser(userEmail);
        return documentFavoriteRepository.findFavoritedDocumentIds(user.getUserId(), documentIds);
    }

    @Transactional(readOnly = true)
    public boolean isFavoritedByMe(Integer documentId, String userEmail) {
        User user = loadUser(userEmail);
        Document doc = documentRepository.findById(documentId).orElse(null);
        if (doc == null) return false;
        return documentFavoriteRepository.existsByUserAndDocument(user, doc);
    }

    // =========================================================================
    // Permission check - mirrors AiChatServiceImpl.validateViewPermission()
    // =========================================================================

    private Document requireViewableActiveDocument(Integer documentId, User user) {
        Document doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new QuotaExceededException(HttpStatus.NOT_FOUND,
                        "Document not found", "DOCUMENT_NOT_FOUND"));

        if (!"ACTIVE".equals(doc.getStatus())) {
            throw new QuotaExceededException(HttpStatus.BAD_REQUEST,
                    "Cannot favorite a deleted document", "DOCUMENT_DELETED");
        }

        if (!canView(doc, user)) {
            throw new QuotaExceededException(HttpStatus.FORBIDDEN,
                    "You do not have permission to access this document", "DOCUMENT_ACCESS_DENIED");
        }

        return doc;
    }

    private boolean canView(Document doc, User user) {
        boolean isOwner = doc.getOwner().getUserId().equals(user.getUserId());
        if (isOwner) return true;

        boolean isDirectShared = documentShareRepository
                .findByDocumentAndSharedWithAndStatus(doc, user, "ACTIVE")
                .isPresent();
        if (isDirectShared) return true;

        List<GroupDocumentShare> activeGroupShares =
                groupDocumentShareRepository.findByDocumentAndStatus(doc, "ACTIVE");
        for (GroupDocumentShare gs : activeGroupShares) {
            if ("ACTIVE".equals(gs.getGroup().getStatus())
                    && studyGroupMemberRepository.existsByGroupAndUserAndStatus(gs.getGroup(), user, "ACTIVE")) {
                return true;
            }
        }

        if (doc.getFolder() != null
                && folderShareService.hasAccessToFolder(doc.getFolder().getFolderId(), user.getEmail())) {
            return true;
        }

        return "PUBLIC".equals(doc.getVisibility()) && "APPROVED".equals(doc.getApprovalStatus());
    }

    private User loadUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
    }
}
