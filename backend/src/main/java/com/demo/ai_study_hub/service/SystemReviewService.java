package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.dto.*;
import com.demo.ai_study_hub.entity.SystemReview;
import com.demo.ai_study_hub.entity.SystemReviewReply;
import com.demo.ai_study_hub.entity.User;
import com.demo.ai_study_hub.repository.SystemReviewReplyRepository;
import com.demo.ai_study_hub.repository.SystemReviewRepository;
import com.demo.ai_study_hub.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.util.HtmlUtils;

import jakarta.persistence.criteria.Predicate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SystemReviewService {

    private final SystemReviewRepository systemReviewRepository;
    private final SystemReviewReplyRepository systemReviewReplyRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    private static final List<String> VALID_CATEGORIES = Arrays.asList(
            "General Experience", "Bug Report", "Feature Request", "Performance", "AI Quality", "Payment", "Other"
    );

    private static final List<String> VALID_STATUSES = Arrays.asList(
            "NEW", "IN_REVIEW", "RESPONDED", "RESOLVED", "ARCHIVED"
    );

    @Transactional
    public SystemReviewResponse submitReview(String email, CreateSystemReviewRequest request) {
        User user = getActiveUser(email);
        String normalizedCategory = normalizeAndValidateCategory(request.getCategory());

        String escapedTitle = request.getTitle().trim();
        String escapedContent = request.getContent().trim();

        Optional<SystemReview> existingOpt = systemReviewRepository.findByUser_UserId(user.getUserId());
        SystemReview review;

        if (existingOpt.isPresent()) {
            // Update the existing review (active or soft-deleted)
            review = existingOpt.get();
            review.setRating(request.getRating());
            review.setCategory(normalizedCategory);
            review.setTitle(escapedTitle);
            review.setContent(escapedContent);
            review.setStatus("NEW");
            review.setDeletedAt(null);
            review.setUpdatedAt(LocalDateTime.now());
        } else {
            // Create a new review
            review = SystemReview.builder()
                    .user(user)
                    .rating(request.getRating())
                    .category(normalizedCategory)
                    .title(escapedTitle)
                    .content(escapedContent)
                    .status("NEW")
                    .createdAt(LocalDateTime.now())
                    .build();
        }

        review = systemReviewRepository.save(review);

        // Notify admins about new review
        notificationService.notifyAllAdmins(
                "SYSTEM_REVIEW_SUBMIT",
                "New System Review",
                "User " + user.getFullName() + " submitted a system review.",
                "SYSTEM_REVIEW",
                review.getReviewId() != null ? Long.valueOf(review.getReviewId()) : 0L
        );

        return toResponse(review);
    }

    @Transactional(readOnly = true)
    public SystemReviewResponse getMyReview(String email) {
        User user = getActiveUser(email);
        Optional<SystemReview> reviewOpt = systemReviewRepository.findByUser_UserIdAndDeletedAtIsNull(user.getUserId());
        if (reviewOpt.isEmpty()) {
            return null;
        }
        SystemReview review = reviewOpt.get();
        SystemReviewResponse response = toResponse(review);
        response.setReplies(getRepliesResponseList(review.getReviewId()));
        return response;
    }

    @Transactional
    public SystemReviewResponse updateReview(String email, Integer reviewId, UpdateSystemReviewRequest request) {
        User user = getActiveUser(email);
        SystemReview review = systemReviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Review not found"));

        if (review.getDeletedAt() != null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Review has been deleted");
        }

        if (!review.getUser().getUserId().equals(user.getUserId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You do not own this review");
        }

        String normalizedCategory = normalizeAndValidateCategory(request.getCategory());

        String escapedTitle = request.getTitle().trim();
        String escapedContent = request.getContent().trim();

        review.setRating(request.getRating());
        review.setCategory(normalizedCategory);
        review.setTitle(escapedTitle);
        review.setContent(escapedContent);

        if ("RESPONDED".equals(review.getStatus())) {
            review.setStatus("IN_REVIEW");
        }
        review.setUpdatedAt(LocalDateTime.now());
        review = systemReviewRepository.save(review);

        return toResponse(review);
    }

    @Transactional
    public void softDeleteReview(String email, Integer reviewId) {
        User user = getActiveUser(email);
        SystemReview review = systemReviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Review not found"));

        if (review.getDeletedAt() != null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Review already deleted");
        }

        if (!review.getUser().getUserId().equals(user.getUserId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You do not own this review");
        }

        LocalDateTime now = LocalDateTime.now();
        review.setDeletedAt(now);
        systemReviewRepository.save(review);

        // Soft delete all associated replies
        List<SystemReviewReply> activeReplies = systemReviewReplyRepository
                .findBySystemReview_ReviewIdAndDeletedAtIsNullOrderByCreatedAtAsc(reviewId);
        if (activeReplies != null && !activeReplies.isEmpty()) {
            activeReplies.forEach(reply -> reply.setDeletedAt(now));
            systemReviewReplyRepository.saveAll(activeReplies);
        }
    }

    @Transactional(readOnly = true)
    public List<ReviewReplyResponse> getReplies(String email, Integer reviewId) {
        User user = getActiveUser(email);
        SystemReview review = systemReviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Review not found"));

        if (review.getDeletedAt() != null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Review has been deleted");
        }

        boolean isAdmin = "ADMIN".equals(user.getRole());
        if (!isAdmin && !review.getUser().getUserId().equals(user.getUserId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied to conversation");
        }

        return getRepliesResponseList(reviewId);
    }

    @Transactional(readOnly = true)
    public Page<SystemReviewResponse> getReviewsForAdmin(
            Integer rating, String category, String status, String search, Pageable pageable
    ) {
        Specification<SystemReview> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Exclude soft-deleted reviews
            predicates.add(cb.isNull(root.get("deletedAt")));

            if (rating != null) {
                predicates.add(cb.equal(root.get("rating"), rating));
            }
            if (category != null && !category.isEmpty()) {
                predicates.add(cb.equal(root.get("category"), category));
            }
            if (status != null && !status.isEmpty()) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (search != null && !search.trim().isEmpty()) {
                String likePattern = "%" + search.trim().toLowerCase() + "%";
                Predicate titleLike = cb.like(cb.lower(root.get("title")), likePattern);
                Predicate contentLike = cb.like(cb.lower(root.get("content")), likePattern);
                Predicate emailLike = cb.like(cb.lower(root.get("user").get("email")), likePattern);
                Predicate nameLike = cb.like(cb.lower(root.get("user").get("fullName")), likePattern);
                predicates.add(cb.or(titleLike, contentLike, emailLike, nameLike));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<SystemReview> reviewsPage = systemReviewRepository.findAll(spec, pageable);
        return reviewsPage.map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public SystemReviewResponse getReviewDetailsForAdmin(Integer reviewId) {
        SystemReview review = systemReviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Review not found"));

        if (review.getDeletedAt() != null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Review has been deleted");
        }

        SystemReviewResponse response = toResponse(review);
        response.setReplies(getRepliesResponseList(reviewId));
        return response;
    }

    @Transactional(readOnly = true)
    public ReviewStatisticsResponse getStatistics() {
        long total = systemReviewRepository.countActiveReviews();
        Double avg = systemReviewRepository.getAverageRating();
        double averageRating = (avg != null) ? Math.round(avg * 100.0) / 100.0 : 0.0;
        long unresponded = systemReviewRepository.countUnrespondedReviews();

        Map<Integer, Long> distribution = new HashMap<>();
        for (int i = 1; i <= 5; i++) {
            distribution.put(i, 0L);
        }

        List<Object[]> rawDistribution = systemReviewRepository.getRatingDistribution();
        if (rawDistribution != null) {
            for (Object[] row : rawDistribution) {
                Integer rating = (Integer) row[0];
                Long count = (Long) row[1];
                if (rating >= 1 && rating <= 5) {
                    distribution.put(rating, count);
                }
            }
        }

        return ReviewStatisticsResponse.builder()
                .totalActiveReviews(total)
                .averageRating(averageRating)
                .unrespondedCount(unresponded)
                .ratingDistribution(distribution)
                .build();
    }

    @Transactional
    public SystemReviewResponse updateReviewStatus(Integer reviewId, String status) {
        SystemReview review = systemReviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Review not found"));

        if (review.getDeletedAt() != null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Review has been deleted");
        }

        String targetStatus = status != null ? status.trim().toUpperCase() : "";
        if (!VALID_STATUSES.contains(targetStatus)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid review status: " + status);
        }

        review.setStatus(targetStatus);
        review = systemReviewRepository.save(review);

        if ("RESOLVED".equals(targetStatus)) {
            notificationService.createNotification(
                    review.getUser(),
                    "SYSTEM_REVIEW_RESOLVED",
                    "Feedback Resolved",
                    "Admin marked your system feedback conversation as Resolved.",
                    "SYSTEM_REVIEW",
                    Long.valueOf(reviewId)
            );
        }

        return toResponse(review);
    }

    private User getActiveUser(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
        if (!"ACTIVE".equals(user.getStatus())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "User account is not active");
        }
        return user;
    }

    private String normalizeAndValidateCategory(String category) {
        if (category == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Category is required");
        }
        String trimmed = category.trim();
        switch (trimmed.toUpperCase()) {
            case "AI_QUALITY":
            case "AI QUALITY":
                return "AI Quality";
            case "BUG_REPORT":
            case "BUG REPORT":
                return "Bug Report";
            case "FEATURE_REQUEST":
            case "FEATURE REQUEST":
                return "Feature Request";
            case "GENERAL_EXPERIENCE":
            case "GENERAL EXPERIENCE":
                return "General Experience";
            case "PERFORMANCE":
                return "Performance";
            case "PAYMENT":
                return "Payment";
            case "OTHER":
                return "Other";
            default:
                for (String valid : VALID_CATEGORIES) {
                    if (valid.equalsIgnoreCase(trimmed)) {
                        return valid;
                    }
                }
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid feedback category");
        }
    }

    private List<ReviewReplyResponse> getRepliesResponseList(Integer reviewId) {
        List<SystemReviewReply> list = systemReviewReplyRepository
                .findBySystemReview_ReviewIdAndDeletedAtIsNullOrderByCreatedAtAsc(reviewId);
        return list.stream().map(r -> ReviewReplyResponse.builder()
                .replyId(r.getReplyId())
                .reviewId(r.getSystemReview().getReviewId())
                .senderEmail(r.getSender().getEmail())
                .senderFullName(r.getSender().getFullName())
                .senderRole(r.getSender().getRole())
                .content(r.getContent())
                .createdAt(r.getCreatedAt())
                .build()).collect(Collectors.toList());
    }

    private SystemReviewResponse toResponse(SystemReview r) {
        return SystemReviewResponse.builder()
                .reviewId(r.getReviewId())
                .userEmail(r.getUser().getEmail())
                .userFullName(r.getUser().getFullName())
                .rating(r.getRating())
                .category(r.getCategory())
                .title(r.getTitle())
                .content(r.getContent())
                .status(r.getStatus())
                .createdAt(r.getCreatedAt())
                .updatedAt(r.getUpdatedAt())
                .build();
    }
}
