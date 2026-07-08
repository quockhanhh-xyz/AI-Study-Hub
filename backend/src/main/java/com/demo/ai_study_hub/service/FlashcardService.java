package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.dto.FlashcardDtos.*;
import com.demo.ai_study_hub.entity.*;
import com.demo.ai_study_hub.enums.UserTier;
import com.demo.ai_study_hub.exception.QuotaExceededException;
import com.demo.ai_study_hub.repository.DocumentChunkRepository;
import com.demo.ai_study_hub.repository.FlashcardSetRepository;
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
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
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

    @Transactional
    public FlashcardSetResponse generate(Integer documentId, GenerateFlashcardRequest request, String userEmail) {
        User user = loadUser(userEmail);
        AiLearningAccessGuard.ReadyDocument ready = accessGuard.requireReadyDocument(documentId, user);
        Document doc = ready.document();
        DocumentContent content = ready.content();

        UserTier tier = tierPolicyService.getEffectiveTier(user);
        AiLearningQuotaPolicy.CountRange range = quotaPolicy.flashcardCountRange(tier);
        int count = resolveCount(request.getCount(), range, "INVALID_FLASHCARD_COUNT");

        checkDailyQuota(user, tier);

        if (!aiProviderRouter.isConfigured()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "AI service is not configured");
        }

        String prompt = promptBuilder.buildFlashcardPrompt(content.getExtractedText(), count);
        String model = aiModelSelector.selectModel(tier.name());
        int maxTokens = aiModelSelector.getMaxOutputTokens(tier.name());

        List<AiFlashcardOutput> cards = callAndValidateWithRetry(prompt, model, maxTokens, count);

        long chunkCount = documentChunkRepository.findByDocument_DocumentIdOrderByChunkIndexAsc(documentId).size();
        FlashcardSet entity = persist(doc, user, cards, model, content, chunkCount, count);
        return toResponse(entity);
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

    private List<AiFlashcardOutput> callAndValidateWithRetry(String prompt, String model, int maxTokens, int count) {
        for (int attempt = 1; attempt <= 2; attempt++) {
            try {
                String rawText = aiProviderRouter.route().call(prompt, model, maxTokens, 0.3).getText();
                AiFlashcardOutputWrapper wrapper = parseJson(rawText, AiFlashcardOutputWrapper.class);
                validator.validateFlashcards(wrapper.getCards(), count);
                return wrapper.getCards();
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
        int limit = quotaPolicy.flashcardSetDailyLimit(tier);
        LocalDateTime[] window = todayWindowUtc();
        long usedToday = flashcardSetRepository.countByUserAndCreatedAtBetween(
                user.getUserId(), window[0], window[1]);
        if (usedToday >= limit) {
            throw new QuotaExceededException(HttpStatus.FORBIDDEN,
                    "Flashcard sets daily quota exceeded", "FLASHCARD_QUOTA_EXCEEDED");
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
                .itemCount(count)
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
                        .createdAt(s.getCreatedAt())
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
                .sourceProcessedAt(s.getSourceProcessedAt())
                .sourceChunkCount(s.getSourceChunkCount())
                .createdAt(s.getCreatedAt())
                .flashcards(items)
                .build();
    }

    private User loadUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
    }
}