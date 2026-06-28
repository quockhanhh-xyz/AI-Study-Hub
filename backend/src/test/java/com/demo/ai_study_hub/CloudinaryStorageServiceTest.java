package com.demo.ai_study_hub;

import com.cloudinary.Cloudinary;
import com.cloudinary.Uploader;
import com.demo.ai_study_hub.service.CloudinaryStorageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CloudinaryStorageServiceTest {

    @Mock
    private Cloudinary cloudinary;

    @Mock
    private Uploader uploader;

    private CloudinaryStorageService cloudinaryStorageService;

    @BeforeEach
    void setUp() {
        cloudinaryStorageService = new CloudinaryStorageService(Optional.of(cloudinary));
        ReflectionTestUtils.setField(cloudinaryStorageService, "cloudinaryEnabled", true);
        lenient().when(cloudinary.uploader()).thenReturn(uploader);
    }

    @Test
    void deleteFile_WhenCloudinaryReturnsOk_ShouldReturnTrue() throws Exception {
        Map<String, Object> result = new HashMap<>();
        result.put("result", "ok");
        when(uploader.destroy(eq("public-1"), any())).thenReturn(result);

        boolean deleted = cloudinaryStorageService.deleteFile("public-1", "PDF");

        assertTrue(deleted);
    }

    @Test
    void deleteFile_WhenCloudinaryReturnsNotFound_ShouldReturnTrue() throws Exception {
        Map<String, Object> result = new HashMap<>();
        result.put("result", "not found");
        when(uploader.destroy(eq("public-missing"), any())).thenReturn(result);

        boolean deleted = cloudinaryStorageService.deleteFile("public-missing", "PDF");

        assertTrue(deleted, "Cloudinary 'not found' result must be treated as successful deletion to avoid stuck retry items");
    }

    @Test
    void deleteFile_WhenCloudinaryReturnsOtherError_ShouldReturnFalse() throws Exception {
        Map<String, Object> result = new HashMap<>();
        result.put("result", "error");
        when(uploader.destroy(eq("public-error"), any())).thenReturn(result);

        boolean deleted = cloudinaryStorageService.deleteFile("public-error", "PDF");

        assertFalse(deleted);
    }

    @Test
    void deleteFile_WhenCloudinaryThrowsException_ShouldReturnFalse() throws Exception {
        when(uploader.destroy(eq("public-timeout"), any())).thenThrow(new RuntimeException("Connection timeout"));

        boolean deleted = cloudinaryStorageService.deleteFile("public-timeout", "PDF");

        assertFalse(deleted);
    }

    @Test
    void deleteFile_WhenCloudinaryDisabled_ShouldReturnFalse() {
        ReflectionTestUtils.setField(cloudinaryStorageService, "cloudinaryEnabled", false);

        boolean deleted = cloudinaryStorageService.deleteFile("public-1", "PDF");

        assertFalse(deleted);
    }
}
