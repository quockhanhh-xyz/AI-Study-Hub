package com.demo.ai_study_hub.controller;

import com.demo.ai_study_hub.dto.ApiResponse;
import com.demo.ai_study_hub.dto.PublicProfileResponse;
import com.demo.ai_study_hub.dto.ProfilePrivacyRequest;
import com.demo.ai_study_hub.entity.User;
import com.demo.ai_study_hub.entity.UserFollow;
import com.demo.ai_study_hub.entity.Document;
import com.demo.ai_study_hub.service.PublicProfileService;
import com.demo.ai_study_hub.service.UserFollowService;
import com.demo.ai_study_hub.repository.UserRepository;
import com.demo.ai_study_hub.repository.DocumentRepository;
import com.demo.ai_study_hub.repository.DocumentRatingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.security.Principal;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class UserController {

    private final PublicProfileService publicProfileService;
    private final UserFollowService userFollowService;
    private final DocumentRepository documentRepository;
    private final UserRepository userRepository;
    private final DocumentRatingRepository documentRatingRepository;

    @GetMapping("/users/{userId}/public-profile")
    public ResponseEntity<ApiResponse<PublicProfileResponse>> getPublicProfile(
            @PathVariable("userId") Integer userId,
            Principal principal) {
        String email = principal != null ? principal.getName() : null;
        PublicProfileResponse profile = publicProfileService.getPublicProfile(userId, email);
        return ResponseEntity.ok(new ApiResponse<>(true, "Public profile retrieved successfully", profile));
    }

    @PutMapping("/users/me/profile-privacy")
    public ResponseEntity<ApiResponse<Object>> updateProfilePrivacy(
            @RequestBody ProfilePrivacyRequest request,
            Principal principal) {
        if (principal == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
        }
        publicProfileService.updateProfilePrivacy(request, principal.getName());
        return ResponseEntity.ok(new ApiResponse<>(true, "Profile privacy updated successfully", null));
    }

    @PostMapping("/users/{userId}/follow")
    public ResponseEntity<ApiResponse<Map<String, Object>>> followUser(
            @PathVariable("userId") Integer userId,
            Principal principal) {
        if (principal == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
        }
        userFollowService.followUser(userId, principal.getName());

        long followers = publicProfileService.getPublicProfile(userId, principal.getName()).getFollowersCount();

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("userId", userId);
        data.put("followedByMe", true);
        data.put("followersCount", followers);

        return ResponseEntity.ok(new ApiResponse<>(true, "Followed user successfully", data));
    }

    @DeleteMapping("/users/{userId}/follow")
    public ResponseEntity<ApiResponse<Map<String, Object>>> unfollowUser(
            @PathVariable("userId") Integer userId,
            Principal principal) {
        if (principal == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
        }
        userFollowService.unfollowUser(userId, principal.getName());

        long followers = publicProfileService.getPublicProfile(userId, principal.getName()).getFollowersCount();

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("userId", userId);
        data.put("followedByMe", false);
        data.put("followersCount", followers);

        return ResponseEntity.ok(new ApiResponse<>(true, "Unfollowed user successfully", data));
    }

    @GetMapping("/users/me/following")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getFollowing(Principal principal) {
        if (principal == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
        }
        List<UserFollow> list = userFollowService.getFollowing(principal.getName());
        List<Map<String, Object>> result = list.stream().map(f -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("userId", f.getFollowing().getUserId());
            m.put("fullName", f.getFollowing().getFullName());
            m.put("avatarUrl", f.getFollowing().getAvatarUrl());
            m.put("schoolName", f.getFollowing().isShowSchool() ? f.getFollowing().getSchoolName() : null);
            m.put("major", f.getFollowing().isShowMajor() ? f.getFollowing().getMajor() : null);
            return m;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(new ApiResponse<>(true, "Following list retrieved successfully", result));
    }

    @GetMapping("/users/me/followers")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getFollowers(Principal principal) {
        if (principal == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
        }
        List<UserFollow> list = userFollowService.getFollowers(principal.getName());
        List<Map<String, Object>> result = list.stream().map(f -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("userId", f.getFollower().getUserId());
            m.put("fullName", f.getFollower().getFullName());
            m.put("avatarUrl", f.getFollower().getAvatarUrl());
            m.put("schoolName", f.getFollower().isShowSchool() ? f.getFollower().getSchoolName() : null);
            m.put("major", f.getFollower().isShowMajor() ? f.getFollower().getMajor() : null);
            return m;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(new ApiResponse<>(true, "Followers list retrieved successfully", result));
    }

    @GetMapping("/users/{userId}/public-documents")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getPublicDocuments(
            @PathVariable("userId") Integer userId,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "12") int size,
            @RequestParam(name = "subjectId", required = false) Integer subjectId,
            @RequestParam(name = "fileType", required = false) String fileType,
            @RequestParam(name = "keyword", required = false) String keyword,
            Principal principal) {

        String email = principal != null ? principal.getName() : null;
        publicProfileService.getPublicProfile(userId, email); // validate target user accessibility

        Pageable pageable = PageRequest.of(page, size);
        Page<Document> docsPage = documentRepository.findPublicDocumentsByUserWithFilters(
                userId, keyword, subjectId, fileType, pageable
        );

        List<Map<String, Object>> content = docsPage.getContent().stream().map(d -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("documentId", d.getDocumentId());
            m.put("title", d.getTitle());
            m.put("description", d.getDescription());
            m.put("fileName", d.getOriginalFileName());
            m.put("fileType", d.getFileType());
            m.put("fileSize", d.getFileSize());
            m.put("fileUrl", d.getFileUrl());
            m.put("subjectName", d.getSubject() != null ? d.getSubject().getSubjectName() : null);
            m.put("subjectCode", d.getSubject() != null ? d.getSubject().getSubjectCode() : null);
            m.put("createdAt", d.getCreatedAt());
            m.put("viewCount", d.getViewCount() != null ? d.getViewCount() : 0);
            m.put("downloadCount", d.getDownloadCount() != null ? d.getDownloadCount() : 0);
            Double avgRating = documentRatingRepository.getAverageRatingByDocument(d);
            m.put("averageRating", avgRating != null ? avgRating : 0.0);
            return m;
        }).collect(Collectors.toList());

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("content", content);
        data.put("totalElements", docsPage.getTotalElements());
        data.put("totalPages", docsPage.getTotalPages());
        data.put("size", docsPage.getSize());
        data.put("number", docsPage.getNumber());

        return ResponseEntity.ok(new ApiResponse<>(true, "Public documents retrieved successfully", data));
    }

    @GetMapping("/community/top-contributors")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getTopContributors() {
        List<Map<String, Object>> list = publicProfileService.getTopContributors();
        return ResponseEntity.ok(new ApiResponse<>(true, "Top contributors retrieved successfully", list));
    }
}
