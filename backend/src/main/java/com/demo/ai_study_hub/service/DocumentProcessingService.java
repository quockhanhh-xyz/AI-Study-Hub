package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.dto.DocumentResponse;
import com.demo.ai_study_hub.entity.*;
import com.demo.ai_study_hub.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DocumentProcessingService {

    private final DocumentRepository documentRepository;
    private final DocumentContentRepository documentContentRepository;
    private final UserRepository userRepository;
    private final DocumentProcessingWorker documentProcessingWorker;
    
    // For access validations
    private final DocumentShareRepository documentShareRepository;
    private final GroupDocumentShareRepository groupDocumentShareRepository;
    private final StudyGroupMemberRepository studyGroupMemberRepository;
    private final FolderShareService folderShareService;
    private final DocumentService documentService;

    @Transactional
    public DocumentResponse startProcessing(Integer documentId, String email) {
        User user = getUser(email);
        Document doc = getActiveDocument(documentId);
        
        // Only owner can trigger process
        validateOwnerAccess(doc, user);

        // Legacy file support - ensure content exists
        DocumentContent content = documentService.findOrCreatePending(doc);
        
        // Lock content row for update
        content = documentContentRepository.findByDocumentIdForWrite(documentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document content not found"));

        ProcessingStatus currentStatus = content.getProcessingStatus();
        if (currentStatus == ProcessingStatus.PROCESSING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Document is already being processed");
        }

        if (currentStatus == ProcessingStatus.COMPLETED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Document is already processed. Use reprocess instead.");
        }

        // Move to PROCESSING state
        ProcessingStatus previousStatus = currentStatus;
        content.setProcessingStatus(ProcessingStatus.PROCESSING);
        content.setProcessingStartedAt(LocalDateTime.now());
        documentContentRepository.save(content);

        // Trigger async worker
        documentProcessingWorker.processDocumentAsync(documentId, previousStatus);

        doc.setDocumentContent(content);
        return mapToResponse(doc, user);
    }

    @Transactional
    public DocumentResponse startReprocessing(Integer documentId, String email) {
        User user = getUser(email);
        Document doc = getActiveDocument(documentId);

        // Only owner can trigger reprocess
        validateOwnerAccess(doc, user);

        // Legacy file support - ensure content exists
        DocumentContent content = documentService.findOrCreatePending(doc);

        // Lock content row for update
        content = documentContentRepository.findByDocumentIdForWrite(documentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document content not found"));

        ProcessingStatus currentStatus = content.getProcessingStatus();
        if (currentStatus == ProcessingStatus.PROCESSING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Document is already being processed");
        }

        // Reprocess can be run on COMPLETED, FAILED, UNSUPPORTED, EMPTY_CONTENT, or PENDING
        ProcessingStatus previousStatus = currentStatus;
        content.setProcessingStatus(ProcessingStatus.PROCESSING);
        content.setProcessingStartedAt(LocalDateTime.now());
        documentContentRepository.save(content);

        // Trigger async worker
        documentProcessingWorker.processDocumentAsync(documentId, previousStatus);

        doc.setDocumentContent(content);
        return mapToResponse(doc, user);
    }

    @Transactional
    public DocumentResponse getProcessingStatus(Integer documentId, String email) {
        User user = getUser(email);
        Document doc = getActiveDocument(documentId);

        // Shared/Group members can check status, guest/outsider blocked
        validateViewAccess(doc, user);

        // Legacy file support - check if we need on-demand creation
        DocumentContent content = documentService.findOrCreatePending(doc);

        // Stuck job recovery check
        if (content.getProcessingStatus() == ProcessingStatus.PROCESSING
                && content.getProcessingStartedAt() != null
                && content.getProcessingStartedAt().isBefore(LocalDateTime.now().minusMinutes(10))) {
            content.setProcessingStatus(ProcessingStatus.FAILED);
            content.setLastAttemptStatus(ProcessingStatus.FAILED);
            content.setLastAttemptError("Processing was interrupted. Please reprocess the document.");
            content.setLastAttemptedAt(LocalDateTime.now());
            documentContentRepository.save(content);
            doc.setDocumentContent(content);
        }

        return mapToResponse(doc, user);
    }

    @Transactional(readOnly = true)
    public String getExtractedContent(Integer documentId, String email) {
        User user = getUser(email);
        Document doc = getActiveDocument(documentId);

        // Only owner can see full text
        validateOwnerAccess(doc, user);

        DocumentContent content = documentContentRepository.findByDocument_DocumentId(documentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document content not found"));

        return content.getExtractedText() != null ? content.getExtractedText() : "";
    }

    @Transactional
    public void recoverStaleJobs() {
        LocalDateTime threshold = LocalDateTime.now().minusMinutes(10);
        List<DocumentContent> staleContents = documentContentRepository.findAll().stream()
                .filter(c -> c.getProcessingStatus() == ProcessingStatus.PROCESSING 
                        && c.getProcessingStartedAt() != null 
                        && c.getProcessingStartedAt().isBefore(threshold))
                .toList();

        for (DocumentContent content : staleContents) {
            content.setProcessingStatus(ProcessingStatus.FAILED);
            content.setLastAttemptStatus(ProcessingStatus.FAILED);
            content.setLastAttemptError("Processing was interrupted. Please reprocess the document.");
            content.setLastAttemptedAt(LocalDateTime.now());
            documentContentRepository.save(content);
        }
    }

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }

    private Document getActiveDocument(Integer documentId) {
        Document doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));
        if ("DELETED".equals(doc.getStatus())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found");
        }
        return doc;
    }

    private void validateOwnerAccess(Document doc, User user) {
        if (!doc.getOwner().getUserId().equals(user.getUserId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not the owner of this document");
        }
    }

    private void validateViewAccess(Document doc, User user) {
        boolean isOwner = doc.getOwner().getUserId().equals(user.getUserId());
        boolean isDirectShared = !isOwner && documentShareRepository
                .findByDocumentAndSharedWithAndStatus(doc, user, "ACTIVE")
                .isPresent();

        boolean isGroupShared = false;
        if (!isOwner && !isDirectShared) {
            List<GroupDocumentShare> activeGroupShares = groupDocumentShareRepository.findByDocumentAndStatus(doc, "ACTIVE");
            for (GroupDocumentShare groupShare : activeGroupShares) {
                if (studyGroupMemberRepository.existsByGroupAndUserAndStatus(groupShare.getGroup(), user, "ACTIVE")) {
                    isGroupShared = true;
                    break;
                }
            }
        }

        boolean hasFolderAccess = !isOwner && !isDirectShared && !isGroupShared
                && doc.getFolder() != null
                && folderShareService != null
                && folderShareService.hasAccessToFolder(doc.getFolder().getFolderId(), user.getEmail());

        boolean isPublicAndApproved = "PUBLIC".equals(doc.getVisibility()) && "APPROVED".equals(doc.getApprovalStatus());

        boolean hasSharedAccess = isDirectShared || isGroupShared || hasFolderAccess || isPublicAndApproved;

        if (!isOwner && !hasSharedAccess) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found");
        }
    }

    private DocumentResponse mapToResponse(Document doc, User requester) {
        // Use documentService's mapping method to avoid duplicating the complex logic
        return documentService.mapToResponseList(List.of(doc), requester).get(0);
    }
}
