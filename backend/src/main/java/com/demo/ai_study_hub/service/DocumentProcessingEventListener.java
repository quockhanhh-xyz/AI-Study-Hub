package com.demo.ai_study_hub.service;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import java.util.concurrent.RejectedExecutionException;

@Component
@RequiredArgsConstructor
public class DocumentProcessingEventListener {

    private static final Logger log = LoggerFactory.getLogger(DocumentProcessingEventListener.class);
    private final DocumentProcessingWorker documentProcessingWorker;
    private final DocumentProcessingPersister documentProcessingPersister;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleDocumentProcessingEvent(DocumentProcessingEvent event) {
        log.info("Handling DocumentProcessingEvent after transaction commit for documentId={}", event.getDocumentId());
        try {
            documentProcessingWorker.processDocumentAsync(event.getDocumentId(), event.getPreviousStatus());
        } catch (RejectedExecutionException e) {
            log.error("Failed to enqueue document processing job because thread pool queue is full. Reverting state.", e);
            try {
                documentProcessingPersister.saveFailure(
                        event.getDocumentId(),
                        event.getPreviousStatus(),
                        "Server queue is full. Task was rejected.",
                        event.getPreviousStatus()
                );
            } catch (Exception ex) {
                log.error("Failed to run compensation state recovery for documentId={}", event.getDocumentId(), ex);
            }
        }
    }
}
