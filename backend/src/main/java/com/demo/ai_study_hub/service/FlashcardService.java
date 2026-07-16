package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.dto.FlashcardDtos.*;
import com.demo.ai_study_hub.entity.*;
import com.demo.ai_study_hub.enums.UserTier;
import com.demo.ai_study_hub.exception.QuotaExceededException;
import com.demo.ai_study_hub.exception.AiProviderException;
import com.demo.ai_study_hub.repository.DocumentChunkRepository;
import com.demo.ai_study_hub.repository.FlashcardSetRepository;
import com.demo.ai_study_hub.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
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
public class FlashcardService {

    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final FlashcardSetRepository flashcardSetRepository;
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
        final int count;
        final String focus;

        AiReservationResult(User user, Document doc, DocumentContent content, UserTier tier, int count, String focus) {
            this.user = user;
            this.doc = doc;
            this.content = content;
            this.tier = tier;
            this.count = count;
            this.focus = focus;
        }
    }

    private String validateAndCleanFocus(String focus) {
        if (focus == null) return null;
        String trimmed = focus.trim();
        if (trimmed.isEmpty()) return null;
        if (trimmed.length() > 300) {
            throw new QuotaExceededException(HttpStatus.BAD_REQUEST,
                    "Focus topic cannot exceed 300 characters",
                    "INVALID_GENERATION_FOCUS");
        }
        return trimmed;
    }

    public FlashcardSetResponse generate(Integer documentId, GenerateFlashcardRequest request, String userEmail) {
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

            AiLearningQuotaPolicy.CountRange range = quotaPolicy.flashcardCountRange(tier);
            int count = resolveCount(request.getCount(), range, "INVALID_FLASHCARD_COUNT");
            String focus = validateAndCleanFocus(request.getFocus());

            checkDailyQuota(user, tier);

            if (!aiProviderRouter.isConfigured()) {
                saveUsageLog(user, doc, "FLASHCARD", null, null, 0, 0, 0, false, false, "AI_NOT_CONFIGURED");
                throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "AI service is not configured");
            }

            AiUsageReservation reservation = AiUsageReservation.builder()
                    .requestId(requestId)
                    .user(user)
                    .requestType("FLASHCARD")
                    .status("RESERVED")
                    .reservedAt(LocalDateTime.now())
                    .expiresAt(LocalDateTime.now().plusSeconds(60))
                    .build();
            aiUsageReservationRepository.save(reservation);

            return new AiReservationResult(user, doc, content, tier, count, focus);
        });

        // 2. Call AI provider outside transaction
        String model = aiModelSelector.selectModel(reserveResult.tier.name());
        int maxTokens = aiModelSelector.getMaxLearningOutputTokens(reserveResult.tier.name());

        try {
            List<AiFlashcardOutput> cards = callAndValidateWithRetry(documentId, reserveResult.tier.name(), reserveResult.content.getExtractedText(), model, maxTokens, reserveResult.count, reserveResult.focus);

            // 3. Confirm reservation, save result, and log success in REQUIRES_NEW transaction
            return txTemplate.execute(status -> {
                AiUsageReservation res = aiUsageReservationRepository.findByRequestId(requestId).orElseThrow();
                res.setStatus("CONFIRMED");
                res.setConfirmedAt(LocalDateTime.now());
                aiUsageReservationRepository.save(res);

                long chunkCount = documentChunkRepository.findByDocument_DocumentIdOrderByChunkIndexAsc(documentId).size();
                FlashcardSet entity = persist(reserveResult.doc, reserveResult.user, cards, model, reserveResult.content, chunkCount, reserveResult.count);

                saveUsageLog(reserveResult.user, reserveResult.doc, "FLASHCARD",
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

                String errorCode = "FAILED";
                if (e instanceof QuotaExceededException qe) {
                    errorCode = qe.getCode();
                } else if (e instanceof AiProviderException ape) {
                    errorCode = ape.getCode();
                }
                saveUsageLog(reserveResult.user, reserveResult.doc, "FLASHCARD",
                        null, null, 0, 0, 0, false, false, errorCode);
            });
            throw e;
        }
    }

    /** Validates count against [min, max] for the tier; null → tier default. Never trusts an FE-sent default. */
    private int resolveCount(Integer requested, AiLearningQuotaPolicy.CountRange range, String errorCode) {
        if (requested == null) return range.defaultValue();
        if (requested < range.min() || requested > range.max()) {
            throw new QuotaExceededException(HttpStatus.BAD_REQUEST,
                    "Requested count is out of the allowed range for your tier", errorCode);
        }
        return requested;
    }

    private List<AiFlashcardOutput> callAndValidateWithRetry(Integer documentId, String tier, String extractedText, String model, int maxTokens, int count, String focus) {
        boolean lastFailureWasProviderCall = false;
        for (int attempt = 1; attempt <= 2; attempt++) {
            String context = learningContextBuilder.buildLimitedContext(documentId, tier, attempt, extractedText);
            int currentCount = (attempt == 1) ? count : Math.max(3, count / 2);
            String prompt = focus != null
                    ? promptBuilder.buildFlashcardPrompt(context, currentCount, focus)
                    : promptBuilder.buildFlashcardPrompt(context, currentCount);
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
                AiFlashcardOutputWrapper wrapper = parseJson(rawText, AiFlashcardOutputWrapper.class);
                if (wrapper != null && wrapper.getCards() != null) {
                    for (AiFlashcardOutput c : wrapper.getCards()) {
                        if (c != null && c.getDifficulty() != null) {
                            c.setDifficulty(c.getDifficulty().trim().toUpperCase());
                        }
                    }
                }
                validator.validateFlashcards(wrapper.getCards(), currentCount);
                return wrapper.getCards();
            } catch (Exception e) {
                log.warn("Invalid flashcard AI output on attempt {}: {}", attempt, e.getMessage());
                lastFailureWasProviderCall = false;
                if (attempt == 2) {
                    throw new QuotaExceededException(HttpStatus.BAD_GATEWAY,
                            "AI provider returned invalid output after retry", "AI_OUTPUT_INVALID");
                }
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
        int limit = quotaPolicy.flashcardSetDailyLimit(tier);
        LocalDateTime[] window = todayWindowUtc();
        long usedToday = aiUsageLogRepository.countSuccessfulLogsByTypeAfter(
                user.getUserId(), "FLASHCARD", window[0]);
        long activeReservations = aiUsageReservationRepository.countActiveReservationsByType(
                user, "FLASHCARD", LocalDateTime.now());
        if (usedToday + activeReservations >= limit) {
            throw new QuotaExceededException(HttpStatus.FORBIDDEN,
                    "Flashcard sets daily quota exceeded", "FLASHCARD_QUOTA_EXCEEDED");
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

    private LocalDateTime[] todayWindowUtc() {
        LocalDate todayVn = LocalDate.now(VN_ZONE);
        LocalDateTime startUtc = todayVn.atStartOfDay(VN_ZONE).withZoneSameInstant(java.time.ZoneOffset.UTC).toLocalDateTime();
        LocalDateTime endUtc = todayVn.plusDays(1).atStartOfDay(VN_ZONE).withZoneSameInstant(java.time.ZoneOffset.UTC).toLocalDateTime();
        return new LocalDateTime[]{startUtc, endUtc};
    }

    private FlashcardSet persist(Document doc, User user, List<AiFlashcardOutput> cards, String model,
                                 DocumentContent content, long chunkCount, int count) {
        LocalDateTime now = LocalDateTime.now(java.time.ZoneOffset.UTC);
        FlashcardSet set = FlashcardSet.builder()
                .document(doc)
                .user(user)
                .title("Flashcards from " + doc.getTitle())
                .itemCount(cards.size())
                .model(model)
                .sourceProcessedAt(content.getProcessedAt())
                .sourceChunkCount((int) chunkCount)
                .contentVersion(content.getContentId() != null ? content.getContentId().toString() : null)
                .createdAt(now)
                .updatedAt(now)
                .build();

        List<Flashcard> flashcards = new java.util.ArrayList<>();
        int position = 1;
        for (AiFlashcardOutput c : cards) {
            flashcards.add(Flashcard.builder()
                    .flashcardSet(set)
                    .frontText(c.getFrontText())
                    .backText(c.getBackText())
                    .sourcePage(c.getSourcePage())
                    .difficulty(c.getDifficulty() != null ? c.getDifficulty().toUpperCase() : null)
                    .position(position++)
                    .build());
        }
        set.setFlashcards(flashcards);

        return flashcardSetRepository.save(set);
    }

    @Transactional(readOnly = true)
    public List<FlashcardSetListItemResponse> list(Integer documentId, String userEmail) {
        User user = loadUser(userEmail);
        return flashcardSetRepository
                .findByDocument_DocumentIdAndUser_UserIdOrderByCreatedAtDesc(documentId, user.getUserId())
                .stream()
                .map(s -> FlashcardSetListItemResponse.builder()
                        .flashcardSetId(s.getFlashcardSetId())
                        .documentId(s.getDocument().getDocumentId())
                        .title(s.getTitle())
                        .itemCount(s.getItemCount())
                        .createdAt(s.getCreatedAt() != null ? s.getCreatedAt().toInstant(ZoneOffset.UTC) : null)
                        .build())
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public FlashcardSetResponse getDetail(Long setId, String userEmail) {
        User user = loadUser(userEmail);
        FlashcardSet set = flashcardSetRepository.findByFlashcardSetIdAndUser_UserId(setId, user.getUserId())
                .orElseThrow(() -> new QuotaExceededException(HttpStatus.NOT_FOUND,
                        "Flashcard set not found", "FLASHCARD_SET_NOT_FOUND"));
        return toResponse(set);
    }

    private FlashcardSetResponse toResponse(FlashcardSet s) {
        List<FlashcardItem> items = s.getFlashcards().stream()
                .sorted((a, b) -> Integer.compare(a.getPosition(), b.getPosition()))
                .map(f -> FlashcardItem.builder()
                        .flashcardId(f.getFlashcardId())
                        .frontText(f.getFrontText())
                        .backText(f.getBackText())
                        .sourcePage(f.getSourcePage())
                        .difficulty(f.getDifficulty())
                        .position(f.getPosition())
                        .build())
                .collect(Collectors.toList());

        return FlashcardSetResponse.builder()
                .flashcardSetId(s.getFlashcardSetId())
                .documentId(s.getDocument().getDocumentId())
                .title(s.getTitle())
                .itemCount(s.getItemCount())
                .model(s.getModel())
                .sourceProcessedAt(s.getSourceProcessedAt() != null ? s.getSourceProcessedAt().toInstant(ZoneOffset.UTC) : null)
                .sourceChunkCount(s.getSourceChunkCount())
                .createdAt(s.getCreatedAt() != null ? s.getCreatedAt().toInstant(ZoneOffset.UTC) : null)
                .flashcards(items)
                .build();
    }

    private User loadUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
    }
}