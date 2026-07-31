package com.demo.ai_study_hub;

import com.demo.ai_study_hub.dto.*;
import com.demo.ai_study_hub.entity.SystemReview;
import com.demo.ai_study_hub.entity.SystemReviewReply;
import com.demo.ai_study_hub.entity.User;
import com.demo.ai_study_hub.repository.SystemReviewReplyRepository;
import com.demo.ai_study_hub.repository.SystemReviewRepository;
import com.demo.ai_study_hub.repository.UserRepository;
import com.demo.ai_study_hub.service.NotificationService;
import com.demo.ai_study_hub.service.SystemReviewReplyService;
import com.demo.ai_study_hub.service.SystemReviewService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class SystemReviewServiceTest {

    @Mock
    private SystemReviewRepository systemReviewRepository;

    @Mock
    private SystemReviewReplyRepository systemReviewReplyRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private SystemReviewService systemReviewService;

    @InjectMocks
    private SystemReviewReplyService systemReviewReplyService;

    private User activeUser;
    private User adminUser;

    @BeforeEach
    void setUp() {
        activeUser = new User();
        activeUser.setUserId(1);
        activeUser.setEmail("user@test.com");
        activeUser.setFullName("Normal User");
        activeUser.setStatus("ACTIVE");
        activeUser.setRole("USER");

        adminUser = new User();
        adminUser.setUserId(2);
        adminUser.setEmail("admin@test.com");
        adminUser.setFullName("System Admin");
        adminUser.setStatus("ACTIVE");
        adminUser.setRole("ADMIN");
    }

    @Test
    void testSubmitReview_Success_WithXssEscape() {
        CreateSystemReviewRequest request = new CreateSystemReviewRequest();
        request.setRating(5);
        request.setCategory("AI Quality");
        request.setTitle("<script>alert('XSS')</script> Great tool!");
        request.setContent("<p>Very helpful summary features</p>");

        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(activeUser));
        when(systemReviewRepository.findByUser_UserId(activeUser.getUserId())).thenReturn(Optional.empty());
        when(systemReviewRepository.save(any(SystemReview.class))).thenAnswer(invocation -> {
            SystemReview r = invocation.getArgument(0);
            if (r.getReviewId() == null) {
                r.setReviewId(1);
            }
            return r;
        });

        SystemReviewResponse response = systemReviewService.submitReview("user@test.com", request);

        assertNotNull(response);
        assertEquals(5, response.getRating());
        assertEquals("AI Quality", response.getCategory());
        // Title and content must be escaped
        assertEquals("&lt;script&gt;alert(&#39;XSS&#39;)&lt;/script&gt; Great tool!", response.getTitle());
        assertEquals("&lt;p&gt;Very helpful summary features&lt;/p&gt;", response.getContent());
        assertEquals("NEW", response.getStatus());

        verify(notificationService, times(1)).notifyAllAdmins(
                eq("SYSTEM_REVIEW_SUBMIT"), any(), any(), eq("SYSTEM_REVIEW"), any()
        );
    }

    @Test
    void testSubmitReview_InvalidCategory_ThrowsException() {
        CreateSystemReviewRequest request = new CreateSystemReviewRequest();
        request.setRating(4);
        request.setCategory("Invalid Category Name");
        request.setTitle("Good");
        request.setContent("Very good experience.");

        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(activeUser));

        assertThrows(ResponseStatusException.class, () -> {
            systemReviewService.submitReview("user@test.com", request);
        });
    }

    @Test
    void testSubmitReview_AlreadyExists_UpdatesExistingReview() {
        SystemReview existing = SystemReview.builder()
                .reviewId(10)
                .user(activeUser)
                .rating(3)
                .category("Payment")
                .title("Old Title")
                .content("Old Content that is long enough")
                .status("RESPONDED")
                .createdAt(LocalDateTime.now().minusDays(1))
                .build();

        CreateSystemReviewRequest request = new CreateSystemReviewRequest();
        request.setRating(5);
        request.setCategory("Performance");
        request.setTitle("New Fast Title");
        request.setContent("New content is fast and great");

        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(activeUser));
        when(systemReviewRepository.findByUser_UserId(activeUser.getUserId())).thenReturn(Optional.of(existing));
        when(systemReviewRepository.save(any(SystemReview.class))).thenAnswer(invocation -> invocation.getArgument(0));

        SystemReviewResponse response = systemReviewService.submitReview("user@test.com", request);

        assertNotNull(response);
        assertEquals(5, response.getRating());
        assertEquals("Performance", response.getCategory());
        assertEquals("New Fast Title", response.getTitle());
        assertEquals("New content is fast and great", response.getContent());
        // Status must be reset to NEW
        assertEquals("NEW", response.getStatus());
    }

    @Test
    void testUpdateReview_Forbidden_NotOwner() {
        SystemReview review = SystemReview.builder()
                .reviewId(100)
                .user(activeUser) // Owned by activeUser (ID: 1)
                .rating(4)
                .category("Other")
                .title("Hello")
                .content("Some content here")
                .status("NEW")
                .build();

        UpdateSystemReviewRequest request = new UpdateSystemReviewRequest();
        request.setRating(1);
        request.setCategory("Other");
        request.setTitle("Hacked");
        request.setContent("This should fail");

        User maliciousUser = new User();
        maliciousUser.setUserId(99); // Different user
        maliciousUser.setEmail("hacker@test.com");
        maliciousUser.setStatus("ACTIVE");

        when(userRepository.findByEmail("hacker@test.com")).thenReturn(Optional.of(maliciousUser));
        when(systemReviewRepository.findById(100)).thenReturn(Optional.of(review));

        assertThrows(ResponseStatusException.class, () -> {
            systemReviewService.updateReview("hacker@test.com", 100, request);
        });
    }

    @Test
    void testSoftDelete_Success() {
        SystemReview review = SystemReview.builder()
                .reviewId(100)
                .user(activeUser)
                .rating(4)
                .category("Other")
                .title("Hello")
                .content("Some content here")
                .status("NEW")
                .build();

        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(activeUser));
        when(systemReviewRepository.findById(100)).thenReturn(Optional.of(review));

        systemReviewService.softDeleteReview("user@test.com", 100);

        assertNotNull(review.getDeletedAt());
        verify(systemReviewRepository, times(1)).save(review);
    }

    @Test
    void testAdminReply_Success() {
        SystemReview review = SystemReview.builder()
                .reviewId(50)
                .user(activeUser)
                .rating(2)
                .category("Bug Report")
                .title("Crash")
                .content("It crashed on my screen.")
                .status("NEW")
                .build();

        CreateReviewReplyRequest request = new CreateReviewReplyRequest();
        request.setContent("We are looking into this crash. Thanks!");

        when(userRepository.findByEmail("admin@test.com")).thenReturn(Optional.of(adminUser));
        when(systemReviewRepository.findById(50)).thenReturn(Optional.of(review));
        when(systemReviewReplyRepository.save(any(SystemReviewReply.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ReviewReplyResponse replyResponse = systemReviewReplyService.addReply("admin@test.com", 50, request);

        assertNotNull(replyResponse);
        assertEquals("We are looking into this crash. Thanks!", replyResponse.getContent());
        // Status of review should be RESPONDED
        assertEquals("RESPONDED", review.getStatus());

        verify(notificationService, times(1)).createNotification(
                eq(activeUser), eq("SYSTEM_REVIEW_REPLY"), any(), any(), eq("SYSTEM_REVIEW"), eq(50L)
        );
    }

    @Test
    void testUserReply_Success() {
        SystemReview review = SystemReview.builder()
                .reviewId(50)
                .user(activeUser)
                .rating(2)
                .category("Bug Report")
                .title("Crash")
                .content("It crashed on my screen.")
                .status("RESPONDED")
                .build();

        CreateReviewReplyRequest request = new CreateReviewReplyRequest();
        request.setContent("Thanks admin, here is my screenshot URL.");

        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(activeUser));
        when(systemReviewRepository.findById(50)).thenReturn(Optional.of(review));
        when(systemReviewReplyRepository.save(any(SystemReviewReply.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ReviewReplyResponse replyResponse = systemReviewReplyService.addReply("user@test.com", 50, request);

        assertNotNull(replyResponse);
        assertEquals("Thanks admin, here is my screenshot URL.", replyResponse.getContent());
        // Status of review should return to IN_REVIEW
        assertEquals("IN_REVIEW", review.getStatus());

        verify(notificationService, times(1)).notifyAllAdmins(
                eq("SYSTEM_REVIEW_REPLY"), any(), any(), eq("SYSTEM_REVIEW"), eq(50L)
        );
    }
}
