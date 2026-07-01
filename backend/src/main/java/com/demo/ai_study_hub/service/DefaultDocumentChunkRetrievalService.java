package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.dto.DocumentChunkDto;
import com.demo.ai_study_hub.repository.DocumentChunkRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Default implementation of DocumentChunkRetrievalService.
 *
 * Strategy 1 - Keyword retrieval:
 *   - Normalize question: lowercase, remove punctuation, split into words
 *   - Remove common stop words
 *   - Score each chunk by total keyword frequency
 *   - Return top-N chunks with score > 0
 *
 * Strategy 2 - Summary/first-N retrieval:
 *   - Return first N chunks by chunk_index
 *
 * BE2 may enhance this with TF-IDF scoring or embedding-based retrieval.
 */
@Service
@RequiredArgsConstructor
public class DefaultDocumentChunkRetrievalService implements DocumentChunkRetrievalService {

    private final DocumentChunkRepository documentChunkRepository;

    private static final Set<String> STOP_WORDS = new HashSet<>(Arrays.asList(
            "a", "an", "the", "is", "it", "in", "on", "at", "to", "for",
            "of", "and", "or", "but", "this", "that", "be", "are", "was",
            "were", "has", "have", "had", "do", "does", "did", "with",
            "from", "by", "as", "into", "than", "then", "so", "if", "not",
            "no", "can", "will", "would", "could", "should", "may", "might",
            "i", "you", "we", "they", "he", "she", "me", "us", "them",
            "my", "your", "our", "their", "its", "about", "what", "how",
            "when", "where", "who", "which", "there", "here", "been"
    ));

    private static final Pattern NON_ALPHA = Pattern.compile("[^a-zA-Z0-9\\s]");

    @Override
    public List<DocumentChunkDto> retrieveByKeyword(Integer documentId, String question, int topK) {
        List<com.demo.ai_study_hub.entity.DocumentChunk> allChunks =
                documentChunkRepository.findByDocument_DocumentIdOrderByChunkIndexAsc(documentId);

        if (allChunks.isEmpty()) return Collections.emptyList();

        Set<String> keywords = extractKeywords(question);
        if (keywords.isEmpty()) return Collections.emptyList();

        // Score each chunk
        List<Map.Entry<com.demo.ai_study_hub.entity.DocumentChunk, Double>> scored = new ArrayList<>();
        for (com.demo.ai_study_hub.entity.DocumentChunk chunk : allChunks) {
            double score = scoreChunk(chunk.getChunkText(), keywords);
            if (score > 0) {
                scored.add(Map.entry(chunk, score));
            }
        }

        // Sort by score desc, take top-K
        return scored.stream()
                .sorted(Map.Entry.<com.demo.ai_study_hub.entity.DocumentChunk, Double>comparingByValue()
                        .reversed())
                .limit(topK)
                .map(e -> toDto(e.getKey(), e.getValue()))
                .collect(Collectors.toList());
    }

    @Override
    public List<DocumentChunkDto> retrieveFirstChunks(Integer documentId, int topK) {
        return documentChunkRepository
                .findByDocument_DocumentIdOrderByChunkIndexAsc(documentId)
                .stream()
                .limit(topK)
                .map(chunk -> toDto(chunk, 0.0))
                .collect(Collectors.toList());
    }

    // --- Private helpers ---

    private Set<String> extractKeywords(String question) {
        if (question == null || question.isBlank()) return Collections.emptySet();
        String normalized = NON_ALPHA.matcher(question.toLowerCase()).replaceAll(" ");
        return Arrays.stream(normalized.split("\\s+"))
                .filter(w -> w.length() > 2 && !STOP_WORDS.contains(w))
                .collect(Collectors.toSet());
    }

    private double scoreChunk(String chunkText, Set<String> keywords) {
        if (chunkText == null || chunkText.isBlank()) return 0.0;
        String lower = chunkText.toLowerCase();
        double score = 0.0;
        for (String keyword : keywords) {
            int count = 0;
            int idx = 0;
            while ((idx = lower.indexOf(keyword, idx)) != -1) {
                count++;
                idx += keyword.length();
            }
            score += count;
        }
        return score;
    }

    private DocumentChunkDto toDto(com.demo.ai_study_hub.entity.DocumentChunk chunk, double score) {
        return DocumentChunkDto.builder()
                .chunkId(chunk.getChunkId())
                .chunkIndex(chunk.getChunkIndex())
                .chunkText(chunk.getChunkText())
                .pageNumber(chunk.getPageNumber())
                .sourceLabel(chunk.getSourceLabel() != null ? chunk.getSourceLabel()
                        : "Chunk " + (chunk.getChunkIndex() + 1))
                .score(score)
                .build();
    }
}
