package com.demo.ai_study_hub.controller;

import com.demo.ai_study_hub.dto.ApiResponse;
import com.demo.ai_study_hub.dto.DocumentContentResponse;
import com.demo.ai_study_hub.dto.DocumentProcessingStatusResponse;
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
    public ResponseEntity<ApiResponse<DocumentProcessingStatusResponse>> processDocument(@PathVariable Integer id, Principal principal) {
        try {
            DocumentProcessingStatusResponse data = documentProcessingService.startProcessing(id, principal.getName());
            return ResponseEntity.status(HttpStatus.ACCEPTED)
                    .body(ApiResponse.success(data, "Document processing started"));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(ApiResponse.error(e.getReason()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("An unexpected error occurred. Please try again."));
        }
    }

    @PostMapping("/{id}/reprocess")
    public ResponseEntity<ApiResponse<DocumentProcessingStatusResponse>> reprocessDocument(@PathVariable Integer id, Principal principal) {
        try {
            DocumentProcessingStatusResponse data = documentProcessingService.startReprocessing(id, principal.getName());
            return ResponseEntity.status(HttpStatus.ACCEPTED)
                    .body(ApiResponse.success(data, "Document reprocessing started"));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(ApiResponse.error(e.getReason()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("An unexpected error occurred. Please try again."));
        }
    }

    @GetMapping("/{id}/processing-status")
    public ResponseEntity<ApiResponse<DocumentProcessingStatusResponse>> getProcessingStatus(@PathVariable Integer id, Principal principal) {
        try {
            DocumentProcessingStatusResponse data = documentProcessingService.getProcessingStatus(id, principal.getName());
            return ResponseEntity.ok(ApiResponse.success(data, "Document processing status retrieved"));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(ApiResponse.error(e.getReason()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("An unexpected error occurred. Please try again."));
        }
    }

    @GetMapping("/{id}/content")
    public ResponseEntity<ApiResponse<DocumentContentResponse>> getExtractedContent(@PathVariable Integer id, Principal principal) {
        try {
            DocumentContentResponse data = documentProcessingService.getExtractedContent(id, principal.getName());
            return ResponseEntity.ok(ApiResponse.success(data, "Document extracted content retrieved"));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(ApiResponse.error(e.getReason()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("An unexpected error occurred. Please try again."));
        }
    }
}
