package com.demo.ai_study_hub;

import com.demo.ai_study_hub.dto.AiAnswer;
import com.demo.ai_study_hub.dto.FlashcardDtos.*;
import com.demo.ai_study_hub.entity.*;
import com.demo.ai_study_hub.enums.UserTier;
import com.demo.ai_study_hub.exception.QuotaExceededException;
import com.demo.ai_study_hub.service.*;
import com.demo.ai_study_hub.repository.DocumentChunkRepository;
import com.demo.ai_study_hub.repository.FlashcardSetRepository;
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
class FlashcardServiceTest {

    @Mock private FlashcardSetRepository flashcardSetRepository;
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

    private FlashcardService flashcardService;

    private User user;
    private Document document;
    private DocumentContent content;
    private AiLearningQuotaPolicy.CountRange freeRange;

    private static final String VALID_JSON = """
            {
              "cards": [
                {"frontText": "What is X?", "backText": "X is...", "sourcePage": 1, "difficulty": "EASY"},
                {"frontText": "What is Y?", "backText": "Y is...", "sourcePage": 2, "difficulty": "MEDIUM"},
                {"frontText": "What is Z?", "backText": "Z is...", "sourcePage": 3, "difficulty": "HARD"}
              ]
            }
            """;

    @BeforeEach
    void setUp() {
        ObjectMapper objectMapper = new ObjectMapper();

        org.springframework.transaction.TransactionStatus mockStatus = mock(org.springframework.transaction.TransactionStatus.class);
        lenient().when(transactionManager.getTransaction(any())).thenReturn(mockStatus);

        flashcardService = new FlashcardService(
                flashcardSetRepository, documentChunkRepository, userRepository,
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
                .extractedText("Some extracted text...")
                .processedAt(LocalDateTime.now(ZoneOffset.UTC))
                .build();

        freeRange = new AiLearningQuotaPolicy.CountRange(3, 8, 8);

        lenient().when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(user));
        lenient().when(accessGuard.requireReadyDocument(10, user))
                .thenReturn(new AiLearningAccessGuard.ReadyDocument(document, content));
        lenient().when(tierPolicyService.getEffectiveTier(user)).thenReturn(UserTier.FREE);
        lenient().when(quotaPolicy.flashcardCountRange(UserTier.FREE)).thenReturn(freeRange);
        lenient().when(quotaPolicy.flashcardSetDailyLimit(UserTier.FREE)).thenReturn(2);
        lenient().when(aiProviderRouter.isConfigured()).thenReturn(true);
        lenient().when(aiProviderRouter.route()).thenReturn(aiProviderService);
        lenient().when(aiModelSelector.selectModel("FREE")).thenReturn("gemini-2.5-flash-lite");
        lenient().when(aiModelSelector.getMaxOutputTokens("FREE")).thenReturn(500);
        lenient().when(promptBuilder.buildFlashcardPrompt(any(), anyInt())).thenReturn("PROMPT");
        lenient().when(documentChunkRepository.findByDocument_DocumentIdOrderByChunkIndexAsc(10))
                .thenReturn(List.of());
        lenient().when(flashcardSetRepository.save(any())).thenAnswer(inv -> {
            FlashcardSet s = inv.getArgument(0);
            s.setFlashcardSetId(1L);
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
    void generate_WhenOmittedCount_ShouldUseTierDefault() {
        // Override the default fixture range so the tier default (3) matches
        // the 3-card VALID_JSON sample used across this test class.
        when(quotaPolicy.flashcardCountRange(UserTier.FREE))
                .thenReturn(new AiLearningQuotaPolicy.CountRange(3, 3, 8));
        when(aiProviderService.call(any(), any(), anyInt(), any(Double.class), anyBoolean()))
                .thenReturn(AiAnswer.builder().text(VALID_JSON).build());
        doNothing().when(validator).validateFlashcards(any(), eq(3));

        GenerateFlashcardRequest req = new GenerateFlashcardRequest(); // count = null → resolves to tier default = 3

        FlashcardSetResponse response = flashcardService.generate(10, req, "user@test.com");

        assertNotNull(response);
        assertEquals(3, response.getItemCount());
        verify(promptBuilder).buildFlashcardPrompt(any(), eq(3));
    }

    @Test
    void generate_WhenCountBelowMin_ShouldThrow400InvalidCount() {
        GenerateFlashcardRequest req = new GenerateFlashcardRequest();
        req.setCount(2); // below min=3

        QuotaExceededException ex = assertThrows(QuotaExceededException.class,
                () -> flashcardService.generate(10, req, "user@test.com"));

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        assertEquals("INVALID_FLASHCARD_COUNT", ex.getCode());
        verify(aiProviderRouter, never()).route();
    }

    @Test
    void generate_WhenFreeUserCountExceedsMax_ShouldThrow400() {
        GenerateFlashcardRequest req = new GenerateFlashcardRequest();
        req.setCount(9); // FREE max is 8

        QuotaExceededException ex = assertThrows(QuotaExceededException.class,
                () -> flashcardService.generate(10, req, "user@test.com"));

        assertEquals("INVALID_FLASHCARD_COUNT", ex.getCode());
        verify(flashcardSetRepository, never()).save(any());
    }

    @Test
    void generate_WhenDailyQuotaExceeded_ShouldThrow403() {
        when(aiUsageLogRepository.countSuccessfulLogsByTypeAfter(eq(1), eq("FLASHCARD"), any())).thenReturn(2L);
        GenerateFlashcardRequest req = new GenerateFlashcardRequest();
        req.setCount(3);

        QuotaExceededException ex = assertThrows(QuotaExceededException.class,
                () -> flashcardService.generate(10, req, "user@test.com"));

        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
        assertEquals("FLASHCARD_QUOTA_EXCEEDED", ex.getCode());
        verify(aiProviderRouter, never()).route();
    }

    @Test
    void generate_WhenAiCardCountMismatch_ShouldRetryThenFail() {
        when(aiProviderService.call(any(), any(), anyInt(), any(Double.class), anyBoolean()))
                .thenReturn(AiAnswer.builder().text(VALID_JSON).build());
        doThrow(new IllegalArgumentException("expected 5 cards but got 3"))
                .when(validator).validateFlashcards(any(), eq(3));

        GenerateFlashcardRequest req = new GenerateFlashcardRequest();
        req.setCount(3);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> flashcardService.generate(10, req, "user@test.com"));

        assertEquals(HttpStatus.BAD_GATEWAY, ex.getStatusCode());
        verify(aiProviderService, times(2)).call(any(), any(), anyInt(), any(Double.class), anyBoolean());
        verify(flashcardSetRepository, never()).save(any());
    }

    @Test
    void generate_ShouldPersistCardsWithSequentialPositions() {
        when(aiProviderService.call(any(), any(), anyInt(), any(Double.class), anyBoolean()))
                .thenReturn(AiAnswer.builder().text(VALID_JSON).build());
        doNothing().when(validator).validateFlashcards(any(), eq(3));

        GenerateFlashcardRequest req = new GenerateFlashcardRequest();
        req.setCount(3);

        FlashcardSetResponse response = flashcardService.generate(10, req, "user@test.com");

        assertEquals(3, response.getFlashcards().size());
        assertEquals(1, response.getFlashcards().get(0).getPosition());
        assertEquals(2, response.getFlashcards().get(1).getPosition());
        assertEquals(3, response.getFlashcards().get(2).getPosition());
        assertEquals("EASY", response.getFlashcards().get(0).getDifficulty());
    }

    @Test
    void getDetail_WhenSetBelongsToAnotherUser_ShouldThrow404NotLeakExistence() {
        when(flashcardSetRepository.findByFlashcardSetIdAndUser_UserId(99L, 1))
                .thenReturn(Optional.empty());

        QuotaExceededException ex = assertThrows(QuotaExceededException.class,
                () -> flashcardService.getDetail(99L, "user@test.com"));

        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
        assertEquals("FLASHCARD_SET_NOT_FOUND", ex.getCode());
    }

    @Test
    void list_ShouldOnlyQueryScopedToCurrentUser() {
        when(flashcardSetRepository.findByDocument_DocumentIdAndUser_UserIdOrderByCreatedAtDesc(10, 1))
                .thenReturn(List.of());

        flashcardService.list(10, "user@test.com");

        verify(flashcardSetRepository, times(1))
                .findByDocument_DocumentIdAndUser_UserIdOrderByCreatedAtDesc(10, 1);
    }
}