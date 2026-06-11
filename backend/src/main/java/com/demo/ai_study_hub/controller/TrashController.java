package com.demo.ai_study_hub.controller;

import com.demo.ai_study_hub.dto.ApiResponse;
import com.demo.ai_study_hub.dto.TrashResponse;
import com.demo.ai_study_hub.service.TrashService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class TrashController {

    private final TrashService trashService;

    @GetMapping("/api/trash")
    public ResponseEntity<ApiResponse<TrashResponse>> getTrash(Authentication auth) {
        TrashResponse trash = trashService.getTrash(auth.getName());
        return ResponseEntity.ok(ApiResponse.<TrashResponse>builder()
                .success(true)
                .message("Trash retrieved successfully")
                .data(trash)
                .build());
    }

    @PostMapping("/api/documents/{id}/restore")
    public ResponseEntity<ApiResponse<Void>> restoreDocument(@PathVariable Integer id, Authentication auth) {
        trashService.restoreDocument(id, auth.getName());
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .success(true)
                .message("Document restored successfully")
                .build());
    }

    @DeleteMapping("/api/documents/{id}/permanent")
    public ResponseEntity<ApiResponse<Void>> permanentDeleteDocument(@PathVariable Integer id, Authentication auth) {
        trashService.permanentDeleteDocument(id, auth.getName());
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .success(true)
                .message("Document permanently deleted")
                .build());
    }

    @PostMapping("/api/folders/{id}/restore")
    public ResponseEntity<ApiResponse<Void>> restoreFolder(@PathVariable Integer id, Authentication auth) {
        trashService.restoreFolder(id, auth.getName());
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .success(true)
                .message("Folder restored successfully")
                .build());
    }

    @DeleteMapping("/api/folders/{id}/permanent")
    public ResponseEntity<ApiResponse<Void>> permanentDeleteFolder(@PathVariable Integer id, Authentication auth) {
        trashService.permanentDeleteFolder(id, auth.getName());
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .success(true)
                .message("Folder permanently deleted")
                .build());
    }
}
