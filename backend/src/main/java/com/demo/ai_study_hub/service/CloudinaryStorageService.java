package com.demo.ai_study_hub.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.demo.ai_study_hub.dto.FileUploadResult;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class CloudinaryStorageService {

    private final Optional<Cloudinary> cloudinary;

    @Value("${cloudinary.enabled:false}")
    private boolean cloudinaryEnabled;

    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024;
    private static final List<String> ALLOWED_TYPES = List.of(
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-powerpoint",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "text/plain",
            "image/png",
            "image/jpg",
            "image/jpeg"
    );

    public CloudinaryStorageService(Optional<Cloudinary> cloudinary) {
        this.cloudinary = cloudinary;
    }

    public FileUploadResult uploadFile(MultipartFile file, Integer userId) {
        if (!cloudinaryEnabled) {
            throw new RuntimeException("Cloudinary is not enabled. Set CLOUDINARY_ENABLED=true to use file upload.");
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
            String fileType = extension.replace(".", "").toUpperCase();
            
            // PDF and Images are uploaded as "image" type so that they can be viewed inline in the browser.
            // Other document types (DOCX, XLSX, PPTX, TXT...) use "raw" type.
            String resourceType;
            String lowerContentType = contentType.toLowerCase();
            if (lowerContentType.startsWith("image/")) {
                resourceType = "image";
            } else {
                resourceType = "raw";
            }

            Map uploadResult = cloudinary.get().uploader().upload(
                    file.getBytes(),
                    ObjectUtils.asMap(
                            "folder", "ai-study-hub/documents/" + userId,
                            "resource_type", resourceType,
                            "use_filename", true,
                            "unique_filename", true
                    )
            );

            String fileUrl = (String) uploadResult.get("secure_url");
            String responsePublicId = (String) uploadResult.get("public_id");

            return FileUploadResult.builder()
                    .fileUrl(fileUrl)
                    .publicId(responsePublicId)
                    .originalFileName(originalName)
                    .fileType(fileType)
                    .fileSize(file.getSize())
                    .build();

        } catch (Exception e) {
            throw new RuntimeException("Cloudinary upload failed: " + e.getMessage());
        }
    }
    public boolean deleteFile(String publicId, String fileType) {
        if (!cloudinaryEnabled) {
            return false;
        }
        try {
            String resourceType;
            if (fileType != null) {
                String lower = fileType.toLowerCase();
                if (lower.equals("jpg") || lower.equals("jpeg") || lower.equals("png")) {
                    resourceType = "image";
                } else {
                    resourceType = "raw";
                }
            } else {
                resourceType = "raw";
            }

            Map result = cloudinary.get().uploader().destroy(
                    publicId,
                    ObjectUtils.asMap("resource_type", resourceType)
            );
            return "ok".equals(result.get("result"));
        } catch (Exception e) {
            return false;
        }
    }
}
