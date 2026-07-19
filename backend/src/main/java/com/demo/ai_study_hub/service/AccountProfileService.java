package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.dto.ProfileResponse;
import com.demo.ai_study_hub.dto.UpdateProfileRequest;
import com.demo.ai_study_hub.entity.User;
import com.demo.ai_study_hub.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class AccountProfileService {

    private final UserRepository userRepository;

    public ProfileResponse getProfile(User user) {
        return mapToResponse(user);
    }

    public ProfileResponse updateProfile(User user, UpdateProfileRequest request) {
        if ("BLOCKED".equals(user.getStatus())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Account is blocked");
        }

        user.setFullName(request.getFullName());
        user.setPhone(request.getPhone());
        user.setSchoolName(request.getSchoolName());
        user.setMajor(request.getMajor());
        user.setStudentCode(request.getStudentCode());
        user.setGraduationYear(request.getGraduationYear());
        user.setEducationLevel(request.getEducationLevel());
        user.setBio(request.getBio());

        user = userRepository.save(user);
        return mapToResponse(user);
    }

    public ProfileResponse mapToResponse(User user) {
        return ProfileResponse.builder()
                .userId(user.getUserId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .avatarUrl(user.getAvatarUrl())
                .phone(user.getPhone())
                .schoolName(user.getSchoolName())
                .major(user.getMajor())
                .studentCode(user.getStudentCode())
                .graduationYear(user.getGraduationYear())
                .educationLevel(user.getEducationLevel())
                .bio(user.getBio())
                .role(user.getRole())
                .tier(user.getTier().name())
                .tierExpiresAt(user.getTierExpiresAt())
                .status(user.getStatus())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }
}
