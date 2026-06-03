package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.dto.DocumentResponse;
import com.demo.ai_study_hub.dto.FileUploadResult;
import com.demo.ai_study_hub.entity.Document;
import com.demo.ai_study_hub.entity.User;
import com.demo.ai_study_hub.repository.DocumentRepository;
import com.demo.ai_study_hub.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DocumentService {

    private final DocumentRepository documentRepository;
    private final UserRepository userRepository;
    private final FirebaseStorageService firebaseStorageService;

    public DocumentResponse uploadDocument(MultipartFile file, String title, String description, String email) {
        if (title == null || title.trim().isEmpty()) {
            throw new IllegalArgumentException("Title is required");
        }

        User owner = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        FileUploadResult uploadResult = firebaseStorageService.uploadFile(file, owner.getUserId());

        Document doc = new Document();
        doc.setTitle(title);
        doc.setDescription(description);
        doc.setFileName(uploadResult.getFileName());
        doc.setFileType(uploadResult.getFileType());
        doc.setFileSize(uploadResult.getFileSize());
        String url = uploadResult.getFileUrl();
        doc.setFileUrl(url != null ? url : "PENDING_URL");
        doc.setStoragePath(uploadResult.getStoragePath());
        doc.setOwner(owner);

        Document savedDoc = documentRepository.save(doc);

        return mapToResponse(savedDoc);
    }

    public List<DocumentResponse> getMyDocuments(String email) {
        User owner = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return documentRepository.findByOwner_UserId(owner.getUserId())
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    private DocumentResponse mapToResponse(Document doc) {
        return DocumentResponse.builder()
                .documentId(doc.getDocumentId())
                .title(doc.getTitle())
                .description(doc.getDescription())
                .fileName(doc.getFileName())
                .fileType(doc.getFileType())
                .fileSize(doc.getFileSize())
                .fileUrl(doc.getFileUrl())
                .storagePath(doc.getStoragePath())
                .createdAt(doc.getCreatedAt())
                .build();
    }
}