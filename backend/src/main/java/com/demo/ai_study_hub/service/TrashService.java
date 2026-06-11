package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.dto.TrashResponse;
import com.demo.ai_study_hub.entity.Document;
import com.demo.ai_study_hub.entity.Folder;
import com.demo.ai_study_hub.entity.User;
import com.demo.ai_study_hub.repository.DocumentRepository;
import com.demo.ai_study_hub.repository.FolderRepository;
import com.demo.ai_study_hub.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TrashService {

    private static final Logger log = LoggerFactory.getLogger(TrashService.class);

    private final DocumentRepository documentRepository;
    private final FolderRepository folderRepository;
    private final UserRepository userRepository;
    private final CloudinaryStorageService cloudinaryStorageService;

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }

    public TrashResponse getTrash(String email) {
        User user = getUser(email);

        List<TrashResponse.TrashDocumentItem> documents = documentRepository
                .findByOwner_UserIdAndStatus(user.getUserId(), "DELETED")
                .stream()
                .map(d -> TrashResponse.TrashDocumentItem.builder()
                        .documentId(d.getDocumentId())
                        .title(d.getTitle())
                        .originalFileName(d.getOriginalFileName())
                        .fileType(d.getFileType())
                        .fileSize(d.getFileSize())
                        .folderId(d.getFolder() != null ? d.getFolder().getFolderId() : null)
                        .deletedAt(d.getDeletedAt())
                        .build())
                .collect(Collectors.toList());

        List<TrashResponse.TrashFolderItem> folders = folderRepository
                .findByOwnerAndStatusOrderByCreatedAtDesc(user, "DELETED")
                .stream()
                .map(f -> TrashResponse.TrashFolderItem.builder()
                        .folderId(f.getFolderId())
                        .name(f.getName())
                        .deletedAt(f.getDeletedAt())
                        .build())
                .collect(Collectors.toList());

        return TrashResponse.builder()
                .documents(documents)
                .folders(folders)
                .build();
    }

    public void restoreDocument(Integer documentId, String email) {
        User user = getUser(email);
        Document doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found in trash"));

        if (!doc.getOwner().getUserId().equals(user.getUserId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }
        if (!"DELETED".equals(doc.getStatus())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found in trash");
        }

        if (doc.getFolder() != null && "DELETED".equals(doc.getFolder().getStatus())) {
            doc.setFolder(null);
        }

        doc.setStatus("ACTIVE");
        doc.setDeletedAt(null);
        documentRepository.save(doc);
    }

    public void permanentDeleteDocument(Integer documentId, String email) {
        User user = getUser(email);
        Document doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found in trash"));

        if (!doc.getOwner().getUserId().equals(user.getUserId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }
        if (!"DELETED".equals(doc.getStatus())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found in trash");
        }

        if (doc.getPublicId() != null) {
            boolean deleted = cloudinaryStorageService.deleteFile(doc.getPublicId(), doc.getFileType());
            if (!deleted) {
                log.warn("Cloudinary delete failed for publicId={}", doc.getPublicId());
            }
        }

        documentRepository.delete(doc);
    }

    public void restoreFolder(Integer folderId, String email) {
        User user = getUser(email);
        Folder folder = folderRepository.findByFolderIdAndOwner(folderId, user)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Folder not found in trash"));

        if (!"DELETED".equals(folder.getStatus())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Folder not found in trash");
        }

        LocalDateTime folderDeletedAt = folder.getDeletedAt();
        if (folderDeletedAt != null) {
            List<Document> docsToRestore = documentRepository
                    .findByOwner_UserIdAndStatus(user.getUserId(), "DELETED")
                    .stream()
                    .filter(d -> d.getFolder() != null
                            && d.getFolder().getFolderId().equals(folderId)
                            && folderDeletedAt.equals(d.getDeletedAt()))
                    .collect(Collectors.toList());

            docsToRestore.forEach(d -> {
                d.setStatus("ACTIVE");
                d.setDeletedAt(null);
                documentRepository.save(d);
            });
        }

        folder.setStatus("ACTIVE");
        folder.setDeletedAt(null);
        folderRepository.save(folder);
    }

    public void permanentDeleteFolder(Integer folderId, String email) {
        User user = getUser(email);
        Folder folder = folderRepository.findByFolderIdAndOwner(folderId, user)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Folder not found in trash"));

        if (!"DELETED".equals(folder.getStatus())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Folder not found in trash");
        }

        List<Document> allDocs = documentRepository.findByFolder(folder);
        allDocs.forEach(d -> {
            if (d.getPublicId() != null) {
                boolean deleted = cloudinaryStorageService.deleteFile(d.getPublicId(), d.getFileType());
                if (!deleted) {
                    log.warn("Cloudinary delete failed for publicId={}", d.getPublicId());
                }
            }
            documentRepository.delete(d);
        });

        folderRepository.delete(folder);
    }
}
