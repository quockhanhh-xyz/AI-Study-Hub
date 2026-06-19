package com.demo.ai_study_hub.controller;

import com.demo.ai_study_hub.dto.*;
import com.demo.ai_study_hub.service.SharingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.security.Principal;
import java.util.List;

@RestController
@RequiredArgsConstructor
public class SharingController {

    private final SharingService sharingService;

    @PostMapping("/api/documents/{id}/shares/users")
    public ResponseEntity<ApiResponse<DocumentShareResponse>> shareDocumentDirect(
            @PathVariable Integer id,
            @RequestBody DocumentShareRequest request,
            Principal principal
    ) {
        try {
            DocumentShareResponse data = sharingService.shareDocumentDirect(id, request, principal.getName());
            return ResponseEntity.ok(ApiResponse.success(data, "Document shared successfully"));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(ApiResponse.error(e.getReason()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/api/documents/shared-with-me")
    public ResponseEntity<ApiResponse<List<DocumentShareResponse>>> getSharedWithMe(Principal principal) {
        try {
            List<DocumentShareResponse> data = sharingService.getSharedWithMe(principal.getName());
            return ResponseEntity.ok(ApiResponse.success(data, "Shared documents retrieved successfully"));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(ApiResponse.error(e.getReason()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/api/documents/{id}/shares")
    public ResponseEntity<ApiResponse<List<DocumentShareResponse>>> getDocumentShares(
            @PathVariable Integer id,
            Principal principal
    ) {
        try {
            List<DocumentShareResponse> data = sharingService.getDocumentShares(id, principal.getName());
            return ResponseEntity.ok(ApiResponse.success(data, "Share records retrieved successfully"));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(ApiResponse.error(e.getReason()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.error(e.getMessage()));
        }
    }

    @DeleteMapping("/api/document-shares/{shareId}")
    public ResponseEntity<ApiResponse<Void>> revokeDirectShare(
            @PathVariable Integer shareId,
            Principal principal
    ) {
        try {
            sharingService.revokeDirectShare(shareId, principal.getName());
            return ResponseEntity.ok(ApiResponse.success(null, "Share revoked successfully"));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(ApiResponse.error(e.getReason()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.error(e.getMessage()));
        }
    }

    @PostMapping("/api/documents/{id}/shares/groups")
    public ResponseEntity<ApiResponse<GroupDocumentShareResponse>> shareDocumentToGroup(
            @PathVariable Integer id,
            @RequestBody GroupDocumentShareRequest request,
            Principal principal
    ) {
        try {
            GroupDocumentShareResponse data = sharingService.shareDocumentToGroup(id, request, principal.getName());
            return ResponseEntity.ok(ApiResponse.success(data, "Document shared to group successfully"));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(ApiResponse.error(e.getReason()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/api/groups/{id}/documents")
    public ResponseEntity<ApiResponse<List<GroupDocumentShareResponse>>> getGroupDocuments(
            @PathVariable Integer id,
            Principal principal
    ) {
        try {
            List<GroupDocumentShareResponse> data = sharingService.getGroupDocuments(id, principal.getName());
            return ResponseEntity.ok(ApiResponse.success(data, "Group documents retrieved successfully"));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(ApiResponse.error(e.getReason()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.error(e.getMessage()));
        }
    }

    @DeleteMapping("/api/group-document-shares/{shareId}")
    public ResponseEntity<ApiResponse<Void>> revokeGroupShare(
            @PathVariable Integer shareId,
            Principal principal
    ) {
        try {
            sharingService.revokeGroupShare(shareId, principal.getName());
            return ResponseEntity.ok(ApiResponse.success(null, "Group share revoked successfully"));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(ApiResponse.error(e.getReason()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.error(e.getMessage()));
        }
    }
}
