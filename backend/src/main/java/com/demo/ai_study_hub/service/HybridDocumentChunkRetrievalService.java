package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.config.AiProperties;
import com.demo.ai_study_hub.dto.DocumentChunkDto;
import com.demo.ai_study_hub.entity.DocumentChunk;
import com.demo.ai_study_hub.repository.DocumentChunkRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Primary retrieval service. Wraps the original keyword retrieval and, when hybrid mode is
 * enabled, fuses keyword relevance with semantic (embedding) similarity for single-document
 * question answering.
 *
 * Safety-first design:
 *   - strategy=keyword (default)         → pure delegation, byte-for-byte original behavior.
 *   - strategy=hybrid but no embeddings  → automatic fallback to keyword.
 *   - any error during fusion            → automatic fallback to keyword.
 * The public contract ({@link DocumentChunkRetrievalService}) and returned DTO shape are
 * unchanged, so no caller (service, controller, prompt builder, frontend) needs to change.
 */
@Service
@Primary
@RequiredArgsConstructor
@Slf4j
public class HybridDocumentChunkRetrievalService implements DocumentChunkRetrievalService {

    /** Original keyword implementation, injected by concrete type to avoid self-reference. */
    private final DefaultDocumentChunkRetrievalService keywordService;
    private final ChunkEmbeddingService chunkEmbeddingService;
    private final DocumentChunkRepository documentChunkRepository;
    private final AiProperties aiProperties;

    @Override
    public List<DocumentChunkDto> retrieveByKeyword(Integer documentId, String question, int topK) {
        if (!hybridEnabled()) {
            return keywordService.retrieveByKeyword(documentId, question, topK);
        }
        try {
            float[] queryVec = chunkEmbeddingService.embedQuery(question);
            if (queryVec == null) {
                return keywordService.retrieveByKeyword(documentId, question, topK);
            }

            List<DocumentChunk> chunks =
                    documentChunkRepository.findByDocument_DocumentIdOrderByChunkIndexAsc(documentId);
            if (chunks.isEmpty()) {
                return keywordService.retrieveByKeyword(documentId, question, topK);
            }

            // Keyword scores over a larger candidate pool so semantic-only matches can still surface.
            int pool = Math.max(topK, aiProperties.getRetrieval().getCandidatePoolSize());
            Map<Long, Double> keywordScores = new HashMap<>();
            for (DocumentChunkDto dto : keywordService.retrieveByKeyword(documentId, question, pool)) {
                if (dto.getChunkId() != null) {
                    keywordScores.put(dto.getChunkId(), dto.getScore());
                }
            }
            double maxKeyword = keywordScores.values().stream().max(Double::compare).orElse(0.0);
            if (maxKeyword <= 0.0) {
                maxKeyword = 1.0; // avoid division by zero; keyword contribution becomes 0
            }

            double keywordWeight = aiProperties.getRetrieval().getKeywordWeight();
            double embeddingWeight = aiProperties.getRetrieval().getEmbeddingWeight();

            List<ScoredChunk> scored = new ArrayList<>();
            boolean anyEmbedding = false;
            for (DocumentChunk chunk : chunks) {
                float[] vec = chunkEmbeddingService.decode(chunk);
                double cosine = 0.0;
                if (vec != null) {
                    anyEmbedding = true;
                    cosine = Math.max(0.0, VectorSimilarity.cosine(queryVec, vec));
                }
                double keywordNorm = keywordScores.getOrDefault(chunk.getChunkId(), 0.0) / maxKeyword;

                // A chunk is a candidate only if it matched keywords OR has a semantic vector.
                if (vec == null && keywordNorm <= 0.0) {
                    continue;
                }
                double combined = keywordWeight * keywordNorm + embeddingWeight * cosine;
                scored.add(new ScoredChunk(chunk, combined));
            }

            // No chunk had an embedding (e.g. old document not yet backfilled) → keyword fallback.
            if (!anyEmbedding) {
                return keywordService.retrieveByKeyword(documentId, question, topK);
            }

            scored.sort((a, b) -> Double.compare(b.score, a.score));
            List<DocumentChunkDto> result = new ArrayList<>();
            for (int i = 0; i < Math.min(topK, scored.size()); i++) {
                result.add(toDto(scored.get(i).chunk, scored.get(i).score));
            }
            return result;
        } catch (Exception e) {
            log.warn("Hybrid retrieval failed for documentId={}, falling back to keyword. reason={}",
                    documentId, e.getMessage());
            return keywordService.retrieveByKeyword(documentId, question, topK);
        }
    }

    @Override
    public List<DocumentChunkDto> retrieveFirstChunks(Integer documentId, int topK) {
        // Summary intent uses the first N chunks by design; embeddings add nothing here.
        return keywordService.retrieveFirstChunks(documentId, topK);
    }

    @Override
    public List<DocumentChunkDto> retrieveGlobalChunksByKeyword(Integer userId, String question, int topK) {
        if (!hybridEnabled()) {
            return keywordService.retrieveGlobalChunksByKeyword(userId, question, topK);
        }
        try {
            float[] queryVec = chunkEmbeddingService.embedQuery(question);
            if (queryVec == null) {
                return keywordService.retrieveGlobalChunksByKeyword(userId, question, topK);
            }

            // Hard cap keeps the semantic scan bounded regardless of library/community size.
            int cap = Math.max(topK, aiProperties.getRetrieval().getCandidatePoolSize());

            // Semantic candidate pool (access-controlled, NOT keyword-filtered).
            List<DocumentChunk> candidates = keywordService.findGlobalCandidateChunks(userId, cap);

            // Keyword candidates (same bound). Ensures hybrid is never worse than keyword: any
            // keyword match missing from the semantic pool is merged back in below.
            List<DocumentChunkDto> keywordDtos = keywordService.retrieveGlobalChunksByKeyword(userId, question, cap);

            Map<Long, DocumentChunk> byId = new LinkedHashMap<>();
            for (DocumentChunk c : candidates) {
                if (c.getChunkId() != null) {
                    byId.put(c.getChunkId(), c);
                }
            }
            Map<Long, Double> keywordScores = new HashMap<>();
            List<Long> missingIds = new ArrayList<>();
            for (DocumentChunkDto dto : keywordDtos) {
                if (dto.getChunkId() == null) {
                    continue;
                }
                keywordScores.put(dto.getChunkId(), dto.getScore());
                if (!byId.containsKey(dto.getChunkId())) {
                    missingIds.add(dto.getChunkId());
                }
            }
            if (!missingIds.isEmpty()) {
                for (DocumentChunk c : documentChunkRepository.findAllById(missingIds)) {
                    if (c.getChunkId() != null) {
                        byId.put(c.getChunkId(), c);
                    }
                }
            }

            if (byId.isEmpty()) {
                return keywordService.retrieveGlobalChunksByKeyword(userId, question, topK);
            }

            double maxKeyword = keywordScores.values().stream().max(Double::compare).orElse(0.0);
            if (maxKeyword <= 0.0) {
                maxKeyword = 1.0;
            }
            double keywordWeight = aiProperties.getRetrieval().getKeywordWeight();
            double embeddingWeight = aiProperties.getRetrieval().getEmbeddingWeight();

            List<ScoredChunk> scored = new ArrayList<>();
            boolean anyEmbedding = false;
            for (DocumentChunk chunk : byId.values()) {
                float[] vec = chunkEmbeddingService.decode(chunk);
                double cosine = 0.0;
                if (vec != null) {
                    anyEmbedding = true;
                    cosine = Math.max(0.0, VectorSimilarity.cosine(queryVec, vec));
                }
                double keywordNorm = keywordScores.getOrDefault(chunk.getChunkId(), 0.0) / maxKeyword;
                if (vec == null && keywordNorm <= 0.0) {
                    continue;
                }
                double combined = keywordWeight * keywordNorm + embeddingWeight * cosine;
                scored.add(new ScoredChunk(chunk, combined));
            }

            // No embeddings available anywhere → nothing semantic to add, use keyword result as-is.
            if (!anyEmbedding) {
                return keywordService.retrieveGlobalChunksByKeyword(userId, question, topK);
            }

            scored.sort((a, b) -> Double.compare(b.score, a.score));
            List<DocumentChunkDto> result = new ArrayList<>();
            for (int i = 0; i < Math.min(topK, scored.size()); i++) {
                result.add(keywordService.buildGlobalDto(scored.get(i).chunk, scored.get(i).score, userId));
            }
            return result;
        } catch (Exception e) {
            log.warn("Hybrid global retrieval failed for userId={}, falling back to keyword. reason={}",
                    userId, e.getMessage());
            return keywordService.retrieveGlobalChunksByKeyword(userId, question, topK);
        }
    }

    private boolean hybridEnabled() {
        return "hybrid".equalsIgnoreCase(aiProperties.getRetrieval().getStrategy());
    }

    private DocumentChunkDto toDto(DocumentChunk chunk, double score) {
        return DocumentChunkDto.builder()
                .chunkId(chunk.getChunkId())
                .chunkIndex(chunk.getChunkIndex())
                .chunkText(chunk.getChunkText())
                .pageNumber(chunk.getPageNumber())
                .sourceLabel(chunk.getSourceLabel() != null
                        ? chunk.getSourceLabel()
                        : "Chunk " + (chunk.getChunkIndex() + 1))
                .documentId(chunk.getDocument() != null ? chunk.getDocument().getDocumentId() : null)
                .documentTitle(chunk.getDocument() != null ? chunk.getDocument().getTitle() : null)
                .score(score)
                .build();
    }

    private static final class ScoredChunk {
        final DocumentChunk chunk;
        final double score;

        ScoredChunk(DocumentChunk chunk, double score) {
            this.chunk = chunk;
            this.score = score;
        }
    }
}
