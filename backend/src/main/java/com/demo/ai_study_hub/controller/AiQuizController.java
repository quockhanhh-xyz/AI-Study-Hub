package com.demo.ai_study_hub.controller;

import com.demo.ai_study_hub.dto.ApiResponse;
import com.demo.ai_study_hub.dto.QuizDtos.*;
import com.demo.ai_study_hub.dto.QuizAttemptDtos.*;
import com.demo.ai_study_hub.service.QuizService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiQuizController {

    private final QuizService quizService;

    @PostMapping("/documents/{documentId}/quiz-sets/generate")
    public ResponseEntity<ApiResponse<QuizSetResponse>> generate(
            @PathVariable Integer documentId,
            @RequestBody(required = false) GenerateQuizRequest request,
            Principal principal) {
        GenerateQuizRequest req = request != null ? request : new GenerateQuizRequest();
        QuizSetResponse response = quizService.generate(documentId, req, principal.getName());
        return ResponseEntity.ok(ApiResponse.success(response, "Quiz set generated successfully"));
    }

    @GetMapping("/documents/{documentId}/quiz-sets")
    public ResponseEntity<ApiResponse<List<QuizSetListItemResponse>>> list(
            @PathVariable Integer documentId, Principal principal) {
        List<QuizSetListItemResponse> response = quizService.list(documentId, principal.getName());
        return ResponseEntity.ok(ApiResponse.success(response, "Quiz sets retrieved successfully"));
    }

    @GetMapping("/quiz-sets/{setId}")
    public ResponseEntity<ApiResponse<QuizSetResponse>> getDetail(
            @PathVariable Long setId, Principal principal) {
        QuizSetResponse response = quizService.getDetail(setId, principal.getName());
        return ResponseEntity.ok(ApiResponse.success(response, "Quiz set retrieved successfully"));
    }

    @PostMapping("/quiz-sets/{quizSetId}/attempts")
    public ResponseEntity<ApiResponse<QuizAttemptResponse>> submitAttempt(
            @PathVariable Long quizSetId,
            @RequestBody QuizAttemptRequest request,
            Principal principal) {
        QuizAttemptResponse response = quizService.submitAttempt(quizSetId, request, principal.getName());
        return ResponseEntity.ok(ApiResponse.success(response, "Quiz attempt submitted successfully"));
    }

    @GetMapping("/quiz-sets/{quizSetId}/attempts")
    public ResponseEntity<ApiResponse<List<QuizAttemptResponse>>> getAttemptHistory(
            @PathVariable Long quizSetId,
            Principal principal) {
        List<QuizAttemptResponse> response = quizService.getAttemptHistory(quizSetId, principal.getName());
        return ResponseEntity.ok(ApiResponse.success(response, "Quiz attempt history retrieved successfully"));
    }

    @GetMapping("/quiz-sets/{quizSetId}/attempts/latest")
    public ResponseEntity<ApiResponse<QuizAttemptResponse>> getLatestAttempt(
            @PathVariable Long quizSetId,
            Principal principal) {
        QuizAttemptResponse response = quizService.getLatestAttempt(quizSetId, principal.getName());
        return ResponseEntity.ok(ApiResponse.success(response, "Latest quiz attempt retrieved successfully"));
    }

    @GetMapping("/quiz-sets/{quizSetId}/attempts/best")
    public ResponseEntity<ApiResponse<QuizAttemptResponse>> getBestAttempt(
            @PathVariable Long quizSetId,
            Principal principal) {
        QuizAttemptResponse response = quizService.getBestAttempt(quizSetId, principal.getName());
        return ResponseEntity.ok(ApiResponse.success(response, "Best quiz attempt retrieved successfully"));
    }
}