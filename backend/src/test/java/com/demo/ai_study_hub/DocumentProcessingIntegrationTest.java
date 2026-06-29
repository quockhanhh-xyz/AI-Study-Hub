package com.demo.ai_study_hub;

import com.demo.ai_study_hub.dto.ExtractionResult;
import com.demo.ai_study_hub.entity.*;
import com.demo.ai_study_hub.repository.*;
import com.demo.ai_study_hub.service.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.boot.test.mock.mockito.SpyBean;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@SpringBootTest
@ActiveProfiles("test")
class DocumentProcessingIntegrationTest {

    @Autowired
    private DocumentProcessingService documentProcessingService;

    @Autowired
    private DocumentRepository documentRepository;

    @Autowired
    private DocumentContentRepository documentContentRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PlatformTransactionManager transactionManager;

    @MockBean
    private DocumentTextExtractor documentTextExtractor;

    @SpyBean
    private DocumentProcessingWorker documentProcessingWorker;

    private TransactionTemplate transactionTemplate;
    private User testUser;
    private Document testDoc;

    @BeforeEach
    void setUp() {
        transactionTemplate = new TransactionTemplate(transactionManager);

        transactionTemplate.execute(status -> {
            documentContentRepository.deleteAllInBatch();
            documentRepository.deleteAllInBatch();
            userRepository.deleteAllInBatch();
            userRepository.flush();

            testUser = new User();
            testUser.setFullName("Integration Owner");
            testUser.setEmail("integration@gmail.com");
            testUser.setPasswordHash("hashedpassword");
            testUser.setRole("USER");
            testUser.setTier("FREE");
            testUser.setStatus("ACTIVE");
            testUser = userRepository.save(testUser);

            testDoc = new Document();
            testDoc.setTitle("Integration Document");
            testDoc.setOriginalFileName("file.pdf");
            testDoc.setFileUrl("https://cloudinary.com/file");
            testDoc.setPublicId("storage/path");
            testDoc.setFileType("pdf");
            testDoc.setFileSize(1024L);
            testDoc.setOwner(testUser);
            testDoc.setVisibility("PRIVATE");
            testDoc.setApprovalStatus("PENDING");
            testDoc.setStatus("ACTIVE");
            testDoc = documentRepository.save(testDoc);

            return null;
        });
    }

    @Test
    void processDocument_ShouldRunAsyncOnCorrectThread_AfterCommit() throws Exception {
        CountDownLatch latch = new CountDownLatch(1);
        AtomicReference<String> threadNameRef = new AtomicReference<>();

        when(documentTextExtractor.extract(any())).thenAnswer(invocation -> {
            threadNameRef.set(Thread.currentThread().getName());
            latch.countDown();
            return ExtractionResult.builder()
                    .status(ProcessingStatus.COMPLETED)
                    .extractedText("Successfully parsed content.")
                    .build();
        });

        // Trigger processing (which runs inside a transaction, commits, then triggers async)
        documentProcessingService.startProcessing(testDoc.getDocumentId(), "integration@gmail.com");

        boolean reached = latch.await(5, TimeUnit.SECONDS);
        assertTrue(reached, "Async execution latch should fire");
        assertNotNull(threadNameRef.get(), "Extractor thread should be recorded");
        assertTrue(threadNameRef.get().startsWith("DocProc-"), "Thread name should start with DocProc- but was: " + threadNameRef.get());

        // Poll database until status changes to COMPLETED (since transaction is committed separately on worker thread)
        DocumentContent content = null;
        for (int i = 0; i < 50; i++) {
            content = documentContentRepository.findByDocument_DocumentId(testDoc.getDocumentId()).orElse(null);
            if (content != null && content.getProcessingStatus() == ProcessingStatus.COMPLETED) {
                break;
            }
            Thread.sleep(100);
        }

        assertNotNull(content);
        assertEquals(ProcessingStatus.COMPLETED, content.getProcessingStatus());
        assertEquals("Successfully parsed content.", content.getExtractedText());
    }

    @Test
    void processDocument_WhenTransactionRollsBack_ShouldNotTriggerWorker() throws Exception {
        CountDownLatch latch = new CountDownLatch(1);

        when(documentTextExtractor.extract(any())).thenAnswer(invocation -> {
            latch.countDown();
            return ExtractionResult.builder()
                    .status(ProcessingStatus.COMPLETED)
                    .build();
        });

        try {
            transactionTemplate.execute(status -> {
                documentProcessingService.startProcessing(testDoc.getDocumentId(), "integration@gmail.com");
                throw new RuntimeException("Forced rollback");
            });
        } catch (RuntimeException e) {
            assertEquals("Forced rollback", e.getMessage());
        }

        // Wait a short time to verify the worker is NOT triggered
        boolean reached = latch.await(2, TimeUnit.SECONDS);
        assertFalse(reached, "Worker should not run on rollback");

        // Verify status record does not exist since the entire transaction rolled back
        java.util.Optional<DocumentContent> contentOpt = documentContentRepository.findByDocument_DocumentId(testDoc.getDocumentId());
        assertTrue(contentOpt.isEmpty(), "Content record should be rolled back and not exist in DB");
    }
}
