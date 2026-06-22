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
public class GroupFolderShareController {

    private final FolderShareService folderShareService;

    @PostMapping("/api/folders/{id}/shares/groups")
    public ResponseEntity<ApiResponse<FolderShareResponse>> shareFolderToGroup(
            @PathVariable Integer id,
            @Valid @RequestBody GroupFolderShareRequest request,
            Principal principal) {
        try {
            FolderShareResponse data = folderShareService.shareFolderToGroup(id, request, principal.getName());
            return ResponseEntity.ok(ApiResponse.success(data, "Folder shared to group successfully"));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(ApiResponse.error(e.getReason()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/api/groups/{id}/folders")
    public ResponseEntity<ApiResponse<List<FolderShareResponse>>> getGroupFolders(
            @PathVariable Integer id,
            Principal principal) {
        try {
            List<FolderShareResponse> data = folderShareService.getGroupFolders(id, principal.getName());
            return ResponseEntity.ok(ApiResponse.success(data, "Group shared folders retrieved successfully"));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(ApiResponse.error(e.getReason()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.error(e.getMessage()));
        }
    }

    @DeleteMapping("/api/group-folder-shares/{shareId}")
    public ResponseEntity<ApiResponse<Void>> revokeGroupFolderShare(
            @PathVariable Integer shareId,
            Principal principal) {
        try {
            folderShareService.revokeGroupFolderShare(shareId, principal.getName());
            return ResponseEntity.ok(ApiResponse.success(null, "Group folder share revoked successfully"));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(ApiResponse.error(e.getReason()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.error(e.getMessage()));
        }
    }
}
