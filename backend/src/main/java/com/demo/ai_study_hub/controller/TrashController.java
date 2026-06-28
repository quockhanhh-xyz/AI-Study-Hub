package com.demo.ai_study_hub.controller;

import com.demo.ai_study_hub.dto.ApiResponse;
import com.demo.ai_study_hub.dto.TrashResponse;
import com.demo.ai_study_hub.service.TrashService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import com.demo.ai_study_hub.dto.EmptyTrashResponse;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/trash")
@RequiredArgsConstructor
public class TrashController {

    private final TrashService trashService;

    @GetMapping
    public ResponseEntity<ApiResponse<TrashResponse>> getTrash(Authentication auth) {
        TrashResponse trash = trashService.getTrash(auth.getName());
        return ResponseEntity.ok(ApiResponse.<TrashResponse>builder()
                .success(true)
                .message("Trash items retrieved successfully")
                .data(trash)
                .build());
    }

    @PostMapping("/documents/{id}/restore")
    public ResponseEntity<ApiResponse<Void>> restoreDocument(@PathVariable Integer id, Authentication auth) {
        trashService.restoreDocument(id, auth.getName());
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .success(true)
                .message("Document restored successfully")
                .build());
    }

    @DeleteMapping("/documents/{id}")
    public ResponseEntity<ApiResponse<Void>> permanentDeleteDocument(@PathVariable Integer id, Authentication auth) {
        trashService.permanentDeleteDocument(id, auth.getName());
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .success(true)
                .message("Document permanently deleted")
                .build());
    }

    @PostMapping("/folders/{id}/restore")
    public ResponseEntity<ApiResponse<Void>> restoreFolder(@PathVariable Integer id, Authentication auth) {
        trashService.restoreFolder(id, auth.getName());
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .success(true)
                .message("Folder restored successfully")
                .build());
    }

    @DeleteMapping("/folders/{id}")
    public ResponseEntity<ApiResponse<Void>> permanentDeleteFolder(@PathVariable Integer id, Authentication auth) {
        trashService.permanentDeleteFolder(id, auth.getName());
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .success(true)
                .message("Folder permanently deleted")
                .build());
    }

    @DeleteMapping("/empty")
    public ResponseEntity<ApiResponse<EmptyTrashResponse>> emptyTrash(Authentication auth) {
        try {
            EmptyTrashResponse data = trashService.emptyTrash(auth.getName());
            String message = "SUCCESS".equals(data.getOutcome())
                ? "Trash emptied successfully"
                : "Trash cleanup completed with some failures";
            return ResponseEntity.ok(ApiResponse.success(data, message));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(ApiResponse.error(e.getReason()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.error(e.getMessage()));
        }
    }
}
