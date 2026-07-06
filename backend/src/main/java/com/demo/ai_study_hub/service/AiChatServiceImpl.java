package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.config.AiProperties;
import com.demo.ai_study_hub.dto.*;
import com.demo.ai_study_hub.entity.*;
import com.demo.ai_study_hub.repository.*;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.TransactionDefinition;
import com.demo.ai_study_hub.exception.QuotaExceededException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Orchestrates the full AI Document Chat flow.
 *
 * See AiChatService interface for the detailed 17-step flow documentation.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AiChatServiceImpl implements AiChatService {

    private final UserRepository userRepository;
    private final DocumentRepository documentRepository;
    private final DocumentChunkRepository documentChunkRepository;
    private final DocumentShareRepository documentShareRepository;
    private final GroupDocumentShareRepository groupDocumentShareRepository;
    private final StudyGroupMemberRepository studyGroupMemberRepository;
    private final FolderShareService folderShareService;

    private final AiChatSessionRepository aiChatSessionRepository;
    private final AiChatMessageRepository aiChatMessageRepository;
    private final AiUsageLogRepository aiUsageLogRepository;
    private final AiUsageReservationRepository aiUsageReservationRepository;

    private final AiProviderRouter aiProviderRouter;
    private final AiModelSelector aiModelSelector;
    private final SummaryIntentDetector summaryIntentDetector;
    private final DocumentChunkRetrievalService chunkRetrievalService;
    private final PromptBuilderService promptBuilderService;
    private final AiProperties aiProperties;
    private final TierPolicyService tierPolicyService;

    private final ObjectMapper objectMapper;
    private final PlatformTransactionManager transactionManager;

    // -------------------------------------------------------------------------
    // ASK
    // -------------------------------------------------------------------------

    @Override
    public AiAskResponse ask(Integer documentId, String question, String userEmail) {
        String requestId = UUID.randomUUID().toString();
        TransactionTemplate txTemplate = new TransactionTemplate(transactionManager);
        txTemplate.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);

        // 1. Check constraints and reserve quota in an independent REQUIRES_NEW transaction
        AiReservationResult reserveResult = txTemplate.execute(status -> {
            User user = loadUser(userEmail);
            user = userRepository.findByIdForUpdate(user.getUserId()).orElse(user);

            Document doc = documentRepository.findById(documentId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));
            if ("DELETED".equals(doc.getStatus())) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found");
            }

            validateViewPermission(doc, user);

            String tier = tierPolicyService.getEffectiveTier(user).name();
            int maxChars = aiModelSelector.getMaxQuestionChars(tier);
            if (question == null || question.isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Question must not be blank");
            }
            if (question.length() > maxChars) {
                throw new QuotaExceededException(HttpStatus.BAD_REQUEST,
                        "Question text exceeds maximum tier length", "AI_QUESTION_CHARS_LIMIT_EXCEEDED");
            }

            validateProcessingStatus(doc);

            int chunkCount = documentChunkRepository.countByDocument_DocumentId(documentId);
            if (chunkCount == 0) {
                throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Document has no usable AI content");
            }

            AiChatSession session = findOrCreateSession(user, doc, question);
            long messageCount = aiChatMessageRepository.countBySession_SessionId(session.getSessionId());
            com.demo.ai_study_hub.dto.TierLimits limits = tierPolicyService.getLimitsForUser(user);
            if (messageCount >= limits.maxMessagesPerSession()) {
                throw new QuotaExceededException(HttpStatus.FORBIDDEN,
                        "Messages limit per session exceeded", "SESSION_MESSAGES_LIMIT_EXCEEDED");
            }

            if (!aiProviderRouter.isConfigured()) {
                saveUsageLog(user, doc, "ASK", null, null, 0, 0, 0, false, false, "AI_NOT_CONFIGURED");
                throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "AI service is not configured");
            }

            int dailyLimit = aiModelSelector.getDailyQuestionLimit(tier);
            long usedToday = countUsedToday(user);
            long activeReservations = aiUsageReservationRepository.countActiveReservations(user, LocalDateTime.now());
            if (usedToday + activeReservations >= dailyLimit) {
                saveUsageLog(user, doc, "ASK", null, null, 0, 0, 0, false, false, "QUOTA_EXCEEDED");
                throw new QuotaExceededException(HttpStatus.FORBIDDEN,
                        "Daily AI Q&A question quota exceeded", "AI_QUOTA_EXCEEDED");
            }

            AiUsageReservation reservation = AiUsageReservation.builder()
                    .requestId(requestId)
                    .user(user)
                    .requestType("QA")
                    .status("RESERVED")
                    .reservedAt(LocalDateTime.now())
                    .expiresAt(LocalDateTime.now().plusSeconds(60)) // Unified 60 seconds as requested
                    .build();
            reservation = aiUsageReservationRepository.save(reservation);

            return new AiReservationResult(user, doc, session, reservation, tier, dailyLimit, usedToday);
        });

        // 2. Perform intent detection and chunk retrieval outside transaction
        int maxChunks = aiModelSelector.getMaxContextChunks(reserveResult.tier);
        boolean isSummary = summaryIntentDetector.isSummaryIntent(question);
        List<DocumentChunkDto> chunks;
        if (isSummary) {
            chunks = chunkRetrievalService.retrieveFirstChunks(documentId, maxChunks);
        } else {
            chunks = chunkRetrievalService.retrieveByKeyword(documentId, question, maxChunks);
        }

        // 3. Handle no-context fallback outside provider invocation
        if (!isSummary && chunks.isEmpty()) {
            txTemplate.executeWithoutResult(status -> {
                AiUsageReservation res = aiUsageReservationRepository.findByRequestId(requestId).orElseThrow();
                res.setStatus("RELEASED");
                res.setReleasedAt(LocalDateTime.now());
                aiUsageReservationRepository.save(res);

                saveMessage(reserveResult.session, "USER", question, null, null, null, null, null, null, null);
                saveMessage(reserveResult.session, "ASSISTANT", "I could not find this information in the selected document.", null, null, null, null, null, null, "[]");

                saveUsageLog(reserveResult.user, reserveResult.doc, "ASK", null, null, 0, 0, 0,
                        false, false, "SKIPPED_NO_CONTEXT");
            });

            long remaining = reserveResult.dailyLimit - reserveResult.usedToday;
            return AiAskResponse.builder()
                    .answer("I could not find this information in the selected document.")
                    .sourceChunks(Collections.emptyList())
                    .provider(null)
                    .modelName(null)
                    .inputTokens(0)
                    .outputTokens(0)
                    .totalTokens(0)
                    .tokenUsageEstimated(false)
                    .remainingQuestions((int) remaining)
                    .build();
        }

        // 4. Call AI provider outside transaction to prevent DB lock starvation
        String modelName = aiModelSelector.selectModel(reserveResult.tier);
        int maxOutputTokens = aiModelSelector.getMaxOutputTokens(reserveResult.tier);
        String prompt = promptBuilderService.buildPrompt(question, chunks, isSummary);

        AiAnswer aiAnswer;
        try {
            aiAnswer = callProvider(prompt, modelName, maxOutputTokens, reserveResult.user, reserveResult.doc);

            // Confirm reservation in an independent REQUIRES_NEW transaction
            txTemplate.executeWithoutResult(status -> {
                AiUsageReservation res = aiUsageReservationRepository.findByRequestId(requestId).orElseThrow();
                res.setStatus("CONFIRMED");
                res.setConfirmedAt(LocalDateTime.now());
                aiUsageReservationRepository.save(res);

                saveMessage(reserveResult.session, "USER", question, null, null, null, null, null, null, null);

                String sourceChunksJson = buildSourceChunksJson(chunks);
                saveMessage(reserveResult.session, "ASSISTANT", aiAnswer.getText(),
                        aiAnswer.getProvider(), aiAnswer.getModelName(),
                        aiAnswer.getInputTokens(), aiAnswer.getOutputTokens(), aiAnswer.getTotalTokens(),
                        aiAnswer.isTokenUsageEstimated(), sourceChunksJson);

                saveUsageLog(reserveResult.user, reserveResult.doc, "ASK",
                        aiAnswer.getProvider(), aiAnswer.getModelName(),
                        aiAnswer.getInputTokens(), aiAnswer.getOutputTokens(), aiAnswer.getTotalTokens(),
                        aiAnswer.isTokenUsageEstimated(), true, "SUCCESS");
            });
        } catch (Exception e) {
            // Release reservation in a separate transaction block on failure
            txTemplate.executeWithoutResult(status -> {
                AiUsageReservation res = aiUsageReservationRepository.findByRequestId(requestId).orElseThrow();
                res.setStatus("RELEASED");
                res.setReleasedAt(LocalDateTime.now());
                aiUsageReservationRepository.save(res);
            });
            throw e;
        }

        long remaining = reserveResult.dailyLimit - reserveResult.usedToday - 1;
        List<AiSourceChunk> sourceChunks = chunks.stream()
                .map(c -> AiSourceChunk.builder()
                        .chunkIndex(c.getChunkIndex())
                        .sourceLabel(c.getSourceLabel())
                        .build())
                .collect(Collectors.toList());

        return AiAskResponse.builder()
                .answer(aiAnswer.getText())
                .sourceChunks(sourceChunks)
                .provider(aiAnswer.getProvider())
                .modelName(aiAnswer.getModelName())
                .inputTokens(aiAnswer.getInputTokens())
                .outputTokens(aiAnswer.getOutputTokens())
                .totalTokens(aiAnswer.getTotalTokens())
                .tokenUsageEstimated(aiAnswer.isTokenUsageEstimated())
                .remainingQuestions((int) Math.max(0, remaining))
                .build();
    }

    // -------------------------------------------------------------------------
    // GET CHAT HISTORY
    // -------------------------------------------------------------------------

    @Override
    @Transactional(readOnly = true)
    public AiChatHistoryResponse getChatHistory(Integer documentId, String userEmail) {
        User user = loadUser(userEmail);
        Document doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Document not found"));
        if ("DELETED".equals(doc.getStatus())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found");
        }
        validateViewPermission(doc, user);

        Optional<AiChatSession> sessionOpt = aiChatSessionRepository
                .findByUser_UserIdAndDocument_DocumentIdAndStatus(
                        user.getUserId(), documentId, "ACTIVE");

        if (sessionOpt.isEmpty()) {
            return AiChatHistoryResponse.builder()
                    .sessionId(null)
                    .documentId(documentId)
                    .messages(Collections.emptyList())
                    .build();
        }

        AiChatSession session = sessionOpt.get();
        List<AiChatMessageDto> messages = aiChatMessageRepository
                .findBySession_SessionIdOrderByCreatedAtAsc(session.getSessionId())
                .stream()
                .map(this::toMessageDto)
                .collect(Collectors.toList());

        return AiChatHistoryResponse.builder()
                .sessionId(session.getSessionId())
                .documentId(documentId)
                .messages(messages)
                .build();
    }

    // -------------------------------------------------------------------------
    // DELETE CHAT
    // -------------------------------------------------------------------------

    @Override
    @Transactional
    public void deleteChat(Long sessionId, String userEmail) {
        User user = loadUser(userEmail);
        AiChatSession session = aiChatSessionRepository.findBySessionIdAndUser_UserId(
                        sessionId, user.getUserId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Chat session not found or does not belong to you"));
        if ("DELETED".equals(session.getStatus())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND,
                    "Chat session not found or does not belong to you");
        }
        session.setStatus("DELETED");
        session.setDeletedAt(LocalDateTime.now());
        aiChatSessionRepository.save(session);
    }

    // -------------------------------------------------------------------------
    // USAGE SUMMARY
    // -------------------------------------------------------------------------

    @Override
    @Transactional(readOnly = true)
    public AiUsageSummaryResponse getUsageSummary(String userEmail) {
        User user = loadUser(userEmail);
        String tier = tierPolicyService.getEffectiveTier(user).name();
        int dailyLimit = aiModelSelector.getDailyQuestionLimit(tier);
        long usedToday = countUsedToday(user);
        int remaining = (int) Math.max(0, dailyLimit - usedToday);

        String modelName = aiModelSelector.selectModel(tier);
        String provider = aiProperties.getProvider();

        return AiUsageSummaryResponse.builder()
                .tier(tier)
                .dailyLimit(dailyLimit)
                .usedToday((int) usedToday)
                .remainingQuestions(remaining)
                .provider(provider)
                .modelName(modelName)
                .build();
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private User loadUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                        "User not found"));
    }

    private void validateViewPermission(Document doc, User user) {
        boolean isOwner = doc.getOwner().getUserId().equals(user.getUserId());
        if (isOwner) return;

        boolean isDirectShared = documentShareRepository
                .findByDocumentAndSharedWithAndStatus(doc, user, "ACTIVE")
                .isPresent();
        if (isDirectShared) return;

        List<GroupDocumentShare> activeGroupShares =
                groupDocumentShareRepository.findByDocumentAndStatus(doc, "ACTIVE");
        for (GroupDocumentShare gs : activeGroupShares) {
            if ("ACTIVE".equals(gs.getGroup().getStatus()) &&
                    studyGroupMemberRepository.existsByGroupAndUserAndStatus(gs.getGroup(), user, "ACTIVE")) {
                return;
            }
        }

        if (doc.getFolder() != null && folderShareService != null &&
                folderShareService.hasAccessToFolder(doc.getFolder().getFolderId(), user.getEmail())) {
            return;
        }

        if ("PUBLIC".equals(doc.getVisibility()) && "APPROVED".equals(doc.getApprovalStatus())) {
            return;
        }

        throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                "You do not have permission to access this document");
    }

    private void validateProcessingStatus(Document doc) {
        // Check DocumentContent processingStatus
        if (doc.getDocumentContent() == null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Document is not ready yet");
        }
        String status = doc.getDocumentContent().getProcessingStatus().name();
        switch (status) {
            case "PENDING", "PROCESSING" -> throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Document is not ready yet");
            case "FAILED", "UNSUPPORTED", "EMPTY_CONTENT" -> throw new ResponseStatusException(
                    HttpStatus.UNPROCESSABLE_ENTITY, "Document has no usable AI content");
            case "COMPLETED" -> { /* OK */ }
            default -> throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Document is not ready yet");
        }
    }

    private long countUsedToday(User user) {
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        return aiUsageLogRepository.countSuccessfulQuestionsAfter(user.getUserId(), startOfDay);
    }

    private AiChatSession findOrCreateSession(User user, Document doc) {
        return findOrCreateSession(user, doc, null);
    }

    private AiChatSession findOrCreateSession(User user, Document doc, String firstQuestion) {
        return aiChatSessionRepository
                .findByUser_UserIdAndDocument_DocumentIdAndStatus(
                        user.getUserId(), doc.getDocumentId(), "ACTIVE")
                .orElseGet(() -> {
                    com.demo.ai_study_hub.dto.TierLimits limits = tierPolicyService.getLimitsForUser(user);
                    long activeSessions = aiChatSessionRepository.countByUser_UserIdAndDocument_DocumentIdAndStatus(
                            user.getUserId(), doc.getDocumentId(), "ACTIVE");
                    if (activeSessions >= limits.maxAiSessionsPerDocument()) {
                        throw new QuotaExceededException(HttpStatus.FORBIDDEN,
                                "AI sessions limit per document exceeded", "AI_SESSIONS_LIMIT_EXCEEDED");
                    }
                    String title = firstQuestion != null
                            ? (firstQuestion.length() > 100
                                    ? firstQuestion.substring(0, 100) + "..."
                                    : firstQuestion)
                            : null;
                    AiChatSession session = AiChatSession.builder()
                            .user(user)
                            .document(doc)
                            .title(title)
                            .status("ACTIVE")
                            .build();
                    return aiChatSessionRepository.save(session);
                });
    }

    private void saveMessage(AiChatSession session, String role, String content,
                              String provider, String modelName,
                              Integer inputTokens, Integer outputTokens, Integer totalTokens,
                              Boolean tokenUsageEstimated, String sourceChunksJson) {
        AiChatMessage message = AiChatMessage.builder()
                .session(session)
                .role(role)
                .content(content)
                .provider(provider)
                .modelName(modelName)
                .inputTokens(inputTokens)
                .outputTokens(outputTokens)
                .totalTokens(totalTokens)
                .tokenUsageEstimated(tokenUsageEstimated != null ? tokenUsageEstimated : false)
                .sourceChunks(sourceChunksJson)
                .build();
        aiChatMessageRepository.save(message);
    }

    private void saveUsageLog(User user, Document doc, String requestType,
                               String provider, String modelName,
                               int inputTokens, int outputTokens, int totalTokens,
                               boolean tokenUsageEstimated, boolean countedAsQuestion,
                               String status) {
        AiUsageLog log = AiUsageLog.builder()
                .user(user)
                .document(doc)
                .requestType(requestType)
                .provider(provider)
                .modelName(modelName)
                .inputTokens(inputTokens)
                .outputTokens(outputTokens)
                .totalTokens(totalTokens)
                .tokenUsageEstimated(tokenUsageEstimated)
                .countedAsQuestion(countedAsQuestion)
                .status(status)
                .build();
        aiUsageLogRepository.save(log);
    }

    private AiAnswer callProvider(String prompt, String modelName, int maxOutputTokens,
                                   User user, Document doc) {
        try {
            return aiProviderRouter.route().call(prompt, modelName, maxOutputTokens,
                    aiProperties.getTemperature());
        } catch (ResponseStatusException e) {
            saveUsageLog(user, doc, "ASK", null, null, 0, 0, 0,
                    false, false, "FAILED");
            throw e;
        }
    }

    private String buildSourceChunksJson(List<DocumentChunkDto> chunks) {
        List<Map<String, Object>> sourceRefs = chunks.stream()
                .map(c -> {
                    Map<String, Object> ref = new LinkedHashMap<>();
                    ref.put("chunkIndex", c.getChunkIndex());
                    ref.put("sourceLabel", c.getSourceLabel());
                    return ref;
                })
                .collect(Collectors.toList());
        try {
            return objectMapper.writeValueAsString(sourceRefs);
        } catch (JsonProcessingException e) {
            return "[]";
        }
    }

    private AiChatMessageDto toMessageDto(AiChatMessage msg) {
        List<AiSourceChunk> sourceChunks = null;
        if (msg.getSourceChunks() != null && !msg.getSourceChunks().isBlank()) {
            try {
                sourceChunks = objectMapper.readValue(
                        msg.getSourceChunks(),
                        objectMapper.getTypeFactory().constructCollectionType(List.class, AiSourceChunk.class)
                );
            } catch (Exception e) {
                // Silent fallback for invalid JSON strings
            }
        }

        return AiChatMessageDto.builder()
                .messageId(msg.getMessageId())
                .role(msg.getRole())
                .content(msg.getContent())
                .provider(msg.getProvider())
                .modelName(msg.getModelName())
                .tokenUsageEstimated(msg.getTokenUsageEstimated())
                .sourceChunks(sourceChunks)
                .createdAt(msg.getCreatedAt())
                .build();
    }

    private static class AiReservationResult {
        final User user;
        final Document doc;
        final AiChatSession session;
        final AiUsageReservation reservation;
        final String tier;
        final int dailyLimit;
        final long usedToday;

        AiReservationResult(User user, Document doc, AiChatSession session,
                            AiUsageReservation reservation, String tier,
                            int dailyLimit, long usedToday) {
            this.user = user;
            this.doc = doc;
            this.session = session;
            this.reservation = reservation;
            this.tier = tier;
            this.dailyLimit = dailyLimit;
            this.usedToday = usedToday;
        }
    }
}
