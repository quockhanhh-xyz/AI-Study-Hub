package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.dto.QuizDtos.*;
import com.demo.ai_study_hub.dto.QuizAttemptDtos.*;
import com.demo.ai_study_hub.entity.*;
import com.demo.ai_study_hub.entity.QuizAttempt;
import com.demo.ai_study_hub.entity.QuizAttemptAnswer;
import com.demo.ai_study_hub.enums.UserTier;
import com.demo.ai_study_hub.exception.QuotaExceededException;
import com.demo.ai_study_hub.exception.AiProviderException;
import com.demo.ai_study_hub.repository.*;
import com.demo.ai_study_hub.repository.QuizAttemptRepository;
import com.demo.ai_study_hub.repository.QuizAttemptAnswerRepository;
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
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;
import java.util.UUID;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.TransactionDefinition;

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
    private final QuizAttemptRepository quizAttemptRepository;
    private final QuizAttemptAnswerRepository quizAttemptAnswerRepository;

    private static class AiReservationResult {
        final User user;
        final Document doc;
        final DocumentContent content;
        final UserTier tier;
        final int count;
        final String difficulty;
        final String focus;

        AiReservationResult(User user, Document doc, DocumentContent content, UserTier tier, int count, String difficulty, String focus) {
            this.user = user;
            this.doc = doc;
            this.content = content;
            this.tier = tier;
            this.count = count;
            this.difficulty = difficulty;
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
            String focus = validateAndCleanFocus(request.getFocus());

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

            return new AiReservationResult(user, doc, content, tier, count, difficulty, focus);
        });

        // 2. Call AI provider outside transaction
        String model = aiModelSelector.selectModel(reserveResult.tier.name());
        int maxTokens = aiModelSelector.getMaxLearningOutputTokens(reserveResult.tier.name());

        try {
            List<AiQuizQuestionOutput> questions = callAndValidateWithRetry(documentId, reserveResult.tier.name(), reserveResult.content.getExtractedText(), model, maxTokens, reserveResult.count, reserveResult.difficulty, reserveResult.focus);

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
                        0, 0, 0, false, false, "SUCCESS");

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

    private List<AiQuizQuestionOutput> callAndValidateWithRetry(Integer documentId, String tier, String extractedText, String model, int maxTokens, int count, String difficulty, String focus) {
        boolean lastFailureWasProviderCall = false;
        for (int attempt = 1; attempt <= 2; attempt++) {
            String context = learningContextBuilder.buildLimitedContext(documentId, tier, attempt, extractedText);
            int currentCount = (attempt == 1) ? count : Math.max(3, count / 2);
            String prompt = focus != null
                    ? promptBuilder.buildQuizPrompt(context, currentCount, difficulty, focus)
                    : promptBuilder.buildQuizPrompt(context, currentCount, difficulty);
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
                .questionCount(questions.size())
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
                        .createdAt(s.getCreatedAt() != null ? s.getCreatedAt().toInstant(ZoneOffset.UTC) : null)
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
                .sourceProcessedAt(s.getSourceProcessedAt() != null ? s.getSourceProcessedAt().toInstant(ZoneOffset.UTC) : null)
                .sourceChunkCount(s.getSourceChunkCount())
                .createdAt(s.getCreatedAt() != null ? s.getCreatedAt().toInstant(ZoneOffset.UTC) : null)
                .questions(items)
                .build();
    }

    private User loadUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
    }

    @Transactional
    public QuizAttemptResponse submitAttempt(Long quizSetId, QuizAttemptRequest request, String userEmail) {
        User user = loadUser(userEmail);
        QuizSet quizSet = quizSetRepository.findById(quizSetId)
                .orElseThrow(() -> new QuotaExceededException(HttpStatus.NOT_FOUND,
                        "Quiz set not found", "QUIZ_SET_NOT_FOUND"));

        // Check permission
        try {
            accessGuard.checkReadPermission(quizSet.getDocument(), user);
        } catch (Exception e) {
            throw new QuotaExceededException(HttpStatus.FORBIDDEN,
                    "Forbidden to access this quiz set", "QUIZ_ATTEMPT_FORBIDDEN");
        }

        int totalQuestions = quizSet.getQuestions().size();
        if (totalQuestions == 0) {
            throw new QuotaExceededException(HttpStatus.BAD_REQUEST,
                    "Quiz set has no questions", "QUIZ_SET_NOT_FOUND");
        }

        QuizAttempt previousAttempt = quizAttemptRepository
                .findFirstByQuizSet_QuizSetIdAndUser_UserIdOrderByCreatedAtDesc(quizSetId, user.getUserId())
                .orElse(null);

        List<QuizAttemptAnswer> attemptAnswers = new ArrayList<>();
        int correctCount = 0;

        QuizAttempt attempt = QuizAttempt.builder()
                .quizSet(quizSet)
                .user(user)
                .startedAt(request.getStartedAt() != null ? LocalDateTime.ofInstant(request.getStartedAt(), ZoneOffset.UTC) : LocalDateTime.now(ZoneOffset.UTC))
                .completedAt(request.getCompletedAt() != null ? LocalDateTime.ofInstant(request.getCompletedAt(), ZoneOffset.UTC) : LocalDateTime.now(ZoneOffset.UTC))
                .createdAt(LocalDateTime.now(ZoneOffset.UTC))
                .score(0.0)
                .correctCount(0)
                .percentage(0.0)
                .totalQuestions(totalQuestions)
                .build();

        // Save first so we have attemptId
        attempt = quizAttemptRepository.save(attempt);

        for (QuizQuestion q : quizSet.getQuestions()) {
            final QuizQuestion question = q;
            QuizAttemptRequest.AnswerInput ansInput = request.getAnswers() == null ? null : request.getAnswers().stream()
                    .filter(a -> a != null && question.getQuestionId().equals(a.getQuestionId()))
                    .findFirst()
                    .orElse(null);

            String selectedOpt = null;
            boolean isCorrect = false;

            if (ansInput != null) {
                String rawSel = ansInput.getSelectedOption() != null ? ansInput.getSelectedOption().toUpperCase().trim() : "";
                selectedOpt = rawSel;
                final String selectedOptFinal = rawSel;
                boolean optionExists = question.getOptions().stream()
                        .anyMatch(o -> o.getOptionKey().equalsIgnoreCase(selectedOptFinal));
                if (!optionExists) {
                    throw new QuotaExceededException(HttpStatus.BAD_REQUEST,
                            "Invalid selected option: " + ansInput.getSelectedOption(),
                            "QUIZ_ATTEMPT_INVALID_ANSWER");
                }
                String correctOpt = question.getCorrectOption().toUpperCase();
                isCorrect = selectedOpt.equals(correctOpt);
                if (isCorrect) {
                    correctCount++;
                }
            }

            QuizAttemptAnswer attemptAnswer = QuizAttemptAnswer.builder()
                    .quizAttempt(attempt)
                    .quizQuestion(question)
                    .selectedOption(selectedOpt)
                    .correctOption(question.getCorrectOption().toUpperCase())
                    .isCorrect(isCorrect)
                    .answeredAt(LocalDateTime.now(ZoneOffset.UTC))
                    .build();

            attemptAnswers.add(attemptAnswer);
        }

        // Save all answers
        quizAttemptAnswerRepository.saveAll(attemptAnswers);

        double percentage = ((double) correctCount / totalQuestions) * 100.0;
        percentage = Math.round(percentage * 10.0) / 10.0;
        attempt.setCorrectCount(correctCount);
        attempt.setPercentage(percentage);
        attempt.setScore((double) correctCount);
        attempt.setAnswers(attemptAnswers);

        // Update attempt with final scores
        attempt = quizAttemptRepository.save(attempt);

        QuizAttemptResponse response = toAttemptResponse(attempt);

        if (previousAttempt != null) {
            double prevPercentage = previousAttempt.getPercentage() != null ? previousAttempt.getPercentage() : 0.0;
            prevPercentage = Math.round(prevPercentage * 10.0) / 10.0;
            double diff = Math.round((percentage - prevPercentage) * 10.0) / 10.0;
            response.setPreviousPercentage(prevPercentage);
            response.setProgressPercentage(Math.abs(diff));
            if (diff > 0) {
                response.setProgressStatus("IMPROVED");
            } else if (diff < 0) {
                response.setProgressStatus("REGRESSED");
            } else {
                response.setProgressStatus("SAME");
            }
        } else {
            response.setProgressStatus("FIRST_ATTEMPT");
            response.setPreviousPercentage(0.0);
            response.setProgressPercentage(0.0);
        }

        return response;
    }

    @Transactional(readOnly = true)
    public List<QuizAttemptResponse> getAttemptHistory(Long quizSetId, String userEmail) {
        User user = loadUser(userEmail);
        QuizSet quizSet = quizSetRepository.findById(quizSetId)
                .orElseThrow(() -> new QuotaExceededException(HttpStatus.NOT_FOUND,
                        "Quiz set not found", "QUIZ_SET_NOT_FOUND"));

        // Check permission
        try {
            accessGuard.checkReadPermission(quizSet.getDocument(), user);
        } catch (Exception e) {
            throw new QuotaExceededException(HttpStatus.FORBIDDEN,
                    "Forbidden to access this quiz set", "QUIZ_ATTEMPT_FORBIDDEN");
        }

        List<QuizAttempt> attempts = quizAttemptRepository
                .findByQuizSet_QuizSetIdAndUser_UserIdOrderByCreatedAtDesc(quizSetId, user.getUserId());

        List<QuizAttemptResponse> responses = new java.util.ArrayList<>();
        for (int i = 0; i < attempts.size(); i++) {
            QuizAttempt attempt = attempts.get(i);
            QuizAttemptResponse response = toAttemptResponse(attempt);

            QuizAttempt previousAttempt = (i + 1 < attempts.size()) ? attempts.get(i + 1) : null;

            if (previousAttempt != null) {
                double percentage = attempt.getPercentage() != null ? attempt.getPercentage() : 0.0;
                double prevPercentage = previousAttempt.getPercentage() != null ? previousAttempt.getPercentage() : 0.0;
                percentage = Math.round(percentage * 10.0) / 10.0;
                prevPercentage = Math.round(prevPercentage * 10.0) / 10.0;
                double diff = Math.round((percentage - prevPercentage) * 10.0) / 10.0;
                response.setPreviousPercentage(prevPercentage);
                response.setProgressPercentage(Math.abs(diff));
                if (diff > 0) {
                    response.setProgressStatus("IMPROVED");
                } else if (diff < 0) {
                    response.setProgressStatus("REGRESSED");
                } else {
                    response.setProgressStatus("SAME");
                }
            } else {
                response.setProgressStatus("FIRST_ATTEMPT");
                response.setPreviousPercentage(0.0);
                response.setProgressPercentage(0.0);
            }
            responses.add(response);
        }

        return responses;
    }

    @Transactional(readOnly = true)
    public QuizAttemptResponse getLatestAttempt(Long quizSetId, String userEmail) {
        User user = loadUser(userEmail);
        QuizSet quizSet = quizSetRepository.findById(quizSetId)
                .orElseThrow(() -> new QuotaExceededException(HttpStatus.NOT_FOUND,
                        "Quiz set not found", "QUIZ_SET_NOT_FOUND"));

        // Check permission
        try {
            accessGuard.checkReadPermission(quizSet.getDocument(), user);
        } catch (Exception e) {
            throw new QuotaExceededException(HttpStatus.FORBIDDEN,
                    "Forbidden to access this quiz set", "QUIZ_ATTEMPT_FORBIDDEN");
        }

        QuizAttempt attempt = quizAttemptRepository
                .findFirstByQuizSet_QuizSetIdAndUser_UserIdOrderByCreatedAtDesc(quizSetId, user.getUserId())
                .orElseThrow(() -> new QuotaExceededException(HttpStatus.NOT_FOUND,
                        "No attempts found for this quiz set", "QUIZ_ATTEMPT_NOT_FOUND"));

        return toAttemptResponse(attempt);
    }

    @Transactional(readOnly = true)
    public QuizAttemptResponse getBestAttempt(Long quizSetId, String userEmail) {
        User user = loadUser(userEmail);
        QuizSet quizSet = quizSetRepository.findById(quizSetId)
                .orElseThrow(() -> new QuotaExceededException(HttpStatus.NOT_FOUND,
                        "Quiz set not found", "QUIZ_SET_NOT_FOUND"));

        // Check permission
        try {
            accessGuard.checkReadPermission(quizSet.getDocument(), user);
        } catch (Exception e) {
            throw new QuotaExceededException(HttpStatus.FORBIDDEN,
                    "Forbidden to access this quiz set", "QUIZ_ATTEMPT_FORBIDDEN");
        }

        QuizAttempt attempt = quizAttemptRepository
                .findFirstByQuizSet_QuizSetIdAndUser_UserIdOrderByPercentageDescCreatedAtDesc(quizSetId, user.getUserId())
                .orElseThrow(() -> new QuotaExceededException(HttpStatus.NOT_FOUND,
                        "No attempts found for this quiz set", "QUIZ_ATTEMPT_NOT_FOUND"));

        return toAttemptResponse(attempt);
    }

    private QuizAttemptResponse toAttemptResponse(QuizAttempt attempt) {
        List<QuizAttemptAnswerResponse> answers = attempt.getAnswers().stream()
                .map(a -> QuizAttemptAnswerResponse.builder()
                        .attemptAnswerId(a.getAttemptAnswerId())
                        .questionId(a.getQuizQuestion().getQuestionId())
                        .selectedOption(a.getSelectedOption())
                        .correctOption(a.getCorrectOption())
                        .isCorrect(a.getIsCorrect())
                        .answeredAt(a.getAnsweredAt() != null ? a.getAnsweredAt().toInstant(ZoneOffset.UTC) : null)
                        .build())
                .collect(Collectors.toList());

        return QuizAttemptResponse.builder()
                .attemptId(attempt.getAttemptId())
                .quizSetId(attempt.getQuizSet().getQuizSetId())
                .userId(attempt.getUser().getUserId())
                .score(attempt.getScore())
                .totalQuestions(attempt.getTotalQuestions())
                .correctCount(attempt.getCorrectCount())
                .percentage(attempt.getPercentage())
                .startedAt(attempt.getStartedAt() != null ? attempt.getStartedAt().toInstant(ZoneOffset.UTC) : null)
                .completedAt(attempt.getCompletedAt() != null ? attempt.getCompletedAt().toInstant(ZoneOffset.UTC) : null)
                .createdAt(attempt.getCreatedAt() != null ? attempt.getCreatedAt().toInstant(ZoneOffset.UTC) : null)
                .answers(answers)
                .build();
    }
}