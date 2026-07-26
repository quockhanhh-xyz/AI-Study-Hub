package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.config.AiProperties;
import com.demo.ai_study_hub.entity.DocumentChunk;
import com.demo.ai_study_hub.repository.DocumentChunkRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/**
 * Generates, stores and reads semantic embeddings for document chunks.
 *
 * Everything here is best-effort: if the embedding provider is unavailable or a call fails,
 * chunks simply keep a null embedding and hybrid retrieval falls back to keyword scoring.
 * No method throws for provider/embedding problems.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ChunkEmbeddingService {

    private final EmbeddingService embeddingService;
    private final DocumentChunkRepository documentChunkRepository;
    private final AiProperties aiProperties;
    private final ObjectMapper objectMapper;

    /**
     * Ensure every chunk of a document has an up-to-date embedding. Called after a document
     * finishes processing (and is safe to call again for backfill). Never throws.
     */
    public void generateForDocument(Integer documentId) {
        if (!embeddingService.isAvailable()) {
            return;
        }
        try {
            List<DocumentChunk> chunks =
                    documentChunkRepository.findByDocument_DocumentIdOrderByChunkIndexAsc(documentId);
            String model = embeddingService.getModelName();

            List<DocumentChunk> pending = new ArrayList<>();
            for (DocumentChunk chunk : chunks) {
                if (needsEmbedding(chunk, model)) {
                    pending.add(chunk);
                }
            }
            if (pending.isEmpty()) {
                return;
            }

            int batchSize = Math.max(1, aiProperties.getRetrieval().getEmbeddingBatchSize());
            List<DocumentChunk> updated = new ArrayList<>();
            for (int start = 0; start < pending.size(); start += batchSize) {
                List<DocumentChunk> batch = pending.subList(start, Math.min(start + batchSize, pending.size()));
                List<String> texts = batch.stream().map(DocumentChunk::getChunkText).toList();
                List<float[]> vectors = embeddingService.embedBatch(texts);
                if (vectors == null || vectors.size() != batch.size()) {
                    // Provider failure or misaligned response: skip this batch, keep keyword fallback.
                    continue;
                }
                for (int i = 0; i < batch.size(); i++) {
                    float[] vec = vectors.get(i);
                    if (vec == null) {
                        continue;
                    }
                    DocumentChunk chunk = batch.get(i);
                    chunk.setEmbedding(encode(vec));
                    chunk.setEmbeddingModel(model);
                    updated.add(chunk);
                }
            }

            if (!updated.isEmpty()) {
                documentChunkRepository.saveAll(updated);
                log.info("Generated embeddings for {}/{} chunks of documentId={}",
                        updated.size(), pending.size(), documentId);
            }
        } catch (Exception e) {
            // Best-effort: embeddings are an optimization, never fail document processing.
            log.warn("Embedding generation skipped for documentId={} due to error: {}", documentId, e.getMessage());
        }
    }

    /** Embed a user question. Returns null when unavailable or on failure. */
    public float[] embedQuery(String question) {
        if (!embeddingService.isAvailable()) {
            return null;
        }
        return embeddingService.embed(question);
    }

    /** Decode a chunk's stored embedding into a vector, or null if absent/invalid. */
    public float[] decode(DocumentChunk chunk) {
        if (chunk == null) {
            return null;
        }
        String json = chunk.getEmbedding();
        if (json == null || json.isBlank()) {
            return null;
        }
        try {
            return objectMapper.readValue(json, float[].class);
        } catch (Exception e) {
            return null;
        }
    }

    private boolean needsEmbedding(DocumentChunk chunk, String model) {
        if (chunk.getChunkText() == null || chunk.getChunkText().isBlank()) {
            return false;
        }
        return chunk.getEmbedding() == null
                || chunk.getEmbedding().isBlank()
                || !model.equals(chunk.getEmbeddingModel());
    }

    private String encode(float[] vec) {
        try {
            return objectMapper.writeValueAsString(vec);
        } catch (Exception e) {
            return null;
        }
    }
}
