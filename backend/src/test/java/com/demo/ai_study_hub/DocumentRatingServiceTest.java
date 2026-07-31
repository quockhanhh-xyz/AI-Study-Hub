package com.demo.ai_study_hub;

import com.demo.ai_study_hub.entity.Document;
import com.demo.ai_study_hub.entity.DocumentRating;
import com.demo.ai_study_hub.entity.User;
import com.demo.ai_study_hub.repository.DocumentRepository;
import com.demo.ai_study_hub.repository.DocumentRatingRepository;
import com.demo.ai_study_hub.repository.UserRepository;
import com.demo.ai_study_hub.service.DocumentRatingService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DocumentRatingServiceTest {

    @Mock
    private DocumentRatingRepository documentRatingRepository;
    @Mock
    private DocumentRepository documentRepository;
    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private DocumentRatingService documentRatingService;

    private User user;
    private User owner;
    private Document doc;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setUserId(1);
        user.setEmail("user@test.com");

        owner = new User();
        owner.setUserId(2);
        owner.setEmail("owner@test.com");

        doc = new Document();
        doc.setDocumentId(100);
        doc.setOwner(owner);
        doc.setVisibility("PUBLIC");
        doc.setApprovalStatus("APPROVED");
        doc.setStatus("ACTIVE");
    }

    @Test
    void rateDocument_NewRating_Success() {
        when(userRepository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
        when(documentRepository.findById(doc.getDocumentId())).thenReturn(Optional.of(doc));
        when(documentRatingRepository.findByDocumentAndUser(doc, user)).thenReturn(Optional.empty());
        when(documentRatingRepository.save(any(DocumentRating.class))).thenAnswer(inv -> inv.getArgument(0));

        DocumentRating rating = documentRatingService.rateDocument(doc.getDocumentId(), 4, user.getEmail());

        assertNotNull(rating);
        assertEquals(4, rating.getRating());
        assertEquals(doc, rating.getDocument());
        assertEquals(user, rating.getUser());
    }

    @Test
    void rateDocument_UpdateRating_Success() {
        DocumentRating existingRating = new DocumentRating();
        existingRating.setRating(3);
        existingRating.setDocument(doc);
        existingRating.setUser(user);

        when(userRepository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
        when(documentRepository.findById(doc.getDocumentId())).thenReturn(Optional.of(doc));
        when(documentRatingRepository.findByDocumentAndUser(doc, user)).thenReturn(Optional.of(existingRating));
        when(documentRatingRepository.save(any(DocumentRating.class))).thenAnswer(inv -> inv.getArgument(0));

        DocumentRating rating = documentRatingService.rateDocument(doc.getDocumentId(), 5, user.getEmail());

        assertNotNull(rating);
        assertEquals(5, rating.getRating());
    }

    @Test
    void rateDocument_Fail_OwnerRatingOwnDoc() {
        doc.setOwner(user); // user owns the doc
        when(userRepository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
        when(documentRepository.findById(doc.getDocumentId())).thenReturn(Optional.of(doc));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> {
            documentRatingService.rateDocument(doc.getDocumentId(), 4, user.getEmail());
        });
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        assertEquals("You cannot rate your own document", ex.getReason());
    }

    @Test
    void rateDocument_Fail_InvalidRatingValue() {
        when(userRepository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
        when(documentRepository.findById(doc.getDocumentId())).thenReturn(Optional.of(doc));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> {
            documentRatingService.rateDocument(doc.getDocumentId(), 6, user.getEmail());
        });
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        assertEquals("Rating must be an integer between 1 and 5", ex.getReason());
    }

    @Test
    void deleteRating_Success() {
        DocumentRating rating = new DocumentRating();
        when(userRepository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
        when(documentRepository.findById(doc.getDocumentId())).thenReturn(Optional.of(doc));
        when(documentRatingRepository.findByDocumentAndUser(doc, user)).thenReturn(Optional.of(rating));

        documentRatingService.deleteRating(doc.getDocumentId(), user.getEmail());

        verify(documentRatingRepository, times(1)).delete(rating);
    }
}
