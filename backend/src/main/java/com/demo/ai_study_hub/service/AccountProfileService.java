package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.dto.ProfileResponse;
import com.demo.ai_study_hub.dto.UpdateProfileRequest;
import com.demo.ai_study_hub.entity.User;
import com.demo.ai_study_hub.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.transaction.annotation.Transactional;
import java.time.Year;

@Service
@RequiredArgsConstructor
public class AccountProfileService {

    private final UserRepository userRepository;

    public ProfileResponse getProfile(User user) {
        return mapToResponse(user);
    }

    @Transactional
    public ProfileResponse updateProfile(User user, UpdateProfileRequest request) {
        if ("BLOCKED".equals(user.getStatus())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "AUTH_ACCOUNT_BLOCKED");
        }

        if (request.getGraduationYear() != null) {
            int currentYear = Year.now().getValue();
            if (request.getGraduationYear() > currentYear + 10) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Graduation year is too far in the future");
            }
        }

        user.setFullName(trimToNull(request.getFullName()));
        user.setPhone(trimToNull(request.getPhone()));
        user.setSchoolName(trimToNull(request.getSchoolName()));
        user.setMajor(trimToNull(request.getMajor()));
        user.setStudentCode(trimToNull(request.getStudentCode()));
        user.setGraduationYear(request.getGraduationYear());
        user.setEducationLevel(trimToNull(request.getEducationLevel()));
        user.setBio(trimToNull(request.getBio()));

        user = userRepository.save(user);
        return mapToResponse(user);
    }

    private String trimToNull(String str) {
        if (str == null) return null;
        String trimmed = str.trim();
        return trimmed.isEmpty() ? null : trimmed;
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
