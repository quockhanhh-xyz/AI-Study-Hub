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

@Service
@RequiredArgsConstructor
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

    @Transactional
    public QuizSetResponse generate(Integer documentId, GenerateQuizRequest request, String userEmail) {
        User user = loadUser(userEmail);
        AiLearningAccessGuard.ReadyDocument ready = accessGuard.requireReadyDocument(documentId, user);
        Document doc = ready.document();
        DocumentContent content = ready.content();

        UserTier tier = tierPolicyService.getEffectiveTier(user);
        AiLearningQuotaPolicy.CountRange range = quotaPolicy.quizQuestionCountRange(tier);
        int count = resolveCount(request.getQuestionCount(), range);
        String difficulty = resolveDifficulty(request.getDifficulty());

        checkDailyQuota(user, tier);

        if (!aiProviderRouter.isConfigured()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "AI service is not configured");
        }

        String prompt = promptBuilder.buildQuizPrompt(content.getExtractedText(), count, difficulty);
        String model = aiModelSelector.selectModel(tier.name());
        int maxTokens = aiModelSelector.getMaxOutputTokens(tier.name());

        List<AiQuizQuestionOutput> questions = callAndValidateWithRetry(prompt, model, maxTokens, count);

        long chunkCount = documentChunkRepository.findByDocument_DocumentIdOrderByChunkIndexAsc(documentId).size();
        QuizSet entity = persist(doc, user, questions, model, content, chunkCount, count);
        return toResponse(entity);
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

    private List<AiQuizQuestionOutput> callAndValidateWithRetry(String prompt, String model, int maxTokens, int count) {
        for (int attempt = 1; attempt <= 2; attempt++) {
            try {
                String rawText = aiProviderRouter.route().call(prompt, model, maxTokens, 0.3).getText();
                AiQuizOutputWrapper wrapper = parseJson(rawText, AiQuizOutputWrapper.class);
                validator.validateQuiz(wrapper.getQuestions(), count);
                return wrapper.getQuestions();
            } catch (Exception e) {
                if (attempt == 2) {
                    throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                            "AI provider returned invalid output after retry");
                }
            }
        }
        throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "AI output invalid");
    }

    private <T> T parseJson(String rawText, Class<T> type) throws Exception {
        String t = rawText.trim();
        if (t.startsWith("```")) {
            t = t.replaceFirst("^```[a-zA-Z]*\\s*", "");
            if (t.endsWith("```")) t = t.substring(0, t.length() - 3);
        }
        return objectMapper.readValue(t.trim(), type);
    }

    private void checkDailyQuota(User user, UserTier tier) {
        int limit = quotaPolicy.quizSetDailyLimit(tier);
        LocalDateTime[] window = todayWindowUtc();
        long usedToday = quizSetRepository.countByUserAndCreatedAtBetween(user.getUserId(), window[0], window[1]);
        if (usedToday >= limit) {
            throw new QuotaExceededException(HttpStatus.FORBIDDEN,
                    "Quiz sets daily quota exceeded", "QUIZ_QUOTA_EXCEEDED");
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