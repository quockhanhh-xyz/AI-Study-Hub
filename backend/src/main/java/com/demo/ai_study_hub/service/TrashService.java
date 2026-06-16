package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.dto.TrashResponse;
import com.demo.ai_study_hub.entity.Document;
import com.demo.ai_study_hub.entity.Folder;
import com.demo.ai_study_hub.entity.User;
import com.demo.ai_study_hub.repository.DocumentRepository;
import com.demo.ai_study_hub.repository.FolderRepository;
import com.demo.ai_study_hub.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TrashService {

    private final DocumentRepository documentRepository;
    private final FolderRepository folderRepository;
    private final UserRepository userRepository;
    private final CloudinaryStorageService cloudinaryStorageService;

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }

    @Transactional(readOnly = true)
    public TrashResponse getTrash(String email) {
        User user = getUser(email);

        List<Document> deletedDocs = documentRepository.findByOwner_UserIdAndStatus(user.getUserId(), "DELETED");
        List<Folder> deletedFolders = folderRepository.findByOwnerAndStatusOrderByCreatedAtDesc(user, "DELETED");

        List<TrashResponse.TrashDocumentItem> docItems = deletedDocs.stream()
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

        List<TrashResponse.TrashFolderItem> folderItems = deletedFolders.stream()
                .map(f -> TrashResponse.TrashFolderItem.builder()
                        .folderId(f.getFolderId())
                        .folderName(f.getName())
                        .description(f.getDescription())
                        .parentFolderId(f.getParentFolder() != null ? f.getParentFolder().getFolderId() : null)
                        .deletedAt(f.getDeletedAt())
                        .build())
                .collect(Collectors.toList());

        return TrashResponse.builder()
                .documents(docItems)
                .folders(folderItems)
                .build();
    }

    @Transactional
    public void restoreDocument(Integer docId, String email) {
        User user = getUser(email);
        Document doc = documentRepository.findById(docId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found in trash"));

        if (!doc.getOwner().getUserId().equals(user.getUserId()) || !"DELETED".equals(doc.getStatus())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found in trash");
        }

        doc.setStatus("ACTIVE");
        doc.setDeletedAt(null);
        documentRepository.save(doc);
    }

    @Transactional
    public void permanentDeleteDocument(Integer docId, String email) {
        User user = getUser(email);

        Document doc = documentRepository.findById(docId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found in trash"));

        if (!doc.getOwner().getUserId().equals(user.getUserId()) || !"DELETED".equals(doc.getStatus())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found in trash");
        }

        cloudinaryStorageService.deleteFile(doc.getPublicId(), doc.getFileType());

        documentRepository.delete(doc);
    }

    @Transactional
    public void restoreFolder(Integer folderId, String email) {
        User user = getUser(email);
        Folder folder = folderRepository.findByFolderIdAndOwner(folderId, user)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Folder not found in trash"));

        if (!"DELETED".equals(folder.getStatus())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Folder not found in trash");
        }


        if (folder.getParentFolder() != null && "DELETED".equals(folder.getParentFolder().getStatus())) {
            folder.setParentFolder(null);
        }

        folder.setStatus("ACTIVE");
        folder.setDeletedAt(null);
        folderRepository.save(folder);

    }

    @Transactional
    public void permanentDeleteFolder(Integer folderId, String email) {
        User user = getUser(email);
        Folder folder = folderRepository.findByFolderIdAndOwner(folderId, user)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Folder not found in trash"));

        if (!"DELETED".equals(folder.getStatus())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Folder not found in trash");
        }


        folderRepository.delete(folder);
    }
}
