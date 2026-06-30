package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.dto.DocumentContentResponse;
import com.demo.ai_study_hub.dto.DocumentProcessingStatusResponse;
import com.demo.ai_study_hub.entity.*;
import com.demo.ai_study_hub.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.Executor;

@Service
@RequiredArgsConstructor
public class DocumentProcessingService {

    private final DocumentRepository documentRepository;
    private final DocumentContentRepository documentContentRepository;
    private final DocumentChunkRepository documentChunkRepository;
    private final UserRepository userRepository;

    // For access validations
    private final DocumentShareRepository documentShareRepository;
    private final GroupDocumentShareRepository groupDocumentShareRepository;
    private final StudyGroupMemberRepository studyGroupMemberRepository;
    private final FolderShareService folderShareService;
    private final DocumentService documentService;

    private final ApplicationEventPublisher eventPublisher;

    @Autowired
    @Qualifier("documentProcessingExecutor")
    private Executor documentProcessingExecutor;

    @Transactional
    public DocumentProcessingStatusResponse startProcessing(Integer documentId, String email) {
        User user = getUser(email);
        Document doc = getActiveDocument(documentId);

        // Only owner can trigger process
        validateOwnerAccess(doc, user);

        // Check thread pool capacity synchronously before starting transaction
        checkExecutorCapacity();

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

        // Publish event to run worker after transaction commit
        eventPublisher.publishEvent(new DocumentProcessingEvent(this, documentId, previousStatus));

        doc.setDocumentContent(content);
        return mapToStatusResponse(doc);
    }

    @Transactional
    public DocumentProcessingStatusResponse startReprocessing(Integer documentId, String email) {
        User user = getUser(email);
        Document doc = getActiveDocument(documentId);

        // Only owner can trigger reprocess
        validateOwnerAccess(doc, user);

        // Check thread pool capacity synchronously before starting transaction
        checkExecutorCapacity();

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

        // Publish event to run worker after transaction commit
        eventPublisher.publishEvent(new DocumentProcessingEvent(this, documentId, previousStatus));

        doc.setDocumentContent(content);
        return mapToStatusResponse(doc);
    }

    @Transactional
    public DocumentProcessingStatusResponse getProcessingStatus(Integer documentId, String email) {
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

            // Revert state safely based on previous successful snapshot
            if (content.getExtractedText() != null && content.getProcessedAt() != null) {
                content.setProcessingStatus(ProcessingStatus.COMPLETED);
                content.setLastAttemptStatus(ProcessingStatus.FAILED);
                content.setLastAttemptError("Reprocessing was interrupted. Previous successful content preserved.");
                content.setLastAttemptedAt(LocalDateTime.now());
            } else {
                content.setProcessingStatus(ProcessingStatus.FAILED);
                content.setLastAttemptStatus(ProcessingStatus.FAILED);
                content.setLastAttemptError("Processing was interrupted. Please reprocess the document.");
                content.setLastAttemptedAt(LocalDateTime.now());
            }
            documentContentRepository.save(content);
            doc.setDocumentContent(content);
        }

        return mapToStatusResponse(doc);
    }

    @Transactional(readOnly = true)
    public DocumentContentResponse getExtractedContent(Integer documentId, String email) {
        User user = getUser(email);
        Document doc = getActiveDocument(documentId);

        // Only owner can see full text
        validateOwnerAccess(doc, user);

        DocumentContent content = documentContentRepository.findByDocument_DocumentId(documentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document content not found"));

        if (content.getProcessingStatus() != ProcessingStatus.COMPLETED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Content is not available");
        }

        return DocumentContentResponse.builder()
                .documentId(documentId)
                .extractedText(content.getExtractedText() != null ? content.getExtractedText() : "")
                .build();
    }

    @Transactional
    public void recoverStaleJobs() {
        LocalDateTime threshold = LocalDateTime.now().minusMinutes(10);
        List<DocumentContent> staleContents = documentContentRepository
                .findByProcessingStatusAndProcessingStartedAtBefore(ProcessingStatus.PROCESSING, threshold);

        for (DocumentContent content : staleContents) {
            if (content.getExtractedText() != null && content.getProcessedAt() != null) {
                content.setProcessingStatus(ProcessingStatus.COMPLETED);
                content.setLastAttemptStatus(ProcessingStatus.FAILED);
                content.setLastAttemptError("Reprocessing was interrupted. Previous successful content preserved.");
                content.setLastAttemptedAt(LocalDateTime.now());
            } else {
                content.setProcessingStatus(ProcessingStatus.FAILED);
                content.setLastAttemptStatus(ProcessingStatus.FAILED);
                content.setLastAttemptError("Processing was interrupted. Please reprocess the document.");
                content.setLastAttemptedAt(LocalDateTime.now());
            }
            documentContentRepository.save(content);
        }
    }

    private void checkExecutorCapacity() {
        if (documentProcessingExecutor instanceof ThreadPoolTaskExecutor executor) {
            int active = executor.getActiveCount();
            int maxPoolSize = executor.getMaxPoolSize();
            int queueCapacity = executor.getThreadPoolExecutor().getQueue().remainingCapacity();
            if (queueCapacity == 0 && active >= maxPoolSize) {
                throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Server is busy. Please try again later.");
            }
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

    private DocumentProcessingStatusResponse mapToStatusResponse(Document doc) {
        DocumentContent content = doc.getDocumentContent();
        int chunkCount = content != null ? documentChunkRepository.countByDocument_DocumentId(doc.getDocumentId()) : 0;

        return DocumentProcessingStatusResponse.builder()
                .documentId(doc.getDocumentId())
                .processingStatus(content != null ? content.getProcessingStatus().name() : "PENDING")
                .characterCount(content != null ? content.getCharacterCount() : 0)
                .originalCharacterCount(content != null ? content.getOriginalCharacterCount() : 0)
                .wordCount(content != null ? content.getWordCount() : 0)
                .chunkCount(chunkCount)
                .isTruncated(content != null ? content.getIsTruncated() : false)
                .processingStartedAt(content != null ? content.getProcessingStartedAt() : null)
                .processedAt(content != null ? content.getProcessedAt() : null)
                .lastAttemptStatus(content != null && content.getLastAttemptStatus() != null ? content.getLastAttemptStatus().name() : null)
                .lastAttemptError(content != null ? content.getLastAttemptError() : null)
                .lastAttemptedAt(content != null ? content.getLastAttemptedAt() : null)
                .build();
    }
}
