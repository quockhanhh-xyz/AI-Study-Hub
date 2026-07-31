package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.dto.DocumentChunkDto;

import java.util.List;

/**
 * Builds the full prompt sent to the AI provider.
 *
 * The prompt must always include:
 *   1. System rules (prompt injection defense, answer-only-from-context rule)
 *   2. Document context (selected chunks)
 *   3. User question
 *
 * Rules:
 *   - Never omit prompt injection defense rules.
 *   - Treat both document content AND user question as untrusted data.
 *   - Do NOT include system prompt details in API responses.
 */
public interface PromptBuilderService {

    /**
     * Build the full prompt for the AI provider.
     *
     * @param question    The user's question
     * @param chunks      Retrieved document chunks to use as context
     * @param isSummary   True if this is a summary intent question
     *                    (may adjust system instructions for summarization)
     * @return The complete prompt string ready to send to the AI provider
     */
    String buildPrompt(String question, List<DocumentChunkDto> chunks, boolean isSummary);

    /**
     * Build the global chat prompt for the multi-document chatbot.
     */
    String buildGlobalChatPrompt(String question, List<DocumentChunkDto> chunks);
}
