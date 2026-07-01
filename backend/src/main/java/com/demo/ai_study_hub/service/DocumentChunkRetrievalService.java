package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.dto.DocumentChunkDto;

import java.util.List;

/**
 * Retrieves relevant document chunks for AI context based on a user question.
 *
 * Two retrieval strategies:
 *   1. Keyword scoring: Normalizes question, removes punctuation, splits into keywords,
 *      scores each chunk by keyword frequency, returns top N chunks by score.
 *      Used for specific questions.
 *
 *   2. Summary intent retrieval: Returns the first N chunks by chunk_index.
 *      Used when the question is a general/summary intent.
 *
 * BE2 implements the full retrieval logic. This interface provides the contract.
 */
public interface DocumentChunkRetrievalService {

    /**
     * Retrieve relevant chunks using keyword scoring.
     *
     * @param documentId The document to search in
     * @param question   The normalized user question
     * @param topK       Maximum number of chunks to return
     * @return List of chunks sorted by descending relevance score.
     *         Empty list if no chunk scores > 0.
     */
    List<DocumentChunkDto> retrieveByKeyword(Integer documentId, String question, int topK);

    /**
     * Retrieve the first N chunks by chunk_index (for summary intent questions).
     *
     * @param documentId The document to retrieve from
     * @param topK       Number of chunks to return
     * @return First topK chunks ordered by chunk_index ascending
     */
    List<DocumentChunkDto> retrieveFirstChunks(Integer documentId, int topK);
}
