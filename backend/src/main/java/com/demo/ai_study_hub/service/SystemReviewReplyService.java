package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.dto.CreateReviewReplyRequest;
import com.demo.ai_study_hub.dto.ReviewReplyResponse;
import com.demo.ai_study_hub.entity.SystemReview;
import com.demo.ai_study_hub.entity.SystemReviewReply;
import com.demo.ai_study_hub.entity.User;
import com.demo.ai_study_hub.repository.SystemReviewReplyRepository;
import com.demo.ai_study_hub.repository.SystemReviewRepository;
import com.demo.ai_study_hub.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class SystemReviewReplyService {

    private final SystemReviewRepository systemReviewRepository;
    private final SystemReviewReplyRepository systemReviewReplyRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    @Transactional
    public ReviewReplyResponse addReply(String email, Integer reviewId, CreateReviewReplyRequest request) {
        User sender = getActiveUser(email);
        SystemReview review = systemReviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Review not found"));

        if (review.getDeletedAt() != null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Review has been deleted");
        }

        boolean isAdmin = "ADMIN".equals(sender.getRole());
        boolean isOwner = review.getUser().getUserId().equals(sender.getUserId());

        if (!isAdmin && !isOwner) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not allowed to participate in this conversation");
        }

        String escapedContent = request.getContent().trim();

        SystemReviewReply reply = SystemReviewReply.builder()
                .systemReview(review)
                .sender(sender)
                .content(escapedContent)
                .createdAt(LocalDateTime.now())
                .build();

        reply = systemReviewReplyRepository.save(reply);

        if (isAdmin) {
            review.setStatus("RESPONDED");
            systemReviewRepository.save(review);

            // Notify user
            notificationService.createNotification(
                    review.getUser(),
                    "SYSTEM_REVIEW_REPLY",
                    "New Feedback Response",
                    "Admin has responded to your feedback.",
                    "SYSTEM_REVIEW",
                    Long.valueOf(reviewId)
            );
        } else {
            review.setStatus("IN_REVIEW");
            systemReviewRepository.save(review);

            // Notify admins
            notificationService.notifyAllAdmins(
                    "SYSTEM_REVIEW_REPLY",
                    "New Feedback Reply",
                    "User " + sender.getFullName() + " replied to a system review.",
                    "SYSTEM_REVIEW",
                    Long.valueOf(reviewId)
            );
        }

        return ReviewReplyResponse.builder()
                .replyId(reply.getReplyId())
                .reviewId(review.getReviewId())
                .senderEmail(sender.getEmail())
                .senderFullName(sender.getFullName())
                .senderRole(sender.getRole())
                .content(reply.getContent())
                .createdAt(reply.getCreatedAt())
                .build();
    }

    private User getActiveUser(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
        if (!"ACTIVE".equals(user.getStatus())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "User account is not active");
        }
        return user;
    }
}
