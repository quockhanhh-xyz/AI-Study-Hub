package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.dto.ExtractionResult;
import com.demo.ai_study_hub.entity.Document;
import com.demo.ai_study_hub.entity.ProcessingStatus;
import com.demo.ai_study_hub.repository.DocumentRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DocumentProcessingWorker {

    private static final Logger log = LoggerFactory.getLogger(DocumentProcessingWorker.class);

    private final DocumentRepository documentRepository;
    private final DocumentTextExtractor documentTextExtractor;
    private final DocumentProcessingPersister documentProcessingPersister;

    @Async("documentProcessingExecutor")
    public void processDocumentAsync(Integer documentId, ProcessingStatus previousStatus) {
        log.info("Starting async document processing for documentId={}", documentId);
        try {
            // 1. Check if document exists and is ACTIVE
            Document doc = documentRepository.findById(documentId).orElse(null);
            if (doc == null || !"ACTIVE".equals(doc.getStatus())) {
                log.warn("Document is not active or deleted, aborting processing. documentId={}", documentId);
                documentProcessingPersister.saveFailure(
                        documentId,
                        ProcessingStatus.FAILED,
                        "Document is no longer active (deleted or trashed).",
                        previousStatus
                );
                return;
            }

            // 2. Call extractor (outside transaction to avoid connection exhaustion)
            ExtractionResult result = documentTextExtractor.extract(doc);

            // 3. Re-verify document state is still ACTIVE in db before save
            doc = documentRepository.findById(documentId).orElse(null);
            if (doc == null || !"ACTIVE".equals(doc.getStatus())) {
                log.warn("Document was deleted or trashed during processing, aborting. documentId={}", documentId);
                documentProcessingPersister.saveFailure(
                        documentId,
                        ProcessingStatus.FAILED,
                        "Document is no longer active (deleted or trashed).",
                        previousStatus
                );
                return;
            }

            // 4. Save results inside transaction
            if (result.getStatus() == ProcessingStatus.COMPLETED) {
                documentProcessingPersister.saveSuccess(documentId, result);
                log.info("Document processing completed successfully for documentId={}", documentId);
            } else {
                String error = result.getError() != null ? result.getError() : "Extraction failed";
                documentProcessingPersister.saveFailure(documentId, result.getStatus(), error, previousStatus);
                log.warn("Document processing failed with status={} for documentId={}", result.getStatus(), documentId);
            }

        } catch (Exception e) {
            log.error("Unhandled exception in async document processing worker for documentId={}", documentId, e);
            try {
                documentProcessingPersister.saveFailure(
                        documentId,
                        ProcessingStatus.FAILED,
                        "An unexpected error occurred during extraction.",
                        previousStatus
                );
            } catch (Exception ex) {
                log.error("Failed to save final FAILED status for documentId={}", documentId, ex);
            }
        }
    }
}
