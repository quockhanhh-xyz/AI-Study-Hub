package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.dto.FileUploadResult;
import com.google.cloud.storage.Bucket;
import com.google.firebase.cloud.StorageClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@Service
public class FirebaseStorageService {

    @Value("${firebase.enabled:false}")
    private boolean firebaseEnabled;

    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024;
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
        if (!firebaseEnabled) {
            throw new RuntimeException("Firebase is not enabled. Set FIREBASE_ENABLED=true to use file upload.");
        }

        if (file == null || file.isEmpty()) {
            throw new RuntimeException("File is required");
        }

        if (file.getSize() > MAX_FILE_SIZE) {
            throw new RuntimeException("File size exceeds 10MB");
        }

        String contentType = file.getContentType();
        if (!ALLOWED_TYPES.contains(contentType)) {
            throw new RuntimeException("Invalid file type");
        }

        String originalName = file.getOriginalFilename();
        if (originalName == null || !originalName.contains(".")) {
            throw new RuntimeException("Invalid file name");
        }

        try {
            String extension = originalName.substring(originalName.lastIndexOf("."));
            String uniqueName = UUID.randomUUID() + extension;
            String storagePath = "documents/user-" + userId + "/" + uniqueName;
            Bucket bucket = StorageClient.getInstance().bucket();

            String downloadToken = UUID.randomUUID().toString();

            com.google.cloud.storage.BlobId blobId = com.google.cloud.storage.BlobId.of(bucket.getName(), storagePath);
            com.google.cloud.storage.BlobInfo blobInfo = com.google.cloud.storage.BlobInfo.newBuilder(blobId)
                    .setContentType(contentType)
                    .setMetadata(java.util.Map.of("firebaseStorageDownloadTokens", downloadToken))
                    .build();

            bucket.getStorage().create(blobInfo, file.getBytes());

            String fileUrl = String.format(
                    "https://firebasestorage.googleapis.com/v0/b/%s/o/%s?alt=media&token=%s",
                    bucket.getName(),
                    java.net.URLEncoder.encode(storagePath, java.nio.charset.StandardCharsets.UTF_8),
                    downloadToken
            );

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