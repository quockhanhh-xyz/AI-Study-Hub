package com.demo.ai_study_hub;

import com.demo.ai_study_hub.config.AiProperties;
import com.demo.ai_study_hub.dto.*;
import com.demo.ai_study_hub.entity.*;
import com.demo.ai_study_hub.repository.*;
import com.demo.ai_study_hub.service.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AiChatServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private DocumentRepository documentRepository;
    @Mock private DocumentChunkRepository documentChunkRepository;
    @Mock private DocumentShareRepository documentShareRepository;
    @Mock private GroupDocumentShareRepository groupDocumentShareRepository;
    @Mock private StudyGroupMemberRepository studyGroupMemberRepository;
    @Mock private FolderShareService folderShareService;

    @Mock private AiChatSessionRepository aiChatSessionRepository;
    @Mock private AiChatMessageRepository aiChatMessageRepository;
    @Mock private AiUsageLogRepository aiUsageLogRepository;

    @Mock private AiProviderRouter aiProviderRouter;
    @Mock private AiModelSelector aiModelSelector;
    @Mock private SummaryIntentDetector summaryIntentDetector;
    @Mock private DocumentChunkRetrievalService chunkRetrievalService;
    @Mock private PromptBuilderService promptBuilderService;
    @Mock private AiProperties aiProperties;
    @Mock private TierPolicyService tierPolicyService;
    @Spy private ObjectMapper objectMapper = new ObjectMapper();

    @InjectMocks
    private AiChatServiceImpl aiChatService;

    private User mockUser;
    private Document mockDocument;

    @BeforeEach
    void setUp() {
        mockUser = new User();
        mockUser.setUserId(1);
        mockUser.setEmail("user@test.com");
        mockUser.setTier(com.demo.ai_study_hub.dto.UserTier.FREE);

        mockDocument = new Document();
        mockDocument.setDocumentId(1);
        mockDocument.setTitle("Test Doc");
        mockDocument.setStatus("ACTIVE");
        mockDocument.setOwner(mockUser);

        lenient().when(tierPolicyService.getEffectiveTier(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            return u.getTier();
        });
    }

    // =========================================================================
    // 1. Không có quyền document bị 403
    // =========================================================================
    @Test
    void ask_WithoutPermission_ShouldThrow403() {
        User otherUser = new User();
        otherUser.setUserId(2);
        otherUser.setEmail("other@test.com");

        Document otherDoc = new Document();
        otherDoc.setDocumentId(2);
        otherDoc.setStatus("ACTIVE");
        otherDoc.setOwner(otherUser);
        otherDoc.setVisibility("PRIVATE");

        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));
        when(documentRepository.findById(2)).thenReturn(Optional.of(otherDoc));
        when(documentShareRepository.findByDocumentAndSharedWithAndStatus(any(), any(), anyString()))
                .thenReturn(Optional.empty());

        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> {
            aiChatService.ask(2, "Test question", "user@test.com");
        });

        assertEquals(HttpStatus.FORBIDDEN, exception.getStatusCode());
        assertEquals("You do not have permission to access this document", exception.getReason());
    }

    // =========================================================================
    // 2. Document chưa COMPLETED bị chặn (409 Conflict)
    // =========================================================================
    @Test
    void ask_DocumentNotReady_ShouldThrow409() {
        DocumentContent content = new DocumentContent();
        content.setProcessingStatus(ProcessingStatus.PROCESSING);
        mockDocument.setDocumentContent(content);

        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));
        when(documentRepository.findById(1)).thenReturn(Optional.of(mockDocument));
        when(aiModelSelector.getMaxQuestionChars(anyString())).thenReturn(500);

        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> {
            aiChatService.ask(1, "Test question", "user@test.com");
        });

        assertEquals(HttpStatus.CONFLICT, exception.getStatusCode());
        assertEquals("Document is not ready yet", exception.getReason());
    }

    // =========================================================================
    // 3. Quota FREE 5 câu/ngày -> 429
    // =========================================================================
    @Test
    void ask_QuotaExceeded_ShouldThrow403() {
        DocumentContent content = new DocumentContent();
        content.setProcessingStatus(ProcessingStatus.COMPLETED);
        mockDocument.setDocumentContent(content);

        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));
        when(documentRepository.findById(1)).thenReturn(Optional.of(mockDocument));
        when(aiModelSelector.getMaxQuestionChars(anyString())).thenReturn(500);
        when(documentChunkRepository.countByDocument_DocumentId(anyInt())).thenReturn(5);
        when(aiProviderRouter.isConfigured()).thenReturn(true);
        when(aiModelSelector.getDailyQuestionLimit("FREE")).thenReturn(5);

        // Mock 5 successful questions today
        when(aiUsageLogRepository.countSuccessfulQuestionsAfter(anyInt(), any(LocalDateTime.class))).thenReturn(5L);

        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> {
            aiChatService.ask(1, "Test question", "user@test.com");
        });

        assertEquals(HttpStatus.FORBIDDEN, exception.getStatusCode());
        assertTrue(exception.getReason().contains("Daily AI Q&A question quota exceeded"));

        // Verify usage log was saved with countedAsQuestion = false and status QUOTA_EXCEEDED
        verify(aiUsageLogRepository, times(1)).save(argThat(log ->
                !log.getCountedAsQuestion() && "QUOTA_EXCEEDED".equals(log.getStatus())
        ));
    }

    // =========================================================================
    // 4. No-context fallback không trừ quota
    // =========================================================================
    @Test
    void ask_NoContext_ShouldReturnFallbackAndNotDeductQuota() {
        DocumentContent content = new DocumentContent();
        content.setProcessingStatus(ProcessingStatus.COMPLETED);
        mockDocument.setDocumentContent(content);

        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));
        when(documentRepository.findById(1)).thenReturn(Optional.of(mockDocument));
        when(aiModelSelector.getMaxQuestionChars(anyString())).thenReturn(500);
        when(documentChunkRepository.countByDocument_DocumentId(anyInt())).thenReturn(5);
        when(aiProviderRouter.isConfigured()).thenReturn(true);
        when(aiModelSelector.getDailyQuestionLimit("FREE")).thenReturn(5);
        when(aiUsageLogRepository.countSuccessfulQuestionsAfter(anyInt(), any(LocalDateTime.class))).thenReturn(0L);

        when(aiModelSelector.getMaxContextChunks("FREE")).thenReturn(3);
        when(summaryIntentDetector.isSummaryIntent(anyString())).thenReturn(false);
        when(chunkRetrievalService.retrieveByKeyword(anyInt(), anyString(), anyInt()))
                .thenReturn(Collections.emptyList()); // No context found!

        when(aiChatSessionRepository.findByUser_UserIdAndDocument_DocumentIdAndStatus(anyInt(), anyInt(), anyString()))
                .thenReturn(Optional.of(new AiChatSession()));

        AiAskResponse response = aiChatService.ask(1, "Specific query", "user@test.com");

        assertEquals("I could not find this information in the selected document.", response.getAnswer());
        assertEquals(0, response.getSourceChunks().size());
        assertEquals(5, response.getRemainingQuestions());

        // Verify usage log was saved with countedAsQuestion = false and status SKIPPED_NO_CONTEXT
        verify(aiUsageLogRepository, times(1)).save(argThat(log ->
                !log.getCountedAsQuestion() && "SKIPPED_NO_CONTEXT".equals(log.getStatus())
        ));
    }

    // =========================================================================
    // 5. Provider error không trừ quota
    // =========================================================================
    @Test
    void ask_ProviderError_ShouldNotDeductQuota() {
        DocumentContent content = new DocumentContent();
        content.setProcessingStatus(ProcessingStatus.COMPLETED);
        mockDocument.setDocumentContent(content);

        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));
        when(documentRepository.findById(1)).thenReturn(Optional.of(mockDocument));
        when(aiModelSelector.getMaxQuestionChars(anyString())).thenReturn(500);
        when(documentChunkRepository.countByDocument_DocumentId(anyInt())).thenReturn(5);
        when(aiProviderRouter.isConfigured()).thenReturn(true);
        when(aiModelSelector.getDailyQuestionLimit("FREE")).thenReturn(5);
        when(aiUsageLogRepository.countSuccessfulQuestionsAfter(anyInt(), any(LocalDateTime.class))).thenReturn(0L);

        when(aiModelSelector.getMaxContextChunks("FREE")).thenReturn(3);
        when(summaryIntentDetector.isSummaryIntent(anyString())).thenReturn(false);

        DocumentChunkDto chunk = DocumentChunkDto.builder().chunkIndex(0).chunkText("Some context").build();
        when(chunkRetrievalService.retrieveByKeyword(anyInt(), anyString(), anyInt()))
                .thenReturn(List.of(chunk));

        when(aiModelSelector.selectModel("FREE")).thenReturn("gemini-2.5-flash-lite");
        when(aiModelSelector.getMaxOutputTokens("FREE")).thenReturn(500);
        when(promptBuilderService.buildPrompt(anyString(), anyList(), anyBoolean())).thenReturn("Prompt");

        AiProviderService mockProvider = mock(AiProviderService.class);
        when(mockProvider.call(anyString(), anyString(), anyInt(), anyDouble()))
                .thenThrow(new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Gemini down"));
        when(aiProviderRouter.route()).thenReturn(mockProvider);

        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> {
            aiChatService.ask(1, "Test question", "user@test.com");
        });

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, exception.getStatusCode());
        assertEquals("Gemini down", exception.getReason());

        // Verify usage log was saved with countedAsQuestion = false and status FAILED
        verify(aiUsageLogRepository, times(1)).save(argThat(log ->
                !log.getCountedAsQuestion() && "FAILED".equals(log.getStatus())
        ));
    }

    // =========================================================================
    // 6. Get chat history và giải tuần tự sourceChunks
    // =========================================================================
    @Test
    void getChatHistory_Success_ShouldPopulateSourceChunks() {
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));
        when(documentRepository.findById(1)).thenReturn(Optional.of(mockDocument));

        AiChatSession mockSession = AiChatSession.builder()
                .sessionId(100L)
                .user(mockUser)
                .document(mockDocument)
                .status("ACTIVE")
                .build();
        when(aiChatSessionRepository.findByUser_UserIdAndDocument_DocumentIdAndStatus(1, 1, "ACTIVE"))
                .thenReturn(Optional.of(mockSession));

        AiChatMessage msg = AiChatMessage.builder()
                .messageId(200L)
                .session(mockSession)
                .role("ASSISTANT")
                .content("Answer here")
                .provider("gemini")
                .modelName("gemini-2.5-flash-lite")
                .tokenUsageEstimated(true)
                .sourceChunks("[{\"chunkIndex\":1,\"sourceLabel\":\"Page 2\"}]")
                .createdAt(LocalDateTime.now())
                .build();
        when(aiChatMessageRepository.findBySession_SessionIdOrderByCreatedAtAsc(100L))
                .thenReturn(List.of(msg));

        AiChatHistoryResponse response = aiChatService.getChatHistory(1, "user@test.com");

        assertNotNull(response);
        assertEquals(100L, response.getSessionId());
        assertEquals(1, response.getDocumentId());
        assertEquals(1, response.getMessages().size());

        AiChatMessageDto msgDto = response.getMessages().get(0);
        assertEquals(200L, msgDto.getMessageId());
        assertEquals("ASSISTANT", msgDto.getRole());
        assertEquals("Answer here", msgDto.getContent());
        assertEquals("gemini", msgDto.getProvider());
        assertEquals("gemini-2.5-flash-lite", msgDto.getModelName());
        assertTrue(msgDto.getTokenUsageEstimated());

        assertNotNull(msgDto.getSourceChunks());
        assertEquals(1, msgDto.getSourceChunks().size());
        assertEquals(1, msgDto.getSourceChunks().get(0).getChunkIndex());
        assertEquals("Page 2", msgDto.getSourceChunks().get(0).getSourceLabel());
    }
}
