package com.demo.ai_study_hub;

import com.demo.ai_study_hub.dto.FileUploadResult;
import com.demo.ai_study_hub.dto.ProfileResponse;
import com.demo.ai_study_hub.entity.User;
import com.demo.ai_study_hub.enums.UserTier;
import com.demo.ai_study_hub.repository.UserRepository;
import com.demo.ai_study_hub.service.AccountAvatarService;
import com.demo.ai_study_hub.service.AccountProfileService;
import com.demo.ai_study_hub.service.CloudinaryStorageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AccountAvatarServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private CloudinaryStorageService cloudinaryStorageService;

    @Mock
    private AccountProfileService accountProfileService;

    @InjectMocks
    private AccountAvatarService accountAvatarService;

    private User testUser;
    private MockMultipartFile validFile;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setUserId(1);
        testUser.setStatus("ACTIVE");
        testUser.setTier(UserTier.FREE);

        validFile = new MockMultipartFile(
                "file", "avatar.png", "image/png", "dummy image content".getBytes()
        );
    }

    @Test
    void uploadAvatar_Success() {
        FileUploadResult uploadResult = FileUploadResult.builder()
                .fileUrl("http://cloud/avatar.png")
                .publicId("pub_123")
                .build();

        when(cloudinaryStorageService.uploadAvatar(any(), eq(1))).thenReturn(uploadResult);
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));
        ProfileResponse mockResponse = ProfileResponse.builder().avatarUrl("http://cloud/avatar.png").build();
        when(accountProfileService.mapToResponse(any(User.class))).thenReturn(mockResponse);

        ProfileResponse response = accountAvatarService.uploadAvatar(testUser, validFile);

        assertNotNull(response);
        assertEquals("http://cloud/avatar.png", response.getAvatarUrl());
        verify(userRepository, times(1)).save(testUser);
        assertEquals("http://cloud/avatar.png", testUser.getAvatarUrl());
        assertEquals("pub_123", testUser.getAvatarPublicId());
    }

    @Test
    void uploadAvatar_DeletesOldAvatar() {
        testUser.setAvatarPublicId("old_pub_id");

        FileUploadResult uploadResult = FileUploadResult.builder()
                .fileUrl("http://cloud/avatar.png")
                .publicId("pub_123")
                .build();

        when(cloudinaryStorageService.uploadAvatar(any(), eq(1))).thenReturn(uploadResult);
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));
        when(accountProfileService.mapToResponse(any(User.class))).thenReturn(ProfileResponse.builder().build());

        accountAvatarService.uploadAvatar(testUser, validFile);

        verify(cloudinaryStorageService, times(1)).deleteFile("old_pub_id", "image");
    }

    @Test
    void uploadAvatar_ThrowsIfBlocked() {
        testUser.setStatus("BLOCKED");
        assertThrows(ResponseStatusException.class, () ->
                accountAvatarService.uploadAvatar(testUser, validFile));
    }

    @Test
    void uploadAvatar_ThrowsIfInvalidContentType() {
        MockMultipartFile invalidFile = new MockMultipartFile(
                "file", "avatar.txt", "text/plain", "text".getBytes()
        );
        assertThrows(ResponseStatusException.class, () ->
                accountAvatarService.uploadAvatar(testUser, invalidFile));
    }

    @Test
    void uploadAvatar_ThrowsIfFileTooLarge() {
        byte[] largeContent = new byte[6 * 1024 * 1024]; // 6MB
        MockMultipartFile largeFile = new MockMultipartFile(
                "file", "avatar.png", "image/png", largeContent
        );
        assertThrows(ResponseStatusException.class, () ->
                accountAvatarService.uploadAvatar(testUser, largeFile));
    }
}
