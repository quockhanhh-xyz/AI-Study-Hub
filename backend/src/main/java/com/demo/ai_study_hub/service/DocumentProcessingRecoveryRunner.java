package com.demo.ai_study_hub.service;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DocumentProcessingRecoveryRunner implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DocumentProcessingRecoveryRunner.class);
    private final DocumentProcessingService documentProcessingService;

    @Override
    public void run(String... args) throws Exception {
        log.info("Running stale AI document processing job recovery on startup...");
        try {
            documentProcessingService.recoverStaleJobs();
            log.info("Stale AI document processing job recovery completed successfully.");
        } catch (Exception e) {
            log.error("Failed to run stale job recovery on startup", e);
        }
    }
}
