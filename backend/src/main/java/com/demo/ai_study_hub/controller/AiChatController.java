package com.demo.ai_study_hub.controller;

import com.demo.ai_study_hub.dto.*;
import com.demo.ai_study_hub.service.AiChatService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

/**
 * Controller for AI Document Chat endpoints (Step 10).
 *
 * All endpoints require authentication (no guest access).
 * Permission checks are enforced in AiChatService, not here.
 *
 * Endpoints:
 *   POST   /api/ai/documents/{documentId}/ask    - Ask AI a question
 *   GET    /api/ai/documents/{documentId}/chats  - Get chat history
 *   DELETE /api/ai/chats/{chatId}                - Delete chat session
 *   GET    /api/ai/usage/me                      - Get my AI usage stats
 */
@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiChatController {

    private final AiChatService aiChatService;

    /**
     * POST /api/ai/documents/{documentId}/ask
     *
     * Ask the AI a question about a specific document.
     * Returns 200 with answer (may be no-context fallback).
     * Returns 4xx/5xx on permission/quota/config failures.
     */
    @PostMapping("/documents/{documentId}/ask")
    public ResponseEntity<ApiResponse<AiAskResponse>> ask(
            @PathVariable Integer documentId,
            @Valid @RequestBody AiAskRequest request,
            Principal principal
    ) {
        AiAskResponse response = aiChatService.ask(documentId, request.getQuestion(), principal.getName());
        return ResponseEntity.ok(ApiResponse.success(response, "AI answer generated successfully"));
    }

    /**
     * GET /api/ai/documents/{documentId}/chats
     *
     * Retrieve chat history for the current user on a document.
     * Returns empty messages if no active session exists.
     */
    @GetMapping("/documents/{documentId}/chats")
    public ResponseEntity<ApiResponse<AiChatHistoryResponse>> getChatHistory(
            @PathVariable Integer documentId,
            Principal principal
    ) {
        AiChatHistoryResponse response = aiChatService.getChatHistory(documentId, principal.getName());
        return ResponseEntity.ok(ApiResponse.success(response, "Chat history retrieved successfully"));
    }

    /**
     * DELETE /api/ai/chats/{chatId}
     *
     * Soft-delete a chat session. Only the session owner can delete.
     */
    @DeleteMapping("/chats/{chatId}")
    public ResponseEntity<ApiResponse<Void>> deleteChat(
            @PathVariable Long chatId,
            Principal principal
    ) {
        aiChatService.deleteChat(chatId, principal.getName());
        return ResponseEntity.ok(ApiResponse.success(null, "Chat session deleted successfully"));
    }

    /**
     * GET /api/ai/usage/me
     *
     * Get current user's AI usage statistics and remaining quota for today.
     */
    @GetMapping("/usage/me")
    public ResponseEntity<ApiResponse<AiUsageSummaryResponse>> getMyUsage(
            Principal principal
    ) {
        AiUsageSummaryResponse response = aiChatService.getUsageSummary(principal.getName());
        return ResponseEntity.ok(ApiResponse.success(response, "AI usage retrieved successfully"));
    }

    /**
     * POST /api/ai/global/ask
     *
     * Ask the central Study Assistant a question across all documents.
     */
    @PostMapping("/global/ask")
    public ResponseEntity<ApiResponse<AiAskResponse>> askGlobal(
            @Valid @RequestBody AiAskRequest request,
            Principal principal
    ) {
        AiAskResponse response = aiChatService.askGlobal(request.getQuestion(), principal.getName());
        return ResponseEntity.ok(ApiResponse.success(response, "AI global answer generated successfully"));
    }

    /**
     * GET /api/ai/global/chats
     *
     * Retrieve the global chat session messages for the current user.
     */
    @GetMapping("/global/chats")
    public ResponseEntity<ApiResponse<AiChatHistoryResponse>> getGlobalChatHistory(
            Principal principal
    ) {
        AiChatHistoryResponse response = aiChatService.getGlobalChatHistory(principal.getName());
        return ResponseEntity.ok(ApiResponse.success(response, "Global chat history retrieved successfully"));
    }

    /**
     * DELETE /api/ai/global/chats
     *
     * Reset/clear the user's active global chat session.
     */
    @DeleteMapping("/global/chats")
    public ResponseEntity<ApiResponse<Void>> deleteGlobalChat(
            Principal principal
    ) {
        aiChatService.deleteGlobalChat(principal.getName());
        return ResponseEntity.ok(ApiResponse.success(null, "Global chat session cleared successfully"));
    }
}
