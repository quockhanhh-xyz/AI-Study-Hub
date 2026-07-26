package com.demo.ai_study_hub.service;

import java.util.List;

/**
 * Produces semantic embedding vectors for text, used by hybrid context retrieval.
 *
 * Design rules:
 *   - Best-effort: implementations must NEVER throw. They return {@code null} (or a list
 *     with null entries) on any failure so that retrieval can fall back to keyword scoring.
 *   - {@link #isAvailable()} reports whether a real embedding backend is configured. When it
 *     returns false, callers must not attempt to embed and must use keyword-only retrieval.
 *   - Never log API keys or raw provider errors.
 */
public interface EmbeddingService {

    /** True when a usable embedding backend is configured (e.g. provider=gemini + API key). */
    boolean isAvailable();

    /** Identifier of the embedding model in use (e.g. "text-embedding-004"), or "none". */
    String getModelName();

    /**
     * Embed a single text.
     *
     * @return the embedding vector, or {@code null} if unavailable or the call failed.
     */
    float[] embed(String text);

    /**
     * Embed several texts in one call where possible.
     *
     * @return a list aligned by index with {@code texts}; individual entries may be
     *         {@code null} on partial failure. Returns an empty list on total failure.
     */
    List<float[]> embedBatch(List<String> texts);
}
