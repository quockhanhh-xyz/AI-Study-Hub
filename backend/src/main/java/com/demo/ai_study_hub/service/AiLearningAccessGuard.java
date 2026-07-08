package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.entity.Document;
import com.demo.ai_study_hub.entity.DocumentContent;
import com.demo.ai_study_hub.entity.GroupDocumentShare;
import com.demo.ai_study_hub.entity.User;
import com.demo.ai_study_hub.exception.QuotaExceededException;
import com.demo.ai_study_hub.repository.DocumentContentRepository;
import com.demo.ai_study_hub.repository.DocumentRepository;
import com.demo.ai_study_hub.repository.DocumentShareRepository;
import com.demo.ai_study_hub.repository.GroupDocumentShareRepository;
import com.demo.ai_study_hub.repository.StudyGroupMemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Reused by SummaryService/FlashcardService/QuizService so the 4-path read
 * permission check and the document-readiness check are defined ONCE,
 * matching exactly AiChatServiceImpl's validateViewPermission /
 * validateProcessingStatus logic from Step 10 — but mapped to Step 14's own
 * error codes per api-contract.md section 18.6.
 */
@Component
@RequiredArgsConstructor
public class AiLearningAccessGuard {

    private final DocumentRepository documentRepository;
    private final DocumentContentRepository documentContentRepository;
    private final DocumentShareRepository documentShareRepository;
    private final GroupDocumentShareRepository groupDocumentShareRepository;
    private final StudyGroupMemberRepository studyGroupMemberRepository;
    private final FolderShareService folderShareService;

    public record ReadyDocument(Document document, DocumentContent content) {}

    /**
     * Loads the document, verifies it is ACTIVE + owned/shared/public for
     * this user, and that its extraction pipeline (Step 9) is COMPLETED.
     * Throws with the exact error codes required by TC-LEARN-01..08.
     */
    public ReadyDocument requireReadyDocument(Integer documentId, User user) {
        Document doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new QuotaExceededException(HttpStatus.NOT_FOUND,
                        "Document not found", "DOCUMENT_NOT_FOUND"));

        if (!"ACTIVE".equals(doc.getStatus())) {
            throw new QuotaExceededException(HttpStatus.BAD_REQUEST,
                    "Document has been trashed or deleted", "DOCUMENT_DELETED");
        }

        validateReadPermission(doc, user);

        DocumentContent content = documentContentRepository.findByDocument_DocumentId(documentId)
                .orElseThrow(() -> new QuotaExceededException(HttpStatus.BAD_REQUEST,
                        "Document is not ready yet", "DOCUMENT_NOT_READY_FOR_AI"));

        switch (content.getProcessingStatus()) {
            case PENDING -> throw new QuotaExceededException(HttpStatus.BAD_REQUEST,
                    "Document is not ready yet", "DOCUMENT_NOT_READY_FOR_AI");
            case PROCESSING -> throw new QuotaExceededException(HttpStatus.BAD_REQUEST,
                    "Document is currently being processed", "DOCUMENT_PROCESSING");
            case FAILED, UNSUPPORTED, EMPTY_CONTENT -> throw new QuotaExceededException(HttpStatus.BAD_REQUEST,
                    "Document processing failed. Please reprocess the document.", "DOCUMENT_PROCESS_FAILED");
            case COMPLETED -> { /* ready */ }
            default -> throw new QuotaExceededException(HttpStatus.BAD_REQUEST,
                    "Document is not ready yet", "DOCUMENT_NOT_READY_FOR_AI");
        }

        if (content.getExtractedText() == null || content.getExtractedText().isBlank()) {
            throw new QuotaExceededException(HttpStatus.BAD_REQUEST,
                    "Document text content is empty", "DOCUMENT_CONTENT_EMPTY");
        }

        return new ReadyDocument(doc, content);
    }

    /**
     * Same 4-path permission logic as Step 10's validateViewPermission:
     * owner OR direct share OR group-document share (active member) OR
     * folder share (delegates to Step 6) OR PUBLIC+APPROVED document.
     */
    private void validateReadPermission(Document doc, User user) {
        boolean isOwner = doc.getOwner().getUserId().equals(user.getUserId());
        if (isOwner) return;

        boolean isDirectShared = documentShareRepository
                .findByDocumentAndSharedWithAndStatus(doc, user, "ACTIVE")
                .isPresent();
        if (isDirectShared) return;

        List<GroupDocumentShare> activeGroupShares =
                groupDocumentShareRepository.findByDocumentAndStatus(doc, "ACTIVE");
        for (GroupDocumentShare gs : activeGroupShares) {
            if ("ACTIVE".equals(gs.getGroup().getStatus())
                    && studyGroupMemberRepository.existsByGroupAndUserAndStatus(gs.getGroup(), user, "ACTIVE")) {
                return;
            }
        }

        if (doc.getFolder() != null
                && folderShareService.hasAccessToFolder(doc.getFolder().getFolderId(), user.getEmail())) {
            return;
        }

        if ("PUBLIC".equals(doc.getVisibility()) && "APPROVED".equals(doc.getApprovalStatus())) {
            return;
        }

        throw new QuotaExceededException(HttpStatus.FORBIDDEN,
                "You do not have permission to access this document", "DOCUMENT_ACCESS_DENIED");
    }
}