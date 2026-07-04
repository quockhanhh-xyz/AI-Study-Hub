package com.demo.ai_study_hub.controller;

import com.demo.ai_study_hub.dto.*;
import com.demo.ai_study_hub.service.GroupChatService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/groups")
@RequiredArgsConstructor
public class GroupChatController {

    private final GroupChatService groupChatService;

    /**
     * GET /api/groups/{groupId}/messages?limit=50&afterMessageId=123
     */
    @GetMapping("/{groupId}/messages")
    public ResponseEntity<ApiResponse<List<GroupChatMessageResponse>>> getMessages(
            @PathVariable Integer groupId,
            @RequestParam(required = false) Integer limit,
            @RequestParam(required = false) Long afterMessageId,
            Principal principal) {
        try {
            List<GroupChatMessageResponse> messages = groupChatService
                    .getMessages(groupId, limit, afterMessageId, principal.getName());
            return ResponseEntity.ok(ApiResponse.success(messages,
                    "Group messages retrieved successfully"));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode())
                    .body(ApiResponse.error(e.getReason()));
        }
    }

    /**
     * POST /api/groups/{groupId}/messages
     */
    @PostMapping("/{groupId}/messages")
    public ResponseEntity<ApiResponse<GroupChatMessageResponse>> sendMessage(
            @PathVariable Integer groupId,
            @Valid @RequestBody SendGroupMessageRequest request,
            Principal principal) {
        try {
            GroupChatMessageResponse response = groupChatService
                    .sendMessage(groupId, request.getContent(), principal.getName());
            return ResponseEntity.ok(ApiResponse.success(response,
                    "Message sent successfully"));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode())
                    .body(ApiResponse.error(e.getReason()));
        }
    }
}
