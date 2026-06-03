package com.demo.ai_study_hub.controller;

import com.demo.ai_study_hub.dto.DocumentResponse;
import com.demo.ai_study_hub.service.DocumentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.security.Principal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/documents")
@RequiredArgsConstructor
public class DocumentController {

    private final DocumentService documentService;

    @PostMapping(value = "/upload", consumes = {"multipart/form-data"})
    public ResponseEntity<?> uploadDocument(
            @RequestParam("file") MultipartFile file,
            @RequestParam("title") String title,
            @RequestParam(value = "description", required = false) String description,
            Principal principal
    ) {
        try {
            String email = principal.getName();
            DocumentResponse data = documentService.uploadDocument(file, title, description, email);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Document uploaded successfully");
            response.put("data", data);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Upload failed: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    @GetMapping("/my")
    public ResponseEntity<?> getMyDocuments(Principal principal) {
        try {
            String email = principal.getName();
            List<DocumentResponse> data = documentService.getMyDocuments(email);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Documents retrieved successfully");
            response.put("data", data);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Failed to retrieve documents: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }
}