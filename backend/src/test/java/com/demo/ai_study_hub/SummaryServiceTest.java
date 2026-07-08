package com.demo.ai_study_hub;

import com.demo.ai_study_hub.dto.AiAnswer;
import com.demo.ai_study_hub.dto.SummaryDtos.*;
import com.demo.ai_study_hub.entity.*;
import com.demo.ai_study_hub.enums.UserTier;
import com.demo.ai_study_hub.exception.QuotaExceededException;
import com.demo.ai_study_hub.service.*;
import com.demo.ai_study_hub.repository.AiSummaryRepository;
import com.demo.ai_study_hub.repository.DocumentChunkRepository;
import com.demo.ai_study_hub.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SummaryServiceTest {

    @Mock private AiSummaryRepository aiSummaryRepository;
    @Mock private DocumentChunkRepository documentChunkRepository;
    @Mock private UserRepository userRepository;
    @Mock private AiLearningAccessGuard accessGuard;
    @Mock private AiLearningQuotaPolicy quotaPolicy;
    @Mock private AiLearningPromptBuilder promptBuilder;
    @Mock private AiLearningOutputValidator validator;
    @Mock private TierPolicyService tierPolicyService;
    @Mock private AiProviderRouter aiProviderRouter;
    @Mock private AiModelSelector aiModelSelector;
    @Mock private AiProviderService aiProviderService;
    @Mock private com.demo.ai_study_hub.repository.AiUsageReservationRepository aiUsageReservationRepository;
    @Mock private com.demo.ai_study_hub.repository.AiUsageLogRepository aiUsageLogRepository;
    @Mock private org.springframework.transaction.PlatformTransactionManager transactionManager;

    private SummaryService summaryService;

    private User user;
    private Document document;
    private DocumentContent content;

    private static final String VALID_JSON = """
            {
              "overview": "This document covers photosynthesis.",
              "keyPoints": ["Plants convert light to energy", "Chlorophyll absorbs light"],
              "importantTerms": [{"term": "Photosynthesis", "definition": "Process of converting light to energy"}],
              "suggestedReviewQuestions": ["What is photosynthesis?"]
            }
            """;

    @BeforeEach
    void setUp() {
        // Real ObjectMapper — we want actual JSON (de)serialization exercised, not mocked.
        ObjectMapper objectMapper = new ObjectMapper();

        org.springframework.transaction.TransactionStatus mockStatus = mock(org.springframework.transaction.TransactionStatus.class);
        lenient().when(transactionManager.getTransaction(any())).thenReturn(mockStatus);

        summaryService = new SummaryService(
                aiSummaryRepository, documentChunkRepository, userRepository,
                accessGuard, quotaPolicy, promptBuilder, validator,
                tierPolicyService, aiProviderRouter, aiModelSelector, objectMapper,
                aiUsageLogRepository, aiUsageReservationRepository, transactionManager);

        user = new User();
        user.setUserId(1);
        user.setEmail("user@test.com");
        user.setTier(UserTier.FREE);

        document = new Document();
        document.setDocumentId(10);
        document.setTitle("Bio 101");
        document.setStatus("ACTIVE");

        content = DocumentContent.builder()
                .contentId(99L)
                .document(document)
                .extractedText("Photosynthesis is a process used by plants...")
                .processedAt(LocalDateTime.now(ZoneOffset.UTC))
                .build();

        lenient().when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(user));
        lenient().when(accessGuard.requireReadyDocument(10, user))
                .thenReturn(new AiLearningAccessGuard.ReadyDocument(document, content));
        lenient().when(tierPolicyService.getEffectiveTier(user)).thenReturn(UserTier.FREE);
        lenient().when(quotaPolicy.summaryDailyLimit(UserTier.FREE)).thenReturn(3);
        lenient().when(aiProviderRouter.isConfigured()).thenReturn(true);
        lenient().when(aiProviderRouter.route()).thenReturn(aiProviderService);
        lenient().when(aiModelSelector.selectModel("FREE")).thenReturn("gemini-2.5-flash-lite");
        lenient().when(aiModelSelector.getMaxLearningOutputTokens("FREE")).thenReturn(1500);
        lenient().when(promptBuilder.buildSummaryPrompt(any())).thenReturn("PROMPT");
        lenient().when(documentChunkRepository.findByDocument_DocumentIdOrderByChunkIndexAsc(10))
                .thenReturn(List.of());
        lenient().when(aiSummaryRepository.save(any())).thenAnswer(inv -> {
            AiSummary s = inv.getArgument(0);
            s.setSummaryId(1L);
            return s;
        });
        lenient().when(aiUsageReservationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        lenient().when(aiUsageReservationRepository.findByRequestId(any())).thenAnswer(inv -> {
            String rId = inv.getArgument(0);
            return Optional.of(AiUsageReservation.builder()
                    .requestId(rId)
                    .status("RESERVED")
                    .build());
        });
        lenient().when(aiUsageLogRepository.countSuccessfulLogsByTypeAfter(anyInt(), anyString(), any())).thenReturn(0L);
        lenient().when(aiUsageReservationRepository.countActiveReservationsByType(any(), anyString(), any())).thenReturn(0L);
    }

    @Test
    void generate_WhenAiReturnsValidJson_ShouldSaveAndReturnSummary() {
        when(aiProviderService.call(any(), any(), anyInt(), any(Double.class), anyBoolean()))
                .thenReturn(AiAnswer.builder().text(VALID_JSON).build());
        doNothing().when(validator).validateSummary(any());

        SummaryResponse response = summaryService.generate(10, "user@test.com");

        assertNotNull(response);
        assertEquals(1L, response.getSummaryId());
        assertEquals(10, response.getDocumentId());
        assertEquals("This document covers photosynthesis.", response.getOverview());
        assertEquals(2, response.getKeyPoints().size());
        verify(aiSummaryRepository, times(1)).save(any());
    }

    @Test
    void generate_WhenDailyQuotaExceeded_ShouldThrow403WithCode_AndNeverCallAi() {
        when(aiUsageLogRepository.countSuccessfulLogsByTypeAfter(eq(1), eq("SUMMARY"), any())).thenReturn(3L);

        QuotaExceededException ex = assertThrows(QuotaExceededException.class,
                () -> summaryService.generate(10, "user@test.com"));

        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
        assertEquals("SUMMARY_QUOTA_EXCEEDED", ex.getCode());
        verify(aiProviderRouter, never()).route();
        verify(aiSummaryRepository, never()).save(any());
    }

    @Test
    void generate_WhenFirstCallInvalid_ShouldRetryOnceThenSucceed() {
        when(aiProviderService.call(any(), any(), anyInt(), any(Double.class), anyBoolean()))
                .thenReturn(AiAnswer.builder().text("not valid json {{{").build())
                .thenReturn(AiAnswer.builder().text(VALID_JSON).build());
        doNothing().when(validator).validateSummary(any());

        SummaryResponse response = summaryService.generate(10, "user@test.com");

        assertNotNull(response);
        verify(aiProviderService, times(2)).call(any(), any(), anyInt(), any(Double.class), anyBoolean());
        verify(aiSummaryRepository, times(1)).save(any());
    }

    @Test
    void generate_WhenBothAttemptsInvalid_ShouldThrow502_AndNeverSave() {
        when(aiProviderService.call(any(), any(), anyInt(), any(Double.class), anyBoolean()))
                .thenReturn(AiAnswer.builder().text("garbage").build());

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> summaryService.generate(10, "user@test.com"));

        assertEquals(HttpStatus.BAD_GATEWAY, ex.getStatusCode());
        verify(aiProviderService, times(2)).call(any(), any(), anyInt(), any(Double.class), anyBoolean());
        verify(aiSummaryRepository, never()).save(any());
    }

    @Test
    void generate_WhenSchemaValidationFails_ShouldRetryThenFailCleanly() {
        when(aiProviderService.call(any(), any(), anyInt(), any(Double.class), anyBoolean()))
                .thenReturn(AiAnswer.builder().text(VALID_JSON).build());
        doThrow(new IllegalArgumentException("AI output validation failed: overview is blank"))
                .when(validator).validateSummary(any());

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> summaryService.generate(10, "user@test.com"));

        assertEquals(HttpStatus.BAD_GATEWAY, ex.getStatusCode());
        verify(aiSummaryRepository, never()).save(any());
    }

    @Test
    void generate_WhenAiNotConfigured_ShouldThrow503() {
        when(aiProviderRouter.isConfigured()).thenReturn(false);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> summaryService.generate(10, "user@test.com"));

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, ex.getStatusCode());
        verify(aiSummaryRepository, never()).save(any());
    }

    @Test
    void generate_WhenDocumentNotReady_ShouldPropagateAccessGuardException() {
        when(accessGuard.requireReadyDocument(10, user))
                .thenThrow(new QuotaExceededException(HttpStatus.BAD_REQUEST,
                        "Document is not ready yet", "DOCUMENT_NOT_READY_FOR_AI"));

        QuotaExceededException ex = assertThrows(QuotaExceededException.class,
                () -> summaryService.generate(10, "user@test.com"));

        assertEquals("DOCUMENT_NOT_READY_FOR_AI", ex.getCode());
        verify(aiProviderRouter, never()).route();
    }

    @Test
    void getLatest_WhenNoSummaryExists_ShouldThrow404WithCode() {
        when(aiSummaryRepository.findByDocument_DocumentIdAndUser_UserIdOrderByCreatedAtDesc(10, 1))
                .thenReturn(Optional.empty());

        QuotaExceededException ex = assertThrows(QuotaExceededException.class,
                () -> summaryService.getLatest(10, "user@test.com"));

        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
        assertEquals("SUMMARY_NOT_FOUND", ex.getCode());
    }

    @Test
    void getLatest_WhenSummaryExists_ShouldReturnDeserializedFields() throws Exception {
        ObjectMapper om = new ObjectMapper();
        AiSummary saved = AiSummary.builder()
                .summaryId(5L)
                .document(document)
                .user(user)
                .overview("Overview text")
                .keyPointsJson(om.writeValueAsString(List.of("point A", "point B")))
                .importantTermsJson(om.writeValueAsString(List.of(
                        ImportantTerm.builder().term("X").definition("Y").build())))
                .reviewQuestionsJson(om.writeValueAsString(List.of("Q1?")))
                .model("gemini-2.5-flash-lite")
                .status("SUCCESS")
                .sourceChunkCount(4)
                .createdAt(LocalDateTime.now(ZoneOffset.UTC))
                .updatedAt(LocalDateTime.now(ZoneOffset.UTC))
                .build();

        when(aiSummaryRepository.findByDocument_DocumentIdAndUser_UserIdOrderByCreatedAtDesc(10, 1))
                .thenReturn(Optional.of(saved));

        SummaryResponse response = summaryService.getLatest(10, "user@test.com");

        assertEquals(5L, response.getSummaryId());
        assertEquals(2, response.getKeyPoints().size());
        assertEquals("point A", response.getKeyPoints().get(0));
        assertEquals(1, response.getImportantTerms().size());
        assertEquals("X", response.getImportantTerms().get(0).getTerm());
    }

    @Test
    void getHistory_ShouldOnlyQueryScopedToCurrentUser() {
        summaryService.getHistory(10, "user@test.com");

        verify(aiSummaryRepository, times(1))
                .findByDocument_DocumentIdAndUser_UserIdOrderByCreatedAtDesc(eq(10), eq(1), any());
    }
}