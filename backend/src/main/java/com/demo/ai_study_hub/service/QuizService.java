package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.dto.QuizDtos.*;
import com.demo.ai_study_hub.entity.*;
import com.demo.ai_study_hub.enums.UserTier;
import com.demo.ai_study_hub.exception.QuotaExceededException;
import com.demo.ai_study_hub.repository.DocumentChunkRepository;
import com.demo.ai_study_hub.repository.QuizSetRepository;
import com.demo.ai_study_hub.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
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
public class QuizService {

    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final java.util.Set<String> VALID_DIFFICULTY_INPUT = java.util.Set.of("EASY", "MEDIUM", "HARD", "MIXED");

    private final QuizSetRepository quizSetRepository;
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
        final String difficulty;

        AiReservationResult(User user, Document doc, DocumentContent content, UserTier tier, int count, String difficulty) {
            this.user = user;
            this.doc = doc;
            this.content = content;
            this.tier = tier;
            this.count = count;
            this.difficulty = difficulty;
        }
    }

    public QuizSetResponse generate(Integer documentId, GenerateQuizRequest request, String userEmail) {
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

            AiLearningQuotaPolicy.CountRange range = quotaPolicy.quizQuestionCountRange(tier);
            int count = resolveCount(request.getQuestionCount(), range);
            String difficulty = resolveDifficulty(request.getDifficulty());

            checkDailyQuota(user, tier);

            if (!aiProviderRouter.isConfigured()) {
                saveUsageLog(user, doc, "QUIZ", null, null, 0, 0, 0, false, false, "AI_NOT_CONFIGURED");
                throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "AI service is not configured");
            }

            AiUsageReservation reservation = AiUsageReservation.builder()
                    .requestId(requestId)
                    .user(user)
                    .requestType("QUIZ")
                    .status("RESERVED")
                    .reservedAt(LocalDateTime.now())
                    .expiresAt(LocalDateTime.now().plusSeconds(60))
                    .build();
            aiUsageReservationRepository.save(reservation);

            return new AiReservationResult(user, doc, content, tier, count, difficulty);
        });

        // 2. Call AI provider outside transaction
        String model = aiModelSelector.selectModel(reserveResult.tier.name());
        int maxTokens = aiModelSelector.getMaxLearningOutputTokens(reserveResult.tier.name());

        try {
            List<AiQuizQuestionOutput> questions = callAndValidateWithRetry(documentId, reserveResult.tier.name(), reserveResult.content.getExtractedText(), model, maxTokens, reserveResult.count, reserveResult.difficulty);

            // 3. Confirm reservation, save result, and log success in REQUIRES_NEW transaction
            return txTemplate.execute(status -> {
                AiUsageReservation res = aiUsageReservationRepository.findByRequestId(requestId).orElseThrow();
                res.setStatus("CONFIRMED");
                res.setConfirmedAt(LocalDateTime.now());
                aiUsageReservationRepository.save(res);

                long chunkCount = documentChunkRepository.findByDocument_DocumentIdOrderByChunkIndexAsc(documentId).size();
                QuizSet entity = persist(reserveResult.doc, reserveResult.user, questions, model, reserveResult.content, chunkCount, reserveResult.count);

                saveUsageLog(reserveResult.user, reserveResult.doc, "QUIZ",
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
                saveUsageLog(reserveResult.user, reserveResult.doc, "QUIZ",
                        null, null, 0, 0, 0, false, false, errorCode);
            });
            throw e;
        }
    }

    private int resolveCount(Integer requested, AiLearningQuotaPolicy.CountRange range) {
        if (requested == null) return range.defaultValue();
        if (requested < range.min() || requested > range.max()) {
            throw new QuotaExceededException(HttpStatus.BAD_REQUEST,
                    "Requested question count is out of the allowed range for your tier",
                    "INVALID_QUIZ_QUESTION_COUNT");
        }
        return requested;
    }

    private String resolveDifficulty(String requested) {
        if (requested == null || requested.isBlank()) return "MIXED";
        String upper = requested.toUpperCase();
        if (!VALID_DIFFICULTY_INPUT.contains(upper)) {
            throw new QuotaExceededException(HttpStatus.BAD_REQUEST,
                    "Invalid difficulty value", "INVALID_QUIZ_DIFFICULTY");
        }
        return upper;
    }

    private List<AiQuizQuestionOutput> callAndValidateWithRetry(Integer documentId, String tier, String extractedText, String model, int maxTokens, int count, String difficulty) {
        boolean lastFailureWasProviderCall = false;
        for (int attempt = 1; attempt <= 2; attempt++) {
            String context = learningContextBuilder.buildLimitedContext(documentId, tier, attempt);
            if (context == null) {
                context = extractedText;
            }
            int currentCount = (attempt == 1) ? count : Math.max(3, count / 2);
            String prompt = promptBuilder.buildQuizPrompt(context, currentCount, difficulty);
            String rawText;
            try {
                rawText = aiProviderRouter.route().call(prompt, model, maxTokens, 0.3, true).getText();
            } catch (Exception e) {
                lastFailureWasProviderCall = true;
                if (attempt == 2) {
                    throw e;
                }
                continue;
            }
            try {
                AiQuizOutputWrapper wrapper = parseJson(rawText, AiQuizOutputWrapper.class);
                if (wrapper != null && wrapper.getQuestions() != null) {
                    for (AiQuizQuestionOutput q : wrapper.getQuestions()) {
                        if (q != null) {
                            if (q.getDifficulty() == null || "MIXED".equalsIgnoreCase(q.getDifficulty().trim())) {
                                q.setDifficulty("MEDIUM");
                            } else {
                                q.setDifficulty(q.getDifficulty().trim().toUpperCase());
                            }
                            if (q.getCorrectOption() != null) {
                                q.setCorrectOption(q.getCorrectOption().trim().toUpperCase());
                            }
                            if (q.getOptions() != null) {
                                for (AiQuizOptionOutput opt : q.getOptions()) {
                                    if (opt != null && opt.getKey() != null) {
                                        opt.setKey(opt.getKey().trim().toUpperCase());
                                    }
                                }
                            }
                        }
                    }
                }
                validator.validateQuiz(wrapper.getQuestions(), currentCount);
                return wrapper.getQuestions();
            } catch (Exception e) {
                log.warn("Invalid quiz AI output on attempt {}: {}", attempt, e.getMessage());
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
        int limit = quotaPolicy.quizSetDailyLimit(tier);
        LocalDateTime[] window = todayWindowUtc();
        long usedToday = aiUsageLogRepository.countSuccessfulLogsByTypeAfter(
                user.getUserId(), "QUIZ", window[0]);
        long activeReservations = aiUsageReservationRepository.countActiveReservationsByType(
                user, "QUIZ", LocalDateTime.now());
        if (usedToday + activeReservations >= limit) {
            throw new QuotaExceededException(HttpStatus.FORBIDDEN,
                    "Quiz sets daily quota exceeded", "QUIZ_QUOTA_EXCEEDED");
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

    private QuizSet persist(Document doc, User user, List<AiQuizQuestionOutput> questions, String model,
                            DocumentContent content, long chunkCount, int count) {
        LocalDateTime now = LocalDateTime.now(java.time.ZoneOffset.UTC);
        QuizSet set = QuizSet.builder()
                .document(doc)
                .user(user)
                .title("Quiz from " + doc.getTitle())
                .questionCount(count)
                .model(model)
                .sourceProcessedAt(content.getProcessedAt())
                .sourceChunkCount((int) chunkCount)
                .contentVersion(content.getContentId() != null ? content.getContentId().toString() : null)
                .createdAt(now)
                .updatedAt(now)
                .build();

        List<QuizQuestion> quizQuestions = new ArrayList<>();
        int qPosition = 1;
        for (AiQuizQuestionOutput q : questions) {
            QuizQuestion question = QuizQuestion.builder()
                    .quizSet(set)
                    .questionText(q.getQuestionText())
                    .correctOption(q.getCorrectOption().toUpperCase())
                    .explanation(q.getExplanation())
                    .difficulty(q.getDifficulty().toUpperCase())
                    .position(qPosition++)
                    .build();

            List<QuizOption> options = new ArrayList<>();
            int oPosition = 1;
            for (AiQuizOptionOutput o : q.getOptions()) {
                options.add(QuizOption.builder()
                        .question(question)
                        .optionKey(o.getKey().toUpperCase())
                        .optionText(o.getText())
                        .position(oPosition++)
                        .build());
            }
            question.setOptions(options);
            quizQuestions.add(question);
        }
        set.setQuestions(quizQuestions);

        return quizSetRepository.save(set);
    }

    @Transactional(readOnly = true)
    public List<QuizSetListItemResponse> list(Integer documentId, String userEmail) {
        User user = loadUser(userEmail);
        return quizSetRepository
                .findByDocument_DocumentIdAndUser_UserIdOrderByCreatedAtDesc(documentId, user.getUserId())
                .stream()
                .map(s -> QuizSetListItemResponse.builder()
                        .quizSetId(s.getQuizSetId())
                        .documentId(s.getDocument().getDocumentId())
                        .title(s.getTitle())
                        .questionCount(s.getQuestionCount())
                        .createdAt(s.getCreatedAt())
                        .build())
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public QuizSetResponse getDetail(Long setId, String userEmail) {
        User user = loadUser(userEmail);
        QuizSet set = quizSetRepository.findByQuizSetIdAndUser_UserId(setId, user.getUserId())
                .orElseThrow(() -> new QuotaExceededException(HttpStatus.NOT_FOUND,
                        "Quiz set not found", "QUIZ_SET_NOT_FOUND"));
        return toResponse(set);
    }

    private QuizSetResponse toResponse(QuizSet s) {
        List<QuizQuestionItem> items = s.getQuestions().stream()
                .sorted((a, b) -> Integer.compare(a.getPosition(), b.getPosition()))
                .map(q -> QuizQuestionItem.builder()
                        .questionId(q.getQuestionId())
                        .questionText(q.getQuestionText())
                        .correctOption(q.getCorrectOption())
                        .explanation(q.getExplanation())
                        .difficulty(q.getDifficulty())
                        .position(q.getPosition())
                        .options(q.getOptions().stream()
                                .sorted((a, b) -> Integer.compare(a.getPosition(), b.getPosition()))
                                .map(o -> QuizOptionItem.builder()
                                        .optionId(o.getOptionId())
                                        .optionKey(o.getOptionKey())
                                        .optionText(o.getOptionText())
                                        .position(o.getPosition())
                                        .build())
                                .collect(Collectors.toList()))
                        .build())
                .collect(Collectors.toList());

        return QuizSetResponse.builder()
                .quizSetId(s.getQuizSetId())
                .documentId(s.getDocument().getDocumentId())
                .title(s.getTitle())
                .questionCount(s.getQuestionCount())
                .model(s.getModel())
                .sourceProcessedAt(s.getSourceProcessedAt())
                .sourceChunkCount(s.getSourceChunkCount())
                .createdAt(s.getCreatedAt())
                .questions(items)
                .build();
    }

    private User loadUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
    }
}