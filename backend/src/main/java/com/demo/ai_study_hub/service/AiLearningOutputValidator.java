package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.dto.FlashcardDtos.AiFlashcardOutput;
import com.demo.ai_study_hub.dto.QuizDtos.AiQuizOptionOutput;
import com.demo.ai_study_hub.dto.QuizDtos.AiQuizQuestionOutput;
import com.demo.ai_study_hub.dto.SummaryDtos.AiSummaryOutput;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Set;

/**
 * Schema/count validation for AI-generated output. A thrown
 * IllegalArgumentException here is caught by the calling service and
 * triggers exactly one retry (see TC-LEARN-23/24) — never a second retry,
 * never a save of invalid data.
 */
@Component
public class AiLearningOutputValidator {

    private static final Set<String> VALID_OPTION_KEYS = Set.of("A", "B", "C", "D");
    private static final Set<String> VALID_DIFFICULTIES = Set.of("EASY", "MEDIUM", "HARD");

    public void validateSummary(AiSummaryOutput output) {
        require(output != null, "Summary output is null");
        require(isNotBlank(output.getOverview()), "overview is blank");
        require(output.getKeyPoints() != null && !output.getKeyPoints().isEmpty(), "keyPoints is empty");
        // Relax: importantTerms and suggestedReviewQuestions are allowed to be empty lists
        if (output.getImportantTerms() != null) {
            output.getImportantTerms().forEach(t ->
                    require(isNotBlank(t.getTerm()) && isNotBlank(t.getDefinition()), "importantTerm missing term/definition"));
        }
    }

    public void validateFlashcards(List<AiFlashcardOutput> cards, int expectedCount) {
        require(cards != null, "cards is null");
        require(cards.size() >= expectedCount,
                "expected at least " + expectedCount + " cards but got " + cards.size());
        if (cards.size() > expectedCount) {
            try {
                while (cards.size() > expectedCount) {
                    cards.remove(cards.size() - 1);
                }
            } catch (UnsupportedOperationException e) {
                // fallback if list is immutable
            }
        }
        for (AiFlashcardOutput c : cards) {
            require(isNotBlank(c.getFrontText()), "flashcard frontText is blank");
            require(isNotBlank(c.getBackText()), "flashcard backText is blank");
            if (c.getDifficulty() != null) {
                require(VALID_DIFFICULTIES.contains(c.getDifficulty().toUpperCase()), "invalid flashcard difficulty");
            }
        }
    }

    public void validateQuiz(List<AiQuizQuestionOutput> questions, int expectedCount) {
        require(questions != null, "questions is null");
        require(questions.size() >= expectedCount,
                "expected at least " + expectedCount + " questions but got " + questions.size());
        if (questions.size() > expectedCount) {
            try {
                while (questions.size() > expectedCount) {
                    questions.remove(questions.size() - 1);
                }
            } catch (UnsupportedOperationException e) {
                // fallback if list is immutable
            }
        }
        for (AiQuizQuestionOutput q : questions) {
            require(isNotBlank(q.getQuestionText()), "quiz questionText is blank");
            require(isNotBlank(q.getExplanation()), "quiz explanation is blank");
            require(q.getDifficulty() != null && VALID_DIFFICULTIES.contains(q.getDifficulty().toUpperCase()),
                    "invalid quiz difficulty");

            List<AiQuizOptionOutput> options = q.getOptions();
            require(options != null && options.size() == 4, "quiz question must have exactly 4 options");

            Set<String> keys = new java.util.HashSet<>();
            for (AiQuizOptionOutput opt : options) {
                require(opt.getKey() != null && VALID_OPTION_KEYS.contains(opt.getKey().toUpperCase()),
                        "invalid option key: " + (opt.getKey()));
                require(isNotBlank(opt.getText()), "quiz option text is blank");
                keys.add(opt.getKey().toUpperCase());
            }
            require(keys.equals(VALID_OPTION_KEYS), "quiz options must be exactly A, B, C, D with no duplicates");

            require(q.getCorrectOption() != null && VALID_OPTION_KEYS.contains(q.getCorrectOption().toUpperCase()),
                    "correctOption must be one of A, B, C, D");
        }
    }

    private boolean isNotBlank(String s) {
        return s != null && !s.isBlank();
    }

    private void require(boolean condition, String message) {
        if (!condition) {
            throw new IllegalArgumentException("AI output validation failed: " + message);
        }
    }
}