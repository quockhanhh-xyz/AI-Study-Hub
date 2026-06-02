package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.dto.FileUploadResult;
import com.google.cloud.storage.Blob;
import com.google.cloud.storage.Bucket;
import com.google.firebase.cloud.StorageClient;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@Service
public class FirebaseStorageService {

    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    private static final List<String> ALLOWED_TYPES = List.of(
            "application/pdf",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            "text/plain",
            "image/png",
            "image/jpg",
            "image/jpeg"
    );

    public FileUploadResult uploadFile(MultipartFile file, Integer userId) {
        // Validate không rỗng
        if (file == null || file.isEmpty()) {
            throw new RuntimeException("File is required");
        }

        // Validate file size
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new RuntimeException("File size exceeds 10MB");
        }

        // Validate file type
        String contentType = file.getContentType();
        if (!ALLOWED_TYPES.contains(contentType)) {
            throw new RuntimeException("Invalid file type");
        }

        try {
            String originalName = file.getOriginalFilename();
            String extension = originalName.substring(originalName.lastIndexOf("."));
            String uniqueName = UUID.randomUUID() + extension;
            String storagePath = "documents/user-" + userId + "/" + uniqueName;

            Bucket bucket = StorageClient.getInstance().bucket();
            Blob blob = bucket.create(storagePath, file.getBytes(), contentType);

            String fileUrl = "https://storage.googleapis.com/" +
                    bucket.getName() + "/" + storagePath;

            String fileType = extension.replace(".", "").toUpperCase();

            return FileUploadResult.builder()
                    .fileUrl(fileUrl)
                    .storagePath(storagePath)
                    .fileName(originalName)
                    .fileType(fileType)
                    .fileSize(file.getSize())
                    .build();

        } catch (Exception e) {
            throw new RuntimeException("Firebase upload failed: " + e.getMessage());
        }
    }
}