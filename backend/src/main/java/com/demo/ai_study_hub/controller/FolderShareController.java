package com.demo.ai_study_hub.controller;

import com.demo.ai_study_hub.dto.*;
import com.demo.ai_study_hub.service.FolderShareService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.security.Principal;
import java.util.List;

@RestController
@RequiredArgsConstructor
public class FolderShareController {

    private final FolderShareService folderShareService;

    @PostMapping("/api/folders/{id}/shares/users")
    public ResponseEntity<ApiResponse<FolderShareResponse>> shareFolderToUser(
            @PathVariable Integer id,
            @Valid @RequestBody ShareFolderRequest request,
            Principal principal) {
        try {
            FolderShareResponse data = folderShareService.shareFolderToUser(id, request, principal.getName());
            return ResponseEntity.ok(ApiResponse.success(data, "Folder shared successfully"));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(ApiResponse.error(e.getReason()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/api/folders/shared-with-me")
    public ResponseEntity<ApiResponse<List<FolderShareResponse>>> getSharedWithMe(Principal principal) {
        try {
            List<FolderShareResponse> data = folderShareService.getSharedWithMe(principal.getName());
            return ResponseEntity.ok(ApiResponse.success(data, "Shared folders retrieved successfully"));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(ApiResponse.error(e.getReason()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/api/folders/{id}/shares")
    public ResponseEntity<ApiResponse<FolderSharesListResponse>> getFolderShares(
            @PathVariable Integer id,
            Principal principal) {
        try {
            FolderSharesListResponse data = folderShareService.getFolderShares(id, principal.getName());
            return ResponseEntity.ok(ApiResponse.success(data, "Folder shares retrieved successfully"));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(ApiResponse.error(e.getReason()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.error(e.getMessage()));
        }
    }

    @DeleteMapping("/api/folder-shares/{shareId}")
    public ResponseEntity<ApiResponse<Void>> revokeFolderShare(
            @PathVariable Integer shareId,
            Principal principal) {
        try {
            folderShareService.revokeFolderShare(shareId, principal.getName());
            return ResponseEntity.ok(ApiResponse.success(null, "Folder share revoked successfully"));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(ApiResponse.error(e.getReason()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/api/folders/{id}/shared-content")
    public ResponseEntity<ApiResponse<SharedFolderContentResponse>> getSharedContent(
            @PathVariable Integer id,
            Principal principal) {
        try {
            SharedFolderContentResponse data = folderShareService.getSharedContent(id, principal.getName());
            return ResponseEntity.ok(ApiResponse.success(data, "Shared folder content retrieved successfully"));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(ApiResponse.error(e.getReason()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.error(e.getMessage()));
        }
    }
}
