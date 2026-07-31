package com.demo.ai_study_hub.service;

import org.springframework.stereotype.Component;
import java.util.List;

@Component
public class TextCleaner {

    private static final int MAX_CHARACTERS = 200_000;

    public static class CleanResult {
        public final String cleanedText;
        public final int originalCharacterCount;
        public final int characterCount;
        public final int wordCount;
        public final boolean isTruncated;

        public CleanResult(String cleanedText, int originalCharacterCount,
                           int characterCount, int wordCount, boolean isTruncated) {
            this.cleanedText = cleanedText;
            this.originalCharacterCount = originalCharacterCount;
            this.characterCount = characterCount;
            this.wordCount = wordCount;
            this.isTruncated = isTruncated;
        }
    }

    /**
     * Normalizes whitespace, trims, and truncates to MAX_CHARACTERS.
     * Returns null cleanedText if text is empty after cleaning.
     */
    public CleanResult clean(String rawText) {
        if (rawText == null) {
            return new CleanResult(null, 0, 0, 0, false);
        }


        String normalized = rawText
                .replace("\r\n", "\n")
                .replace("\r", "\n");


        String[] lines = normalized.split("\n");
        StringBuilder sb = new StringBuilder();
        for (String line : lines) {

            String cleaned = line.replaceAll("[ \\t]+", " ").strip();
            sb.append(cleaned).append("\n");
        }


        String collapsed = sb.toString().replaceAll("\n{3,}", "\n\n");


        String trimmed = collapsed.strip();

        if (trimmed.isEmpty()) {
            return new CleanResult(null, 0, 0, 0, false);
        }

        int originalCount = trimmed.length();
        boolean isTruncated = originalCount > MAX_CHARACTERS;
        String finalText = isTruncated ? trimmed.substring(0, MAX_CHARACTERS) : trimmed;


        if (isTruncated) {
            int lastSpace = finalText.lastIndexOf(' ');
            if (lastSpace > MAX_CHARACTERS - 500) {
                finalText = finalText.substring(0, lastSpace);
            }
        }

        int characterCount = finalText.length();
        int wordCount = finalText.trim().isEmpty() ? 0
                : finalText.trim().split("\\s+").length;

        return new CleanResult(finalText, originalCount, characterCount, wordCount, isTruncated);
    }

    public static class CleanPagesResult {
    public final String cleanedText;
    public final List<Integer> pageStartOffsets;
    public final int originalCharacterCount;
    public final int characterCount;
    public final int wordCount;
    public final boolean isTruncated;

    public CleanPagesResult(String cleanedText, List<Integer> pageStartOffsets,
                             int originalCharacterCount, int characterCount,
                             int wordCount, boolean isTruncated) {
        this.cleanedText = cleanedText;
        this.pageStartOffsets = pageStartOffsets;
        this.originalCharacterCount = originalCharacterCount;
        this.characterCount = characterCount;
        this.wordCount = wordCount;
        this.isTruncated = isTruncated;
    }
}

/**
 * Cleans each page independently, then joins them, recording accurate
 * page-start offsets relative to the final cleaned text.
 */
public CleanPagesResult cleanPages(List<String> rawPages) {
    if (rawPages == null || rawPages.isEmpty()) {
        return new CleanPagesResult(null, new java.util.ArrayList<>(), 0, 0, 0, false);
    }

    StringBuilder joined = new StringBuilder();
    List<Integer> pageStartOffsets = new java.util.ArrayList<>();
    int originalTotalLength = 0;

    for (String rawPage : rawPages) {
        String pageRaw = rawPage != null ? rawPage : "";
        originalTotalLength += pageRaw.length();

        CleanResult pageCleaned = cleanSingleLine(pageRaw);
        pageStartOffsets.add(joined.length());

        if (pageCleaned.cleanedText != null && !pageCleaned.cleanedText.isBlank()) {
            joined.append(pageCleaned.cleanedText).append("\n\n");
        }
    }

    String finalText = joined.toString().strip();

    if (finalText.isEmpty()) {
        return new CleanPagesResult(null, pageStartOffsets, originalTotalLength, 0, 0, false);
    }

    int originalCount = finalText.length();
    boolean isTruncated = originalCount > MAX_CHARACTERS;
    String truncatedText = isTruncated ? finalText.substring(0, MAX_CHARACTERS) : finalText;

    if (isTruncated) {
        int lastSpace = truncatedText.lastIndexOf(' ');
        if (lastSpace > MAX_CHARACTERS - 500) {
            truncatedText = truncatedText.substring(0, lastSpace);
        }
    }

    int characterCount = truncatedText.length();
    int wordCount = truncatedText.trim().isEmpty() ? 0
            : truncatedText.trim().split("\\s+").length;

    return new CleanPagesResult(truncatedText, pageStartOffsets,
            originalTotalLength, characterCount, wordCount, isTruncated);
}

private CleanResult cleanSingleLine(String rawText) {
    if (rawText == null || rawText.isBlank()) {
        return new CleanResult(null, 0, 0, 0, false);
    }

    String normalized = rawText.replace("\r\n", "\n").replace("\r", "\n");
    String[] lines = normalized.split("\n");
    StringBuilder sb = new StringBuilder();
    for (String line : lines) {
        String cleanedLine = line.replaceAll("[ \\t]+", " ").strip();
        sb.append(cleanedLine).append("\n");
    }
    String collapsed = sb.toString().replaceAll("\n{3,}", "\n\n").strip();

    if (collapsed.isEmpty()) {
        return new CleanResult(null, 0, 0, 0, false);
    }
    return new CleanResult(collapsed, collapsed.length(), collapsed.length(), 0, false);
}
}
