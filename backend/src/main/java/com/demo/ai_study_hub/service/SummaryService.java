package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.dto.SummaryDtos.*;
import com.demo.ai_study_hub.entity.*;
import com.demo.ai_study_hub.enums.UserTier;
import com.demo.ai_study_hub.exception.QuotaExceededException;
import com.demo.ai_study_hub.exception.AiProviderException;
import com.demo.ai_study_hub.repository.AiSummaryRepository;
import com.demo.ai_study_hub.repository.DocumentChunkRepository;
import com.demo.ai_study_hub.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.stream.Collectors;
import java.util.UUID;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.TransactionDefinition;
import com.demo.ai_study_hub.repository.AiUsageLogRepository;
import com.demo.ai_study_hub.repository.AiUsageReservationRepository;

@Service
@RequiredArgsConstructor
@Slf4j
public class SummaryService {

    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final AiSummaryRepository aiSummaryRepository;
    private final DocumentChunkRepository documentChunkRepository;
    private final UserRepository userRepository;
    private final AiLearningAccessGuard accessGuard;
    private final AiLearningQuotaPolicy quotaPolicy;
    private final AiLearningPromptBuilder promptBuilder;
    private final AiLearningOutputValidator validator;
    private final TierPolicyService tierPolicyService;
    private final AiProviderRouter aiProviderRouter;
    private final AiModelSelector aiModelSelector;
    private final ObjectMapper objectMapper;
    private final AiUsageLogRepository aiUsageLogRepository;
    private final AiUsageReservationRepository aiUsageReservationRepository;
    private final PlatformTransactionManager transactionManager;
    private final LearningContextBuilder learningContextBuilder;

    private static class AiReservationResult {
        final User user;
        final Document doc;
        final DocumentContent content;
        final UserTier tier;

        AiReservationResult(User user, Document doc, DocumentContent content, UserTier tier) {
            this.user = user;
            this.doc = doc;
            this.content = content;
            this.tier = tier;
        }
    }

    public SummaryResponse generate(Integer documentId, String userEmail) {
        String requestId = UUID.randomUUID().toString();
        TransactionTemplate txTemplate = new TransactionTemplate(transactionManager);
        txTemplate.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);

        // 1. Lock user, check quota and create reservation in REQUIRES_NEW transaction
        AiReservationResult reserveResult = txTemplate.execute(status -> {
            User user = loadUser(userEmail);
            user = userRepository.findByIdForUpdate(user.getUserId()).orElse(user);

            AiLearningAccessGuard.ReadyDocument ready = accessGuard.requireReadyDocument(documentId, user);
            Document doc = ready.document();
            DocumentContent content = ready.content();
            UserTier tier = tierPolicyService.getEffectiveTier(user);

            checkDailyQuota(user, tier);

            if (!aiProviderRouter.isConfigured()) {
                saveUsageLog(user, doc, "SUMMARY", null, null, 0, 0, 0, false, false, "AI_NOT_CONFIGURED");
                throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "AI service is not configured");
            }

            AiUsageReservation reservation = AiUsageReservation.builder()
                    .requestId(requestId)
                    .user(user)
                    .requestType("SUMMARY")
                    .status("RESERVED")
                    .reservedAt(LocalDateTime.now())
                    .expiresAt(LocalDateTime.now().plusSeconds(60))
                    .build();
            aiUsageReservationRepository.save(reservation);

            return new AiReservationResult(user, doc, content, tier);
        });

        // 2. Call AI provider outside transaction to prevent holding database locks too long
        String model = aiModelSelector.selectModel(reserveResult.tier.name());
        int maxTokens = aiModelSelector.getMaxLearningOutputTokens(reserveResult.tier.name());

        AiSummaryOutput output;
        try {
            output = callAndValidateWithRetry(documentId, reserveResult.tier.name(), reserveResult.content.getExtractedText(), model, maxTokens);

            // 3. Confirm reservation, save result, and log success in REQUIRES_NEW transaction
            return txTemplate.execute(status -> {
                AiUsageReservation res = aiUsageReservationRepository.findByRequestId(requestId).orElseThrow();
                res.setStatus("CONFIRMED");
                res.setConfirmedAt(LocalDateTime.now());
                aiUsageReservationRepository.save(res);

                long chunkCount = documentChunkRepository.findByDocument_DocumentIdOrderByChunkIndexAsc(documentId).size();
                AiSummary entity = persist(reserveResult.doc, reserveResult.user, output, model, reserveResult.content, chunkCount);

                saveUsageLog(reserveResult.user, reserveResult.doc, "SUMMARY",
                        aiProviderRouter.route().getProviderName(), model,
                        0, 0, 0, false, true, "SUCCESS");

                return toResponse(entity);
            });
        } catch (Exception e) {
            // 4. Release reservation and log error on failure in a separate transaction block
            txTemplate.executeWithoutResult(status -> {
                AiUsageReservation res = aiUsageReservationRepository.findByRequestId(requestId).orElseThrow();
                res.setStatus("RELEASED");
                res.setReleasedAt(LocalDateTime.now());
                aiUsageReservationRepository.save(res);

                String errorCode = (e instanceof QuotaExceededException) ? ((QuotaExceededException) e).getCode() : "FAILED";
                saveUsageLog(reserveResult.user, reserveResult.doc, "SUMMARY",
                        null, null, 0, 0, 0, false, false, errorCode);
            });
            throw e;
        }
    }

    /**
     * Calls the AI provider, parses + validates the JSON output. On
     * malformed JSON or schema/count violation, retries EXACTLY ONCE
     * (TC-LEARN-23). If the retry also fails, aborts with 502 and NOTHING
     * is saved (TC-LEARN-24) — no partial/invalid data ever hits the DB.
     */
    private AiSummaryOutput callAndValidateWithRetry(Integer documentId, String tier, String extractedText, String model, int maxTokens) {
        boolean lastFailureWasProviderCall = false;
        for (int attempt = 1; attempt <= 2; attempt++) {
            String context = learningContextBuilder.buildLimitedContext(documentId, tier, attempt);
            if (context == null) {
                context = extractedText;
            }
            String prompt = promptBuilder.buildSummaryPrompt(context);
            String rawText;
            try {
                rawText = aiProviderRouter.route().call(prompt, model, maxTokens, 0.3, true).getText();
            } catch (AiProviderException e) {
                throw e;
            } catch (Exception e) {
                lastFailureWasProviderCall = true;
                if (attempt == 2) {
                    throw e;
                }
                continue;
            }
            try {
                AiSummaryOutput output = parseJson(rawText, AiSummaryOutput.class);
                validator.validateSummary(output);
                return output;
            } catch (Exception e) {
                log.warn("Invalid summary AI output on attempt {}: {}", attempt, e.getMessage());
                lastFailureWasProviderCall = false;
                if (attempt == 2) {
                    throw new QuotaExceededException(HttpStatus.BAD_GATEWAY,
                            "AI provider returned invalid output after retry", "AI_OUTPUT_INVALID");
                }
                // fall through to retry
            }
        }
        throw new QuotaExceededException(HttpStatus.BAD_GATEWAY,
                lastFailureWasProviderCall ? "AI provider call failed" : "AI output invalid",
                lastFailureWasProviderCall ? "AI_PROVIDER_ERROR" : "AI_OUTPUT_INVALID");
    }

    private <T> T parseJson(String rawText, Class<T> type) throws Exception {
        String cleaned = extractJson(rawText);
        try {
            return objectMapper.readValue(cleaned, type);
        } catch (Exception e) {
            String snippet = rawText != null ? (rawText.length() > 200 ? rawText.substring(0, 200) + "..." : rawText) : "null";
            log.warn("Failed to parse JSON. Raw snippet: {}. Error: {}", snippet, e.getMessage());
            throw e;
        }
    }

    private String extractJson(String text) {
        if (text == null) return "";
        String trimmed = text.trim();
        if (trimmed.startsWith("```")) {
            trimmed = trimmed.replaceFirst("^```[a-zA-Z]*\\s*", "");
            if (trimmed.endsWith("```")) {
                trimmed = trimmed.substring(0, trimmed.length() - 3);
            }
            trimmed = trimmed.trim();
        }

        int firstObj = trimmed.indexOf('{');
        int firstArr = trimmed.indexOf('[');
        int start = -1;
        char endChar = ' ';
        if (firstObj >= 0 && firstArr >= 0) {
            if (firstObj < firstArr) {
                start = firstObj;
                endChar = '}';
            } else {
                start = firstArr;
                endChar = ']';
            }
        } else if (firstObj >= 0) {
            start = firstObj;
            endChar = '}';
        } else if (firstArr >= 0) {
            start = firstArr;
            endChar = ']';
        }

        if (start >= 0) {
            int end = trimmed.lastIndexOf(endChar);
            if (end > start) {
                return trimmed.substring(start, end + 1);
            }
        }
        return trimmed;
    }

    private void checkDailyQuota(User user, UserTier tier) {
        int limit = quotaPolicy.summaryDailyLimit(tier);
        LocalDateTime[] window = todayWindowUtc();
        long usedToday = aiUsageLogRepository.countSuccessfulLogsByTypeAfter(
                user.getUserId(), "SUMMARY", window[0]);
        long activeReservations = aiUsageReservationRepository.countActiveReservationsByType(
                user, "SUMMARY", LocalDateTime.now());
        if (usedToday + activeReservations >= limit) {
            throw new QuotaExceededException(HttpStatus.FORBIDDEN,
                    "Summary generations daily quota exceeded", "SUMMARY_QUOTA_EXCEEDED");
        }
    }

    private void saveUsageLog(User user, Document doc, String requestType, String provider, String model,
                              int inputTokens, int outputTokens, int totalTokens,
                              boolean estimated, boolean counted, String status) {
        try {
            AiUsageLog log = AiUsageLog.builder()
                    .user(user)
                    .document(doc)
                    .requestType(requestType)
                    .provider(provider)
                    .modelName(model)
                    .inputTokens(inputTokens)
                    .outputTokens(outputTokens)
                    .totalTokens(totalTokens)
                    .tokenUsageEstimated(estimated)
                    .countedAsQuestion(counted)
                    .status(status)
                    .build();
            aiUsageLogRepository.save(log);
        } catch (Exception e) {
            // Log warning but don't fail generation
        }
    }

    /** Daily quota resets on Asia/Ho_Chi_Minh calendar day, converted to the UTC window stored in DB timestamps. */
    private LocalDateTime[] todayWindowUtc() {
        LocalDate todayVn = LocalDate.now(VN_ZONE);
        LocalDateTime startUtc = todayVn.atStartOfDay(VN_ZONE).withZoneSameInstant(java.time.ZoneOffset.UTC).toLocalDateTime();
        LocalDateTime endUtc = todayVn.plusDays(1).atStartOfDay(VN_ZONE).withZoneSameInstant(java.time.ZoneOffset.UTC).toLocalDateTime();
        return new LocalDateTime[]{startUtc, endUtc};
    }

    private AiSummary persist(Document doc, User user, AiSummaryOutput output, String model,
                              DocumentContent content, long chunkCount) {
        try {
            LocalDateTime now = LocalDateTime.now(java.time.ZoneOffset.UTC);
            AiSummary entity = AiSummary.builder()
                    .document(doc)
                    .user(user)
                    .overview(output.getOverview())
                    .keyPointsJson(objectMapper.writeValueAsString(output.getKeyPoints()))
                    .importantTermsJson(objectMapper.writeValueAsString(output.getImportantTerms()))
                    .reviewQuestionsJson(objectMapper.writeValueAsString(output.getSuggestedReviewQuestions()))
                    .model(model)
                    .status("SUCCESS")
                    .sourceProcessedAt(content.getProcessedAt())
                    .sourceChunkCount((int) chunkCount)
                    .contentVersion(content.getContentId() != null ? content.getContentId().toString() : null)
                    .createdAt(now)
                    .updatedAt(now)
                    .build();
            return aiSummaryRepository.save(entity);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to save summary");
        }
    }

    @Transactional(readOnly = true)
    public SummaryResponse getLatest(Integer documentId, String userEmail) {
        User user = loadUser(userEmail);
        AiSummary summary = aiSummaryRepository
                .findByDocument_DocumentIdAndUser_UserIdOrderByCreatedAtDesc(documentId, user.getUserId())
                .orElseThrow(() -> new QuotaExceededException(HttpStatus.NOT_FOUND,
                        "No summary found for this document", "SUMMARY_NOT_FOUND"));
        return toResponse(summary);
    }

    @Transactional(readOnly = true)
    public List<SummaryHistoryItemResponse> getHistory(Integer documentId, String userEmail) {
        User user = loadUser(userEmail);
        return aiSummaryRepository
                .findByDocument_DocumentIdAndUser_UserIdOrderByCreatedAtDesc(
                        documentId, user.getUserId(), PageRequest.of(0, 50))
                .stream()
                .map(s -> SummaryHistoryItemResponse.builder()
                        .summaryId(s.getSummaryId())
                        .documentId(s.getDocument().getDocumentId())
                        .overview(s.getOverview())
                        .createdAt(s.getCreatedAt())
                        .build())
                .collect(Collectors.toList());
    }

    private SummaryResponse toResponse(AiSummary s) {
        try {
            List<String> keyPoints = objectMapper.readValue(s.getKeyPointsJson(),
                    objectMapper.getTypeFactory().constructCollectionType(List.class, String.class));
            List<ImportantTerm> terms = objectMapper.readValue(s.getImportantTermsJson(),
                    objectMapper.getTypeFactory().constructCollectionType(List.class, ImportantTerm.class));
            List<String> questions = objectMapper.readValue(s.getReviewQuestionsJson(),
                    objectMapper.getTypeFactory().constructCollectionType(List.class, String.class));

            return SummaryResponse.builder()
                    .summaryId(s.getSummaryId())
                    .documentId(s.getDocument().getDocumentId())
                    .overview(s.getOverview())
                    .keyPoints(keyPoints)
                    .importantTerms(terms)
                    .suggestedReviewQuestions(questions)
                    .model(s.getModel())
                    .sourceProcessedAt(s.getSourceProcessedAt())
                    .sourceChunkCount(s.getSourceChunkCount())
                    .createdAt(s.getCreatedAt())
                    .build();
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to read stored summary");
        }
    }

    private User loadUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
    }
}