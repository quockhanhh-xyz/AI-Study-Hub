package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.dto.DocumentResponse;
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

    public DocumentResponse uploadDocument(MultipartFile file, String title, String description, String email) {
        User owner = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        String dummyFileUrl = "https://firebasestorage.googleapis.com/v0/b/test/dummy-link-" + file.getOriginalFilename();
        String dummyStoragePath = "documents/user-" + owner.getUserId() + "/" + file.getOriginalFilename();

        Document doc = new Document();
        doc.setTitle(title);
        doc.setDescription(description);
        doc.setFileName(file.getOriginalFilename());
        doc.setFileType(file.getContentType());
        doc.setFileSize(file.getSize());
        doc.setFileUrl(dummyFileUrl);
        doc.setStoragePath(dummyStoragePath);
        doc.setOwner(owner);

        Document savedDoc = documentRepository.save(doc);

        return mapToResponse(savedDoc);
    }

    public List<DocumentResponse> getMyDocuments(String email) {
        User owner = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<Document> documents = documentRepository.findByOwner_UserId(owner.getUserId());

        return documents.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    private DocumentResponse mapToResponse(Document doc) {
        return DocumentResponse.builder()
                .documentId(doc.getDocumentId())
                .title(doc.getTitle())
                .fileName(doc.getFileName())
                .fileType(doc.getFileType())
                .fileSize(doc.getFileSize())
                .fileUrl(doc.getFileUrl())
                .storagePath(doc.getStoragePath())
                .createdAt(doc.getCreatedAt())
                .build();
    }
}