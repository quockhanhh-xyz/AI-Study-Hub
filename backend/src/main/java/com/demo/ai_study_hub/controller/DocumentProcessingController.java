package com.demo.ai_study_hub.controller;

import com.demo.ai_study_hub.dto.ApiResponse;
import com.demo.ai_study_hub.dto.DocumentResponse;
import com.demo.ai_study_hub.service.DocumentProcessingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.security.Principal;

@RestController
@RequestMapping("/api/documents")
@RequiredArgsConstructor
public class DocumentProcessingController {

    private final DocumentProcessingService documentProcessingService;

    @PostMapping("/{id}/process")
    public ResponseEntity<ApiResponse<DocumentResponse>> processDocument(@PathVariable Integer id, Principal principal) {
        try {
            DocumentResponse data = documentProcessingService.startProcessing(id, principal.getName());
            return ResponseEntity.status(HttpStatus.ACCEPTED)
                    .body(ApiResponse.success(data, "Document processing started"));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(ApiResponse.error(e.getReason()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.error(e.getMessage()));
        }
    }

    @PostMapping("/{id}/reprocess")
    public ResponseEntity<ApiResponse<DocumentResponse>> reprocessDocument(@PathVariable Integer id, Principal principal) {
        try {
            DocumentResponse data = documentProcessingService.startReprocessing(id, principal.getName());
            return ResponseEntity.status(HttpStatus.ACCEPTED)
                    .body(ApiResponse.success(data, "Document reprocessing started"));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(ApiResponse.error(e.getReason()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/{id}/processing-status")
    public ResponseEntity<ApiResponse<DocumentResponse>> getProcessingStatus(@PathVariable Integer id, Principal principal) {
        try {
            DocumentResponse data = documentProcessingService.getProcessingStatus(id, principal.getName());
            return ResponseEntity.ok(ApiResponse.success(data, "Document processing status retrieved"));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(ApiResponse.error(e.getReason()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/{id}/content")
    public ResponseEntity<ApiResponse<String>> getExtractedContent(@PathVariable Integer id, Principal principal) {
        try {
            String content = documentProcessingService.getExtractedContent(id, principal.getName());
            return ResponseEntity.ok(ApiResponse.success(content, "Document extracted content retrieved"));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(ApiResponse.error(e.getReason()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.error(e.getMessage()));
        }
    }
}
