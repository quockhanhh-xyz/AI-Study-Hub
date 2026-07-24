package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.dto.AiAskResponse;
import com.demo.ai_study_hub.dto.AiChatHistoryResponse;
import com.demo.ai_study_hub.dto.AiUsageSummaryResponse;

/**
 * Main orchestration service for AI Document Chat.
 *
 * Orchestrates the full ask flow:
 *   1. Authenticate user (from Principal)
 *   2. Load document and verify ACTIVE + not in Trash
 *   3. Check processingStatus = COMPLETED and chunks exist
 *   4. Validate question (non-blank, within character limit for tier)
 *   5. Check user view permission
 *   6. Check quota (daily limit by tier)
 *   7. Detect summary intent
 *   8. Retrieve relevant chunks (keyword or first-N)
 *   9. If no context found (and not summary) → return no-context fallback
 *  10. Select model by user tier
 *  11. Build prompt with system rules + context + question
 *  12. Call AI provider via AiProviderRouter
 *  13. Find or create ACTIVE chat session
 *  14. Save user message
 *  15. Save assistant message with token/source data
 *  16. Save usage log (counted_as_question = true, status = SUCCESS)
 *  17. Return AiAskResponse
 *
 * Permission rules enforced by this service:
 *   - Owner: always allowed
 *   - Direct share (ACTIVE): allowed
 *   - Group member with doc access: allowed
 *   - Folder shared user: allowed
 *   - Logged-in public doc viewer: allowed
 *   - Guest: 401
 *   - No permission: 403
 */
public interface AiChatService {

    /**
     * Process an AI ask request.
     *
     * @param documentId Document to ask about
     * @param question   User's question text
     * @param userEmail  Authenticated user's email (from Principal)
     * @return AiAskResponse with answer, sources, token info, remaining quota
     */
    AiAskResponse ask(Integer documentId, String question, String userEmail);

    /**
     * Retrieve chat history for the current user on a document.
     *
     * @param documentId Document ID
     * @param userEmail  Authenticated user's email
     * @return AiChatHistoryResponse with session ID and messages
     */
    AiChatHistoryResponse getChatHistory(Integer documentId, String userEmail);

    /**
     * Soft-delete a chat session.
     * Only the session owner can delete.
     *
     * @param sessionId  Chat session ID to delete
     * @param userEmail  Authenticated user's email
     */
    void deleteChat(Long sessionId, String userEmail);

    /**
     * Get AI usage summary for the current user.
     *
     * @param userEmail Authenticated user's email
     * @return AiUsageSummaryResponse with tier, limits, and today's usage
     */
    AiUsageSummaryResponse getUsageSummary(String userEmail);

    /**
     * Process a global AI ask request across all library documents.
     */
    AiAskResponse askGlobal(String question, String userEmail);

    /**
     * Get global chat history for the user.
     */
    AiChatHistoryResponse getGlobalChatHistory(String userEmail);

    /**
     * Clear / soft-delete the user's active global chat session.
     */
    void deleteGlobalChat(String userEmail);
}
