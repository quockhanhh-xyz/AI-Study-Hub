package com.demo.ai_study_hub.service;

/**
 * Detects whether a user's question is a "summary intent" question.
 *
 * Summary intent questions are general/overview questions like:
 *   - "Summarize this document"
 *   - "Give me an overview"
 *   - "What are the key points?"
 *   - "Explain this document"
 *   - "What is this document about?"
 *
 * When summary intent is detected, DocumentChunkRetrievalService.retrieveFirstChunks()
 * is used instead of keyword scoring, to ensure general questions always get context.
 */
public interface SummaryIntentDetector {

    /**
     * Returns true if the question is a summary/overview intent.
     *
     * @param question The user's question (raw, not normalized)
     * @return true if summary intent detected
     */
    boolean isSummaryIntent(String question);
}
