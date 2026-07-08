package com.demo.ai_study_hub.controller;

import com.demo.ai_study_hub.dto.ApiResponse;
import com.demo.ai_study_hub.dto.SummaryDtos.*;
import com.demo.ai_study_hub.service.SummaryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiSummaryController {

    private final SummaryService summaryService;

    @PostMapping("/documents/{documentId}/summaries/generate")
    public ResponseEntity<ApiResponse<SummaryResponse>> generate(
            @PathVariable Integer documentId,
            @RequestBody(required = false) GenerateSummaryRequest request,
            Principal principal) {
        SummaryResponse response = summaryService.generate(documentId, principal.getName());
        return ResponseEntity.ok(ApiResponse.success(response, "Summary generated successfully"));
    }

    @GetMapping("/documents/{documentId}/summaries/latest")
    public ResponseEntity<ApiResponse<SummaryResponse>> getLatest(
            @PathVariable Integer documentId, Principal principal) {
        SummaryResponse response = summaryService.getLatest(documentId, principal.getName());
        return ResponseEntity.ok(ApiResponse.success(response, "Latest summary retrieved successfully"));
    }

    @GetMapping("/documents/{documentId}/summaries")
    public ResponseEntity<ApiResponse<List<SummaryHistoryItemResponse>>> getHistory(
            @PathVariable Integer documentId, Principal principal) {
        List<SummaryHistoryItemResponse> response = summaryService.getHistory(documentId, principal.getName());
        return ResponseEntity.ok(ApiResponse.success(response, "Summaries history retrieved successfully"));
    }
}