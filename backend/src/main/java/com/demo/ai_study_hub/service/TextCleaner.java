package com.demo.ai_study_hub.service;

import org.springframework.stereotype.Component;

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
}
