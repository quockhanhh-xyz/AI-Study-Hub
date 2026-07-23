package com.demo.ai_study_hub.repository;

import com.demo.ai_study_hub.entity.User;
import com.demo.ai_study_hub.entity.UserFollow;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserFollowRepository extends JpaRepository<UserFollow, Long> {
    Optional<UserFollow> findByFollowerAndFollowing(User follower, User following);
    long countByFollowingAndStatus(User following, String status);
    long countByFollowerAndStatus(User follower, String status);
    List<UserFollow> findByFollowerAndStatus(User follower, String status);
    List<UserFollow> findByFollowingAndStatus(User following, String status);
}
