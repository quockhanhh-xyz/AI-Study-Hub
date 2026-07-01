package com.demo.ai_study_hub.service;

import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

/**
 * Detects summary/overview intent questions.
 *
 * Summary intent questions trigger retrieveFirstChunks() instead of keyword scoring,
 * ensuring general questions always get document context.
 *
 * Detection strategy: keyword matching against known summary intent phrases.
 * Case-insensitive. BE2 may enhance this with ML-based intent detection.
 */
@Service
public class DefaultSummaryIntentDetector implements SummaryIntentDetector {

    private static final Set<String> SUMMARY_KEYWORDS = new HashSet<>(Arrays.asList(
            "summarize", "summary", "summarise",
            "overview", "give me an overview",
            "key points", "main points", "key takeaways",
            "explain this document", "explain the document",
            "what is this document about", "what is this about",
            "what does this document say", "what does this cover",
            "describe this document", "describe the document",
            "brief overview", "brief summary",
            "tldr", "tl;dr",
            "what are the highlights",
            "give me a summary",
            "summarize this",
            "outline",
            "what is covered in this document",
            "explain in simple words",
            "explain simply"
    ));

    @Override
    public boolean isSummaryIntent(String question) {
        if (question == null || question.isBlank()) return false;
        String normalized = question.toLowerCase().trim();
        // Direct keyword match
        for (String keyword : SUMMARY_KEYWORDS) {
            if (normalized.contains(keyword)) {
                return true;
            }
        }
        return false;
    }
}
