package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.entity.Document;
import com.demo.ai_study_hub.entity.DocumentRating;
import com.demo.ai_study_hub.entity.User;
import com.demo.ai_study_hub.repository.DocumentRepository;
import com.demo.ai_study_hub.repository.DocumentRatingRepository;
import com.demo.ai_study_hub.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class DocumentRatingService {

    private final DocumentRatingRepository documentRatingRepository;
    private final DocumentRepository documentRepository;
    private final UserRepository userRepository;

    @Transactional
    public DocumentRating rateDocument(Integer documentId, Integer ratingValue, String email) {
        User user = getUser(email);
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));

        // Validation: Rating value must be 1 to 5
        if (ratingValue == null || ratingValue < 1 || ratingValue > 5) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Rating must be an integer between 1 and 5");
        }

        // Validation: Must be PUBLIC, APPROVED, ACTIVE
        if (!"PUBLIC".equals(document.getVisibility()) || 
            !"APPROVED".equals(document.getApprovalStatus()) || 
            !"ACTIVE".equals(document.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only public, approved, active documents can be rated");
        }

        // Validation: Cannot rate own document
        if (document.getOwner() != null && document.getOwner().getUserId().equals(user.getUserId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "You cannot rate your own document");
        }

        Optional<DocumentRating> existing = documentRatingRepository.findByDocumentAndUser(document, user);
        DocumentRating rating;
        if (existing.isPresent()) {
            rating = existing.get();
            rating.setRating(ratingValue);
        } else {
            rating = new DocumentRating();
            rating.setDocument(document);
            rating.setUser(user);
            rating.setRating(ratingValue);
        }

        return documentRatingRepository.save(rating);
    }

    @Transactional
    public void deleteRating(Integer documentId, String email) {
        User user = getUser(email);
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));

        DocumentRating rating = documentRatingRepository.findByDocumentAndUser(document, user)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Rating not found"));

        documentRatingRepository.delete(rating);
    }

    public Double getAverageRating(Document document) {
        Double avg = documentRatingRepository.getAverageRatingByDocument(document);
        return avg != null ? Math.round(avg * 100.0) / 100.0 : 0.0;
    }

    public Long getRatingCount(Document document) {
        return documentRatingRepository.countRatingsByDocument(document);
    }

    public Integer getUserRating(Document document, User user) {
        if (user == null) return null;
        return documentRatingRepository.findByDocumentAndUser(document, user)
                .map(DocumentRating::getRating)
                .orElse(null);
    }

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }
}
