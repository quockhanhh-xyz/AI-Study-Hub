package com.demo.ai_study_hub.controller;

import com.demo.ai_study_hub.dto.*;
import com.demo.ai_study_hub.service.SystemReviewReplyService;
import com.demo.ai_study_hub.service.SystemReviewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/system-reviews")
@RequiredArgsConstructor
public class SystemReviewController {

    private final SystemReviewService systemReviewService;
    private final SystemReviewReplyService systemReviewReplyService;

    @PostMapping
    public ResponseEntity<ApiResponse<SystemReviewResponse>> submitReview(
            @Valid @RequestBody CreateSystemReviewRequest request,
            Principal principal) {
        SystemReviewResponse response = systemReviewService.submitReview(principal.getName(), request);
        return ResponseEntity.ok(ApiResponse.success(response, "Review submitted successfully"));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<SystemReviewResponse>> getMyReview(Principal principal) {
        SystemReviewResponse response = systemReviewService.getMyReview(principal.getName());
        return ResponseEntity.ok(ApiResponse.success(response, "My review retrieved successfully"));
    }

    @PutMapping("/{reviewId}")
    public ResponseEntity<ApiResponse<SystemReviewResponse>> updateReview(
            @PathVariable Integer reviewId,
            @Valid @RequestBody UpdateSystemReviewRequest request,
            Principal principal) {
        SystemReviewResponse response = systemReviewService.updateReview(principal.getName(), reviewId, request);
        return ResponseEntity.ok(ApiResponse.success(response, "Review updated successfully"));
    }

    @DeleteMapping("/{reviewId}")
    public ResponseEntity<ApiResponse<Void>> deleteReview(
            @PathVariable Integer reviewId,
            Principal principal) {
        systemReviewService.softDeleteReview(principal.getName(), reviewId);
        return ResponseEntity.ok(ApiResponse.success(null, "Review deleted successfully"));
    }

    @GetMapping("/{reviewId}/replies")
    public ResponseEntity<ApiResponse<List<ReviewReplyResponse>>> getReplies(
            @PathVariable Integer reviewId,
            Principal principal) {
        List<ReviewReplyResponse> response = systemReviewService.getReplies(principal.getName(), reviewId);
        return ResponseEntity.ok(ApiResponse.success(response, "Replies retrieved successfully"));
    }

    @PostMapping("/{reviewId}/replies")
    public ResponseEntity<ApiResponse<ReviewReplyResponse>> addReply(
            @PathVariable Integer reviewId,
            @Valid @RequestBody CreateReviewReplyRequest request,
            Principal principal) {
        ReviewReplyResponse response = systemReviewReplyService.addReply(principal.getName(), reviewId, request);
        return ResponseEntity.ok(ApiResponse.success(response, "Reply submitted successfully"));
    }
}
