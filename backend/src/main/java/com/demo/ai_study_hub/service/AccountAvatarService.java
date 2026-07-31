package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.dto.FileUploadResult;
import com.demo.ai_study_hub.dto.ProfileResponse;
import com.demo.ai_study_hub.entity.User;
import com.demo.ai_study_hub.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AccountAvatarService {

    private final UserRepository userRepository;
    private final CloudinaryStorageService cloudinaryStorageService;
    private final AccountProfileService accountProfileService;

    private static final long MAX_AVATAR_SIZE = 5L * 1024 * 1024; // 5MB
    private static final List<String> ALLOWED_AVATAR_TYPES = List.of(
            "image/png",
            "image/jpg",
            "image/jpeg",
            "image/webp"
    );

    @Transactional
    public ProfileResponse uploadAvatar(User user, MultipartFile file) {
        if ("BLOCKED".equals(user.getStatus())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "AUTH_ACCOUNT_BLOCKED");
        }

        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File is required");
        }

        if (file.getSize() > MAX_AVATAR_SIZE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Avatar size exceeds 5MB");
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_AVATAR_TYPES.contains(contentType.toLowerCase())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Avatar must be PNG, JPG, JPEG, or WEBP.");
        }

        String originalFilename = file.getOriginalFilename();
        if (originalFilename != null) {
            String lowerName = originalFilename.toLowerCase();
            if (!lowerName.endsWith(".png") && !lowerName.endsWith(".jpg") &&
                !lowerName.endsWith(".jpeg") && !lowerName.endsWith(".webp")) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid file extension");
            }
        } else {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid file name");
        }

        // Delete old avatar if exists
        if (user.getAvatarPublicId() != null) {
            cloudinaryStorageService.deleteFile(user.getAvatarPublicId(), "image");
        }

        FileUploadResult result = cloudinaryStorageService.uploadAvatar(file, user.getUserId());

        user.setAvatarUrl(result.getFileUrl());
        user.setAvatarPublicId(result.getPublicId());
        user = userRepository.save(user);

        return accountProfileService.mapToResponse(user);
    }
}
