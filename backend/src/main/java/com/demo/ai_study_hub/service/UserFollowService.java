package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.entity.User;
import com.demo.ai_study_hub.entity.UserFollow;
import com.demo.ai_study_hub.repository.UserFollowRepository;
import com.demo.ai_study_hub.repository.UserRepository;
import com.demo.ai_study_hub.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;

@Service
@RequiredArgsConstructor
public class UserFollowService {

    private final UserFollowRepository userFollowRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final NotificationRepository notificationRepository;

    @Transactional
    public void followUser(Integer targetUserId, String currentEmail) {
        User follower = userRepository.findByEmail(currentEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
        User following = userRepository.findById(targetUserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Target user not found"));

        if (follower.getUserId().equals(following.getUserId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "You cannot follow yourself");
        }

        if ("BLOCKED".equals(following.getStatus()) || "INACTIVE".equals(following.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Target user is blocked or inactive");
        }

        UserFollow relation = userFollowRepository.findByFollowerAndFollowing(follower, following)
                .orElse(null);

        boolean wasAlreadyActive = false;
        if (relation == null) {
            relation = new UserFollow();
            relation.setFollower(follower);
            relation.setFollowing(following);
            relation.setStatus("ACTIVE");
            userFollowRepository.save(relation);
        } else {
            if ("ACTIVE".equals(relation.getStatus())) {
                wasAlreadyActive = true;
            } else {
                relation.setStatus("ACTIVE");
                userFollowRepository.save(relation);
            }
        }

        if (!wasAlreadyActive) {
            boolean alreadyNotified = notificationRepository.existsByRecipientAndTypeAndActorUserIdAndReadFalse(
                    following, "USER_FOLLOWED", follower.getUserId()
            );
            if (!alreadyNotified) {
                notificationService.createNotification(
                        following,
                        "USER_FOLLOWED",
                        "New Follower",
                        follower.getFullName() + " started following you.",
                        "USER",
                        Long.valueOf(follower.getUserId()),
                        follower.getUserId()
                );
            }
        }
    }

    @Transactional
    public void unfollowUser(Integer targetUserId, String currentEmail) {
        User follower = userRepository.findByEmail(currentEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
        User following = userRepository.findById(targetUserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Target user not found"));

        UserFollow relation = userFollowRepository.findByFollowerAndFollowing(follower, following)
                .orElse(null);

        if (relation != null && "ACTIVE".equals(relation.getStatus())) {
            relation.setStatus("UNFOLLOWED");
            userFollowRepository.save(relation);
        }
    }

    @Transactional(readOnly = true)
    public List<UserFollow> getFollowing(String currentEmail) {
        User user = userRepository.findByEmail(currentEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
        return userFollowRepository.findByFollowerAndStatus(user, "ACTIVE");
    }

    @Transactional(readOnly = true)
    public List<UserFollow> getFollowers(String currentEmail) {
        User user = userRepository.findByEmail(currentEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
        return userFollowRepository.findByFollowingAndStatus(user, "ACTIVE");
    }
}
