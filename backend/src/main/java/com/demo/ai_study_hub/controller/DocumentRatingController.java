package com.demo.ai_study_hub.controller;

import com.demo.ai_study_hub.dto.ApiResponse;
import com.demo.ai_study_hub.dto.DocumentRatingRequest;
import com.demo.ai_study_hub.dto.DocumentRatingSummaryResponse;
import com.demo.ai_study_hub.entity.Document;
import com.demo.ai_study_hub.entity.User;
import com.demo.ai_study_hub.repository.DocumentRepository;
import com.demo.ai_study_hub.repository.UserRepository;
import com.demo.ai_study_hub.service.DocumentRatingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.security.Principal;

@RestController
@RequestMapping("/api/public/documents/{documentId}/ratings")
@RequiredArgsConstructor
public class DocumentRatingController {

    private final DocumentRatingService documentRatingService;
    private final DocumentRepository documentRepository;
    private final UserRepository userRepository;

    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<DocumentRatingSummaryResponse>> getRatingsSummary(
            @PathVariable Integer documentId,
            Principal principal) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));

        Double avg = documentRatingService.getAverageRating(document);
        Long count = documentRatingService.getRatingCount(document);

        Integer myRating = null;
        boolean canRate = false;

        if (principal != null) {
            User user = userRepository.findByEmail(principal.getName()).orElse(null);
            if (user != null) {
                myRating = documentRatingService.getUserRating(document, user);
                // Can rate if they are logged in, document is public, approved, active, and they are not owner
                boolean isOwner = document.getOwner() != null && document.getOwner().getUserId().equals(user.getUserId());
                boolean isActivePublicApproved = "PUBLIC".equals(document.getVisibility()) 
                        && "APPROVED".equals(document.getApprovalStatus()) 
                        && "ACTIVE".equals(document.getStatus());
                canRate = isActivePublicApproved && !isOwner;
            }
        }

        DocumentRatingSummaryResponse data = DocumentRatingSummaryResponse.builder()
                .averageRating(avg)
                .ratingCount(count)
                .myRating(myRating)
                .canRate(canRate)
                .build();

        return ResponseEntity.ok(ApiResponse.success(data, "Ratings summary retrieved"));
    }

    @PutMapping("/me")
    public ResponseEntity<ApiResponse<Void>> rateDocument(
            @PathVariable Integer documentId,
            @Valid @RequestBody DocumentRatingRequest request,
            Principal principal) {
        try {
            documentRatingService.rateDocument(documentId, request.getRating(), principal.getName());
            return ResponseEntity.ok(ApiResponse.success(null, "Document rated successfully"));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(ApiResponse.error(e.getReason()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.error(e.getMessage()));
        }
    }

    @DeleteMapping("/me")
    public ResponseEntity<ApiResponse<Void>> deleteRating(
            @PathVariable Integer documentId,
            Principal principal) {
        try {
            documentRatingService.deleteRating(documentId, principal.getName());
            return ResponseEntity.ok(ApiResponse.success(null, "Rating deleted successfully"));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(ApiResponse.error(e.getReason()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.error(e.getMessage()));
        }
    }
}
