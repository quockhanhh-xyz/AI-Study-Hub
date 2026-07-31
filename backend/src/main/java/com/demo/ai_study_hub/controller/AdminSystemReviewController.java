package com.demo.ai_study_hub.controller;

import com.demo.ai_study_hub.dto.*;
import com.demo.ai_study_hub.service.SystemReviewReplyService;
import com.demo.ai_study_hub.service.SystemReviewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.security.Principal;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/system-reviews")
@RequiredArgsConstructor
public class AdminSystemReviewController {

    private final SystemReviewService systemReviewService;
    private final SystemReviewReplyService systemReviewReplyService;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<SystemReviewResponse>>> getReviews(
            @RequestParam(required = false) Integer rating,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String direction
    ) {
        page = Math.max(0, page);
        size = Math.min(Math.max(1, size), 100);

        List<String> validSorts = Arrays.asList("reviewId", "rating", "category", "status", "createdAt", "updatedAt");
        if (!validSorts.contains(sortBy)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid sort field");
        }

        Sort sort = direction.equalsIgnoreCase(Sort.Direction.ASC.name())
                ? Sort.by(sortBy).ascending()
                : Sort.by(sortBy).descending();

        Pageable pageable = PageRequest.of(page, size, sort);
        Page<SystemReviewResponse> response = systemReviewService.getReviewsForAdmin(
                rating, category, status, search, pageable
        );

        return ResponseEntity.ok(ApiResponse.success(response, "Reviews retrieved successfully"));
    }

    @GetMapping("/{reviewId}")
    public ResponseEntity<ApiResponse<SystemReviewResponse>> getReviewDetails(@PathVariable Integer reviewId) {
        SystemReviewResponse response = systemReviewService.getReviewDetailsForAdmin(reviewId);
        return ResponseEntity.ok(ApiResponse.success(response, "Review details retrieved successfully"));
    }

    @GetMapping("/statistics")
    public ResponseEntity<ApiResponse<ReviewStatisticsResponse>> getStatistics() {
        ReviewStatisticsResponse response = systemReviewService.getStatistics();
        return ResponseEntity.ok(ApiResponse.success(response, "Review statistics retrieved successfully"));
    }

    @PatchMapping("/{reviewId}/status")
    public ResponseEntity<ApiResponse<SystemReviewResponse>> updateReviewStatus(
            @PathVariable Integer reviewId,
            @RequestBody Map<String, String> body) {
        String status = body.get("status");
        if (status == null || status.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Status field is required");
        }
        SystemReviewResponse response = systemReviewService.updateReviewStatus(reviewId, status);
        return ResponseEntity.ok(ApiResponse.success(response, "Review status updated successfully"));
    }

    @PostMapping("/{reviewId}/replies")
    public ResponseEntity<ApiResponse<ReviewReplyResponse>> replyToReview(
            @PathVariable Integer reviewId,
            @Valid @RequestBody CreateReviewReplyRequest request,
            Principal principal) {
        ReviewReplyResponse response = systemReviewReplyService.addReply(principal.getName(), reviewId, request);
        return ResponseEntity.ok(ApiResponse.success(response, "Reply submitted successfully"));
    }
}
