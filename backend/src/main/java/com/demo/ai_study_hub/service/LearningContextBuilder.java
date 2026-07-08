package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.entity.DocumentChunk;
import com.demo.ai_study_hub.repository.DocumentChunkRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class LearningContextBuilder {

    private final DocumentChunkRepository documentChunkRepository;

    /**
     * Builds a limited context string based on user tier and attempt count.
     * If chunks are unavailable, returns null to allow fallback to full text.
     */
    public String buildLimitedContext(Integer documentId, String tier, int attempt) {
        List<DocumentChunk> chunks = documentChunkRepository.findByDocument_DocumentIdOrderByChunkIndexAsc(documentId);
        if (chunks == null || chunks.isEmpty()) {
            return null;
        }

        int maxChunks;
        if (attempt == 1) {
            if ("ULTRA".equalsIgnoreCase(tier)) {
                maxChunks = 15;
            } else if ("PREMIUM".equalsIgnoreCase(tier)) {
                maxChunks = 8;
            } else {
                maxChunks = 3;
            }
        } else {
            // Attempt 2 (fallback with shorter context)
            if ("ULTRA".equalsIgnoreCase(tier)) {
                maxChunks = 5;
            } else if ("PREMIUM".equalsIgnoreCase(tier)) {
                maxChunks = 3;
            } else {
                maxChunks = 1;
            }
        }

        return chunks.stream()
                .limit(maxChunks)
                .map(DocumentChunk::getChunkText)
                .collect(Collectors.joining("\n\n"));
    }
}
