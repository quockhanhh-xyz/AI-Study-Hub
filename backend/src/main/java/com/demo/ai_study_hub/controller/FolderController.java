package com.demo.ai_study_hub.controller;

import com.demo.ai_study_hub.dto.ApiResponse;
import com.demo.ai_study_hub.dto.FolderRequest;
import com.demo.ai_study_hub.dto.FolderResponse;
import com.demo.ai_study_hub.service.FolderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/folders")
@RequiredArgsConstructor
public class FolderController {

    private final FolderService folderService;

    @PostMapping
    public ResponseEntity<ApiResponse<FolderResponse>> createFolder(
            @Valid @RequestBody FolderRequest request,
            Principal principal) {
        try {
            FolderResponse data = folderService.createFolder(request, principal.getName());
            return ResponseEntity.ok(ApiResponse.success(data, "Folder created successfully"));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(ApiResponse.error(e.getReason()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/my")
    public ResponseEntity<ApiResponse<List<FolderResponse>>> getMyFolders(
            @RequestParam(required = false) Integer parentFolderId,
            Principal principal) {
        try {
            List<FolderResponse> data = folderService.getMyFolders(parentFolderId, principal.getName());
            return ResponseEntity.ok(ApiResponse.success(data, "Folders retrieved successfully"));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(ApiResponse.error(e.getReason()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<FolderResponse>> getFolderDetail(
            @PathVariable Integer id,
            Principal principal) {
        try {
            FolderResponse data = folderService.getFolderDetail(id, principal.getName());
            return ResponseEntity.ok(ApiResponse.success(data, "Folder retrieved successfully"));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(ApiResponse.error(e.getReason()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.error(e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<FolderResponse>> updateFolder(
            @PathVariable Integer id,
            @Valid @RequestBody FolderRequest request,
            Principal principal) {
        try {
            FolderResponse data = folderService.updateFolder(id, request, principal.getName());
            return ResponseEntity.ok(ApiResponse.success(data, "Folder updated successfully"));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(ApiResponse.error(e.getReason()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.error(e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteFolder(
            @PathVariable Integer id,
            Principal principal) {
        try {
            folderService.deleteFolder(id, principal.getName());
            return ResponseEntity.ok(ApiResponse.success(null, "Folder deleted successfully"));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(ApiResponse.error(e.getReason()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.error(e.getMessage()));
        }
    }
}
