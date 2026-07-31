package com.demo.ai_study_hub.dto;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class PublicProfileResponse {
    private Integer userId;
    private String fullName;
    private String avatarUrl;
    private String bio;
    private String schoolName;
    private String major;
    private LocalDateTime joinedAt;
    private long followersCount;
    private long followingCount;
    private long publicDocumentCount;
    private long upvotesCount;
    private boolean followedByMe;
    private boolean isMyProfile;
}
