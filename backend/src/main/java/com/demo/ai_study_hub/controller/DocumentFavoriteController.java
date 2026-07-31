package com.demo.ai_study_hub.controller;

import com.demo.ai_study_hub.dto.ApiResponse;
import com.demo.ai_study_hub.dto.FavoriteDocumentItemResponse;
import com.demo.ai_study_hub.dto.FavoriteResponse;
import com.demo.ai_study_hub.service.DocumentFavoriteService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/documents")
@RequiredArgsConstructor
public class DocumentFavoriteController {

    private final DocumentFavoriteService documentFavoriteService;

    @PostMapping("/{id}/favorite")
    public ResponseEntity<ApiResponse<FavoriteResponse>> favorite(
            @PathVariable("id") Integer documentId, Principal principal) {
        FavoriteResponse response = documentFavoriteService.favorite(documentId, principal.getName());
        return ResponseEntity.ok(ApiResponse.success(response, "Document added to favorites."));
    }

    @DeleteMapping("/{id}/favorite")
    public ResponseEntity<ApiResponse<FavoriteResponse>> unfavorite(
            @PathVariable("id") Integer documentId, Principal principal) {
        FavoriteResponse response = documentFavoriteService.unfavorite(documentId, principal.getName());
        return ResponseEntity.ok(ApiResponse.success(response, "Document removed from favorites."));
    }

    /**
     * Returns the caller's own favorited documents, already filtered to
     * ACTIVE + still-viewable (see DocumentFavoriteService.listFavoritedDocuments).
     * See FavoriteDocumentItemResponse Javadoc for the field-parity note
     * with GET /api/documents/my.
     */
    @GetMapping("/favorites")
    public ResponseEntity<ApiResponse<List<FavoriteDocumentItemResponse>>> getFavorites(Principal principal) {
        List<FavoriteDocumentItemResponse> documents = documentFavoriteService.listFavoritedDocuments(principal.getName());
        return ResponseEntity.ok(ApiResponse.success(documents, "Favorite documents retrieved successfully"));
    }
}
