package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.dto.PublicProfileResponse;
import com.demo.ai_study_hub.entity.User;
import com.demo.ai_study_hub.repository.UserRepository;
import com.demo.ai_study_hub.repository.UserFollowRepository;
import com.demo.ai_study_hub.repository.DocumentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PublicProfileService {

    private final UserRepository userRepository;
    private final UserFollowRepository userFollowRepository;
    private final DocumentRepository documentRepository;
    private final com.demo.ai_study_hub.repository.DocumentRatingRepository documentRatingRepository;

    @Transactional(readOnly = true)
    public PublicProfileResponse getPublicProfile(Integer targetUserId, String currentEmail) {
        User target = userRepository.findById(targetUserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        if ("BLOCKED".equals(target.getStatus()) || "INACTIVE".equals(target.getStatus())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This profile is not accessible");
        }

        User currentUser = null;
        if (currentEmail != null && !currentEmail.isEmpty() && !"anonymousUser".equals(currentEmail)) {
            currentUser = userRepository.findByEmail(currentEmail).orElse(null);
        }

        boolean isMyProfile = currentUser != null && currentUser.getUserId().equals(target.getUserId());

        if (!target.isProfilePublic() && !isMyProfile) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This profile is private");
        }

        long followers = userFollowRepository.countByFollowingAndStatus(target, "ACTIVE");
        long following = userFollowRepository.countByFollowerAndStatus(target, "ACTIVE");
        long publicDocs = documentRepository.countByOwnerAndVisibilityAndApprovalStatusAndStatus(
                target, "PUBLIC", "APPROVED", "ACTIVE"
        );
        long upvotes = documentRatingRepository.countTotalRatingsByOwner(target);

        boolean followedByMe = false;
        if (currentUser != null && !isMyProfile) {
            followedByMe = userFollowRepository.findByFollowerAndFollowing(currentUser, target)
                    .map(relation -> "ACTIVE".equals(relation.getStatus()))
                    .orElse(false);
        }

        String schoolName = (target.isShowSchool() || isMyProfile) ? target.getSchoolName() : null;
        String major = (target.isShowMajor() || isMyProfile) ? target.getMajor() : null;
        String bio = (target.isShowBio() || isMyProfile) ? target.getBio() : null;
        long finalPublicDocs = (target.isShowPublicDocuments() || isMyProfile) ? publicDocs : 0L;

        return PublicProfileResponse.builder()
                .userId(target.getUserId())
                .fullName(target.getFullName())
                .avatarUrl(target.getAvatarUrl())
                .bio(bio)
                .schoolName(schoolName)
                .major(major)
                .joinedAt(target.getCreatedAt())
                .followersCount(followers)
                .followingCount(following)
                .publicDocumentCount(finalPublicDocs)
                .upvotesCount(upvotes)
                .followedByMe(followedByMe)
                .isMyProfile(isMyProfile)
                .build();
    }

    @Transactional
    public void updateProfilePrivacy(com.demo.ai_study_hub.dto.ProfilePrivacyRequest request, String currentEmail) {
        User user = userRepository.findByEmail(currentEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));

        if (request.getProfilePublic() != null) user.setProfilePublic(request.getProfilePublic());
        if (request.getShowSchool() != null) user.setShowSchool(request.getShowSchool());
        if (request.getShowMajor() != null) user.setShowMajor(request.getShowMajor());
        if (request.getShowBio() != null) user.setShowBio(request.getShowBio());
        if (request.getShowPublicDocuments() != null) user.setShowPublicDocuments(request.getShowPublicDocuments());

        userRepository.save(user);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getTopContributors() {
        // Query active users
        List<User> activeUsers = userRepository.findAll().stream()
                .filter(u -> !"BLOCKED".equals(u.getStatus()) && !"INACTIVE".equals(u.getStatus()))
                .collect(Collectors.toList());

        List<Map<String, Object>> list = new ArrayList<>();
        for (User u : activeUsers) {
            long docCount = documentRepository.countByOwnerAndVisibilityAndApprovalStatusAndStatus(
                    u, "PUBLIC", "APPROVED", "ACTIVE"
            );
            long followers = userFollowRepository.countByFollowingAndStatus(u, "ACTIVE");

            // Build item map
            Map<String, Object> map = new java.util.LinkedHashMap<>();
            map.put("userId", u.getUserId());
            map.put("fullName", u.getFullName());
            map.put("avatarUrl", u.getAvatarUrl());
            map.put("schoolName", u.isShowSchool() ? u.getSchoolName() : null);
            map.put("major", u.isShowMajor() ? u.getMajor() : null);
            map.put("publicDocumentCount", docCount);
            map.put("followersCount", followers);
            list.add(map);
        }

        // Sort: publicDocumentCount DESC, followersCount DESC
        list.sort((a, b) -> {
            int comp = Long.compare((Long) b.get("publicDocumentCount"), (Long) a.get("publicDocumentCount"));
            if (comp != 0) return comp;
            return Long.compare((Long) b.get("followersCount"), (Long) a.get("followersCount"));
        });

        // Limit to top 10
        if (list.size() > 10) {
            return list.subList(0, 10);
        }
        return list;
    }
}
