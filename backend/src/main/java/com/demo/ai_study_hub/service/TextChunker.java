package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.dto.ExtractionResult;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
public class TextChunker {

    private static final int TARGET_CHUNK_SIZE = 1000;
    private static final int MAX_CHUNK_SIZE = 1200;
    private static final int OVERLAP_SIZE = 150;
    private static final int MAX_CHUNKS = 2000;

    /**
     * Splits cleaned text into chunks deterministically.
     * Priority: paragraph -> sentence -> hard character limit.
     * Each chunk has start/end offset into the original cleanedText.
     */
    public List<ExtractionResult.ExtractedChunk> chunk(String cleanedText) {
        List<ExtractionResult.ExtractedChunk> chunks = new ArrayList<>();
        if (cleanedText == null || cleanedText.isBlank()) {
            return chunks;
        }

        int pos = 0;
        int chunkIndex = 0;
        int len = cleanedText.length();

        while (pos < len && chunkIndex < MAX_CHUNKS) {
            int end = Math.min(pos + TARGET_CHUNK_SIZE, len);

            if (end < len) {

                int paragraphBreak = findLastParagraphBreak(cleanedText, pos, end);
                if (paragraphBreak > pos) {
                    end = paragraphBreak;
                } else {

                    int sentenceBreak = findLastSentenceBreak(cleanedText, pos, end);
                    if (sentenceBreak > pos) {
                        end = sentenceBreak;
                    } else {

                        int spaceBreak = findLastSpace(cleanedText, pos, end);
                        if (spaceBreak > pos) {
                            end = spaceBreak;
                        }

                    }
                }
            }


            end = Math.min(end, pos + MAX_CHUNK_SIZE);
            end = Math.min(end, len);

            String chunkText = cleanedText.substring(pos, end).strip();


            if (!chunkText.isBlank()) {
                chunks.add(ExtractionResult.ExtractedChunk.builder()
                        .chunkIndex(chunkIndex++)
                        .chunkText(chunkText)
                        .characterCount(chunkText.length())
                        .startOffset(pos)
                        .endOffset(end)
                        .pageNumber(null)
                        .sourceLabel(null)
                        .build());
            }


            if (end >= len) {
                break;
            }


            int nextPos = end - OVERLAP_SIZE;
            if (nextPos <= pos) {
                nextPos = end;
            }
            pos = nextPos;
        }

        return chunks;
    }

    /**
     * Chunks with page-aware metadata (for PDF where parser provides page boundaries).
     * pageOffsets: list of character offsets where each new page starts in cleanedText.
     */
    public List<ExtractionResult.ExtractedChunk> chunkWithPages(String cleanedText,
                                                                  List<Integer> pageStartOffsets) {
        List<ExtractionResult.ExtractedChunk> chunks = chunk(cleanedText);
        if (pageStartOffsets == null || pageStartOffsets.isEmpty()) {
            return chunks;
        }

        // Enrich each chunk with page number based on start offset
        for (ExtractionResult.ExtractedChunk c : chunks) {
            int page = getPageForOffset(c.getStartOffset(), pageStartOffsets);
            c.setPageNumber(page);
            c.setSourceLabel("Page " + page);
        }

        return chunks;
    }

    private int getPageForOffset(int offset, List<Integer> pageStartOffsets) {
        int page = 1;
        for (int i = 0; i < pageStartOffsets.size(); i++) {
            if (offset >= pageStartOffsets.get(i)) {
                page = i + 1;
            } else {
                break;
            }
        }
        return page;
    }

    private int findLastParagraphBreak(String text, int from, int to) {

        int search = Math.min(to, from + MAX_CHUNK_SIZE);
        int idx = text.lastIndexOf("\n\n", search);
        if (idx > from) {
            return idx + 2;
        }
        return -1;
    }

    private int findLastSentenceBreak(String text, int from, int to) {
        for (int i = Math.min(to, from + MAX_CHUNK_SIZE) - 1; i > from; i--) {
            char c = text.charAt(i);
            if ((c == '.' || c == '!' || c == '?') && i + 1 < text.length()) {
                char next = text.charAt(i + 1);
                if (next == ' ' || next == '\n') {
                    return i + 1;
                }
            }
        }
        return -1;
    }

    private int findLastSpace(String text, int from, int to) {
        for (int i = Math.min(to, from + MAX_CHUNK_SIZE) - 1; i > from; i--) {
            if (Character.isWhitespace(text.charAt(i))) {
                return i;
            }
        }
        return -1;
    }
}
