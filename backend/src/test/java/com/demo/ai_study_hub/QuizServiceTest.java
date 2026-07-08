package com.demo.ai_study_hub;

import com.demo.ai_study_hub.dto.AiAnswer;
import com.demo.ai_study_hub.dto.QuizDtos.*;
import com.demo.ai_study_hub.entity.*;
import com.demo.ai_study_hub.enums.UserTier;
import com.demo.ai_study_hub.exception.QuotaExceededException;
import com.demo.ai_study_hub.service.*;
import com.demo.ai_study_hub.repository.DocumentChunkRepository;
import com.demo.ai_study_hub.repository.QuizSetRepository;
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
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class QuizServiceTest {

    @Mock private QuizSetRepository quizSetRepository;
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

    private QuizService quizService;

    private User user;
    private Document document;
    private DocumentContent content;
    private AiLearningQuotaPolicy.CountRange freeRange;

    private static final String VALID_JSON = """
            {
              "questions": [
                {
                  "questionText": "What is the capital idea of section 1?",
                  "options": [
                    {"key": "A", "text": "Option A"},
                    {"key": "B", "text": "Option B"},
                    {"key": "C", "text": "Option C"},
                    {"key": "D", "text": "Option D"}
                  ],
                  "correctOption": "B",
                  "explanation": "Section 1 explicitly states this.",
                  "difficulty": "MEDIUM"
                },
                {
                  "questionText": "Which term is defined in section 2?",
                  "options": [
                    {"key": "A", "text": "Term X"},
                    {"key": "B", "text": "Term Y"},
                    {"key": "C", "text": "Term Z"},
                    {"key": "D", "text": "Term W"}
                  ],
                  "correctOption": "A",
                  "explanation": "Defined in the second paragraph.",
                  "difficulty": "EASY"
                },
                {
                  "questionText": "What conclusion does the document draw?",
                  "options": [
                    {"key": "A", "text": "Conclusion A"},
                    {"key": "B", "text": "Conclusion B"},
                    {"key": "C", "text": "Conclusion C"},
                    {"key": "D", "text": "Conclusion D"}
                  ],
                  "correctOption": "C",
                  "explanation": "Stated in the final section.",
                  "difficulty": "HARD"
                }
              ]
            }
            """;

    @BeforeEach
    void setUp() {
        ObjectMapper objectMapper = new ObjectMapper();

        quizService = new QuizService(
                quizSetRepository, documentChunkRepository, userRepository,
                accessGuard, quotaPolicy, promptBuilder, validator,
                tierPolicyService, aiProviderRouter, aiModelSelector, objectMapper);

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

        freeRange = new AiLearningQuotaPolicy.CountRange(3, 5, 5);

        lenient().when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(user));
        lenient().when(accessGuard.requireReadyDocument(10, user))
                .thenReturn(new AiLearningAccessGuard.ReadyDocument(document, content));
        lenient().when(tierPolicyService.getEffectiveTier(user)).thenReturn(UserTier.FREE);
        lenient().when(quotaPolicy.quizQuestionCountRange(UserTier.FREE)).thenReturn(freeRange);
        lenient().when(quotaPolicy.quizSetDailyLimit(UserTier.FREE)).thenReturn(2);
        lenient().when(aiProviderRouter.isConfigured()).thenReturn(true);
        lenient().when(aiProviderRouter.route()).thenReturn(aiProviderService);
        lenient().when(aiModelSelector.selectModel("FREE")).thenReturn("gemini-2.5-flash-lite");
        lenient().when(aiModelSelector.getMaxOutputTokens("FREE")).thenReturn(500);
        lenient().when(promptBuilder.buildQuizPrompt(any(), anyInt(), anyString())).thenReturn("PROMPT");
        lenient().when(documentChunkRepository.findByDocument_DocumentIdOrderByChunkIndexAsc(10))
                .thenReturn(List.of());
        lenient().when(quizSetRepository.save(any())).thenAnswer(inv -> {
            QuizSet s = inv.getArgument(0);
            s.setQuizSetId(1L);
            return s;
        });
    }

    @Test
    void generate_WhenValidRequest_ShouldSaveQuizWith4OptionsPerQuestion() {
        when(quizSetRepository.countByUserAndCreatedAtBetween(eq(1), any(), any())).thenReturn(0L);
        when(aiProviderService.call(any(), any(), anyInt(), any(Double.class)))
                .thenReturn(AiAnswer.builder().text(VALID_JSON).build());
        doNothing().when(validator).validateQuiz(any(), eq(3));

        GenerateQuizRequest req = new GenerateQuizRequest();
        req.setQuestionCount(3);
        req.setDifficulty("MIXED");

        QuizSetResponse response = quizService.generate(10, req, "user@test.com");

        assertNotNull(response);
        assertEquals(3, response.getQuestionCount());
        assertEquals(3, response.getQuestions().size());
        assertEquals(4, response.getQuestions().get(0).getOptions().size());
        assertEquals("B", response.getQuestions().get(0).getCorrectOption());
        verify(quizSetRepository, times(1)).save(any());
    }

    @Test
    void generate_WhenQuestionCountBelowMin_ShouldThrow400() {
        GenerateQuizRequest req = new GenerateQuizRequest();
        req.setQuestionCount(2); // below min=3, matches TC-LEARN-17

        QuotaExceededException ex = assertThrows(QuotaExceededException.class,
                () -> quizService.generate(10, req, "user@test.com"));

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        assertEquals("INVALID_QUIZ_QUESTION_COUNT", ex.getCode());
        verify(aiProviderRouter, never()).route();
    }

    @Test
    void generate_WhenFreeUserExceedsMaxQuestionCount_ShouldThrow400() {
        GenerateQuizRequest req = new GenerateQuizRequest();
        req.setQuestionCount(6); // FREE max is 5

        QuotaExceededException ex = assertThrows(QuotaExceededException.class,
                () -> quizService.generate(10, req, "user@test.com"));

        assertEquals("INVALID_QUIZ_QUESTION_COUNT", ex.getCode());
    }

    @Test
    void generate_WhenInvalidDifficultyValue_ShouldThrow400() {
        GenerateQuizRequest req = new GenerateQuizRequest();
        req.setQuestionCount(3);
        req.setDifficulty("IMPOSSIBLE");

        QuotaExceededException ex = assertThrows(QuotaExceededException.class,
                () -> quizService.generate(10, req, "user@test.com"));

        assertEquals("INVALID_QUIZ_DIFFICULTY", ex.getCode());
        verify(aiProviderRouter, never()).route();
    }

    @Test
    void generate_WhenDifficultyOmitted_ShouldDefaultToMixed() {
        when(quizSetRepository.countByUserAndCreatedAtBetween(eq(1), any(), any())).thenReturn(0L);
        when(aiProviderService.call(any(), any(), anyInt(), any(Double.class)))
                .thenReturn(AiAnswer.builder().text(VALID_JSON).build());
        doNothing().when(validator).validateQuiz(any(), eq(3));

        GenerateQuizRequest req = new GenerateQuizRequest();
        req.setQuestionCount(3);
        // difficulty left null

        quizService.generate(10, req, "user@test.com");

        verify(promptBuilder).buildQuizPrompt(any(), eq(3), eq("MIXED"));
    }

    @Test
    void generate_WhenDailyQuotaExceeded_ShouldThrow403() {
        when(quizSetRepository.countByUserAndCreatedAtBetween(eq(1), any(), any())).thenReturn(2L);
        GenerateQuizRequest req = new GenerateQuizRequest();
        req.setQuestionCount(3);

        QuotaExceededException ex = assertThrows(QuotaExceededException.class,
                () -> quizService.generate(10, req, "user@test.com"));

        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
        assertEquals("QUIZ_QUOTA_EXCEEDED", ex.getCode());
        verify(aiProviderRouter, never()).route();
    }

    @Test
    void generate_WhenAiOutputMalformedTwice_ShouldThrow502AndNotSave() {
        when(quizSetRepository.countByUserAndCreatedAtBetween(eq(1), any(), any())).thenReturn(0L);
        when(aiProviderService.call(any(), any(), anyInt(), any(Double.class)))
                .thenReturn(AiAnswer.builder().text("not json at all").build());

        GenerateQuizRequest req = new GenerateQuizRequest();
        req.setQuestionCount(3);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> quizService.generate(10, req, "user@test.com"));

        assertEquals(HttpStatus.BAD_GATEWAY, ex.getStatusCode());
        verify(aiProviderService, times(2)).call(any(), any(), anyInt(), any(Double.class));
        verify(quizSetRepository, never()).save(any());
    }

    @Test
    void getDetail_WhenNotOwnedByCurrentUser_ShouldThrow404NotLeakExistence() {
        when(quizSetRepository.findByQuizSetIdAndUser_UserId(77L, 1)).thenReturn(Optional.empty());

        QuotaExceededException ex = assertThrows(QuotaExceededException.class,
                () -> quizService.getDetail(77L, "user@test.com"));

        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
        assertEquals("QUIZ_SET_NOT_FOUND", ex.getCode());
    }

    @Test
    void list_ShouldOnlyQueryScopedToCurrentUser() {
        when(quizSetRepository.findByDocument_DocumentIdAndUser_UserIdOrderByCreatedAtDesc(10, 1))
                .thenReturn(List.of());

        quizService.list(10, "user@test.com");

        verify(quizSetRepository, times(1))
                .findByDocument_DocumentIdAndUser_UserIdOrderByCreatedAtDesc(10, 1);
    }
}