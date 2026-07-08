package com.demo.ai_study_hub.controller;

import com.demo.ai_study_hub.dto.ApiResponse;
import com.demo.ai_study_hub.dto.FlashcardDtos.*;
import com.demo.ai_study_hub.service.FlashcardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiFlashcardController {

    private final FlashcardService flashcardService;

    @PostMapping("/documents/{documentId}/flashcard-sets/generate")
    public ResponseEntity<ApiResponse<FlashcardSetResponse>> generate(
            @PathVariable Integer documentId,
            @RequestBody(required = false) GenerateFlashcardRequest request,
            Principal principal) {
        GenerateFlashcardRequest req = request != null ? request : new GenerateFlashcardRequest();
        FlashcardSetResponse response = flashcardService.generate(documentId, req, principal.getName());
        return ResponseEntity.ok(ApiResponse.success(response, "Flashcard set generated successfully"));
    }

    @GetMapping("/documents/{documentId}/flashcard-sets")
    public ResponseEntity<ApiResponse<List<FlashcardSetListItemResponse>>> list(
            @PathVariable Integer documentId, Principal principal) {
        List<FlashcardSetListItemResponse> response = flashcardService.list(documentId, principal.getName());
        return ResponseEntity.ok(ApiResponse.success(response, "Flashcard sets retrieved successfully"));
    }

    @GetMapping("/flashcard-sets/{setId}")
    public ResponseEntity<ApiResponse<FlashcardSetResponse>> getDetail(
            @PathVariable Long setId, Principal principal) {
        FlashcardSetResponse response = flashcardService.getDetail(setId, principal.getName());
        return ResponseEntity.ok(ApiResponse.success(response, "Flashcard set retrieved successfully"));
    }
}