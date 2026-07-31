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
    private final com.demo.ai_study_hub.repository.SchoolRepository schoolRepository;
    private final com.demo.ai_study_hub.repository.MajorRepository majorRepository;

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

        if (request.getSchoolId() != null) {
            com.demo.ai_study_hub.entity.School school = schoolRepository.findById(request.getSchoolId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "School not found"));
            if (!"ACTIVE".equals(school.getStatus())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "School is inactive");
            }
            user.setSchool(school);
        } else {
            user.setSchool(null);
        }

        if (request.getMajorId() != null) {
            com.demo.ai_study_hub.entity.Major major = majorRepository.findById(request.getMajorId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Major not found"));
            if (!"ACTIVE".equals(major.getStatus())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Major is inactive");
            }
            if (user.getSchool() == null || !major.getSchool().getSchoolId().equals(user.getSchool().getSchoolId())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Major does not belong to the selected school");
            }
            user.setMajor(major);
        } else {
            user.setMajor(null);
        }

        user.setFullName(trimToNull(request.getFullName()));
        user.setPhone(trimToNull(request.getPhone()));
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
        Integer schoolId = user.getSchool() != null ? user.getSchool().getSchoolId() : null;
        String schoolCode = user.getSchool() != null ? user.getSchool().getSchoolCode() : null;
        String schoolName = user.getSchool() != null ? user.getSchool().getSchoolName() : null;

        Integer majorId = user.getMajor() != null ? user.getMajor().getMajorId() : null;
        String majorCode = user.getMajor() != null ? user.getMajor().getMajorCode() : null;
        String majorName = user.getMajor() != null ? user.getMajor().getMajorName() : null;

        return ProfileResponse.builder()
                .userId(user.getUserId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .avatarUrl(user.getAvatarUrl())
                .phone(user.getPhone())
                .schoolId(schoolId)
                .schoolCode(schoolCode)
                .schoolName(schoolName)
                .majorId(majorId)
                .majorCode(majorCode)
                .major(majorName)
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
