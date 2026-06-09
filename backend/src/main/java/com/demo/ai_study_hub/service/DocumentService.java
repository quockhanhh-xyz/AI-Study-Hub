package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.dto.DocumentResponse;
import com.demo.ai_study_hub.dto.DocumentUpdateDTO;
import com.demo.ai_study_hub.dto.FileUploadResult;
import com.demo.ai_study_hub.entity.Document;
import com.demo.ai_study_hub.entity.Subject;
import com.demo.ai_study_hub.entity.User;
import com.demo.ai_study_hub.repository.DocumentRepository;
import com.demo.ai_study_hub.repository.SubjectRepository;
import com.demo.ai_study_hub.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DocumentService {
    private final DocumentRepository documentRepository;
    private final UserRepository userRepository;
    private final CloudinaryStorageService cloudinaryStorageService;
    private final SubjectRepository subjectRepository;

    public DocumentResponse uploadDocument(MultipartFile file, String title, String description, Integer subjectId, String email) {
        if (title == null || title.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Title is required");
        }

        User owner = userRepository.findByEmail(email).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        Subject subject = null;
        if (subjectId != null) {
            subject = subjectRepository.findById(subjectId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Subject not found"));
            if (!"ACTIVE".equals(subject.getStatus())) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Subject not found");
            }
        }

        FileUploadResult uploadResult = cloudinaryStorageService.uploadFile(file, owner.getUserId());

        String url = uploadResult.getFileUrl();
        if (url == null || url.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to generate download URL from Cloudinary");
        }

        Document doc = new Document();
        doc.setTitle(title);
        doc.setDescription(description);
        doc.setOriginalFileName(uploadResult.getOriginalFileName());
        doc.setFileType(uploadResult.getFileType());
        doc.setFileSize(uploadResult.getFileSize());
        doc.setFileUrl(url);
        doc.setPublicId(uploadResult.getPublicId());
        doc.setOwner(owner);
        doc.setStatus("ACTIVE");
        doc.setSubject(subject);

        Document savedDoc = documentRepository.save(doc);
        return mapToResponse(savedDoc);
    }

    public List<DocumentResponse> getMyDocumentsWithFilters(String email, String keyword, Integer subjectId, String fileType) {
        User owner = userRepository.findByEmail(email).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        return documentRepository.findMyDocumentsWithFilters(owner, keyword, subjectId, fileType).stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    public DocumentResponse getDocumentDetail(Integer documentId, String email) {
        User owner = userRepository.findByEmail(email).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        Document doc = getValidatedDocument(documentId, owner);
        return mapToResponse(doc);
    }

    public DocumentResponse updateDocument(Integer documentId, DocumentUpdateDTO dto, String email) {
        User owner = userRepository.findByEmail(email).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        Document doc = getValidatedDocument(documentId, owner);

        if (dto.getTitle() != null) {
            if (dto.getTitle().trim().isEmpty()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Title is required");
            }
            doc.setTitle(dto.getTitle());
        }
        if (dto.getDescription() != null) {
            doc.setDescription(dto.getDescription());
        }
        if (dto.getSubjectId() != null) {
            Subject subject = subjectRepository.findById(dto.getSubjectId()).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Subject not found"));
            if (!"ACTIVE".equals(subject.getStatus())) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Subject not found");
            }
            doc.setSubject(subject);
        }

        Document updatedDoc = documentRepository.save(doc);
        return mapToResponse(updatedDoc);
    }

    public void deleteDocument(Integer documentId, String email) {
        User owner = userRepository.findByEmail(email).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        Document doc = getValidatedDocument(documentId, owner);

        doc.setStatus("DELETED");
        documentRepository.save(doc);
    }

    private Document getValidatedDocument(Integer documentId, User owner) {
        Document doc = documentRepository.findById(documentId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));

        if ("DELETED".equals(doc.getStatus())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found");
        }

        if (!doc.getOwner().getUserId().equals(owner.getUserId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }

        return doc;
    }

    private DocumentResponse mapToResponse(Document doc) {
        return DocumentResponse.builder()
                .documentId(doc.getDocumentId())
                .title(doc.getTitle())
                .description(doc.getDescription())
                .subjectId(doc.getSubject() != null ? doc.getSubject().getSubjectId() : null)
                .subjectCode(doc.getSubject() != null ? doc.getSubject().getSubjectCode() : null)
                .subjectName(doc.getSubject() != null ? doc.getSubject().getSubjectName() : null)
                .originalFileName(doc.getOriginalFileName())
                .fileType(doc.getFileType())
                .fileSize(doc.getFileSize())
                .fileUrl(doc.getFileUrl())
                .publicId(doc.getPublicId())
                .uploadedBy(doc.getOwner().getEmail())
                .status(doc.getStatus())
                .createdAt(doc.getCreatedAt())
                .updatedAt(doc.getUpdatedAt())
                .build();
    }
}