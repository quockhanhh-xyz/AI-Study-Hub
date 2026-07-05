package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.dto.EmptyTrashResponse;
import com.demo.ai_study_hub.dto.TrashResponse;
import com.demo.ai_study_hub.entity.Document;
import com.demo.ai_study_hub.entity.Folder;
import com.demo.ai_study_hub.entity.User;
import com.demo.ai_study_hub.repository.DocumentRepository;
import com.demo.ai_study_hub.repository.DocumentShareRepository;
import com.demo.ai_study_hub.repository.FolderRepository;
import com.demo.ai_study_hub.repository.FolderShareRepository;
import com.demo.ai_study_hub.repository.GroupDocumentShareRepository;
import com.demo.ai_study_hub.repository.GroupFolderShareRepository;
import com.demo.ai_study_hub.repository.UserRepository;
import com.demo.ai_study_hub.exception.QuotaExceededException;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
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
    private final FolderShareRepository folderShareRepository;
    private final GroupFolderShareRepository groupFolderShareRepository;
    private final DocumentShareRepository documentShareRepository;
    private final GroupDocumentShareRepository groupDocumentShareRepository;
    private final PlatformTransactionManager transactionManager;
    private final TierPolicyService tierPolicyService;
    private final UsageService usageService;

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
                        .type("DOCUMENT")
                        .documentId(d.getDocumentId())
                        .title(d.getTitle())
                        .originalFileName(d.getOriginalFileName())
                        .fileType(d.getFileType())
                        .fileSize(d.getFileSize())
                        .folderId(d.getFolder() != null ? d.getFolder().getFolderId() : null)
                        .originalFolderName(d.getFolder() != null ? d.getFolder().getName() : null)
                        .deletedAt(d.getDeletedAt())
                        .build())
                .collect(Collectors.toList());

        List<TrashResponse.TrashFolderItem> folderItems = deletedFolders.stream()
                .map(f -> TrashResponse.TrashFolderItem.builder()
                        .type("FOLDER")
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

        boolean deleted = cloudinaryStorageService.deleteFile(doc.getPublicId(), doc.getFileType());
        if (!deleted) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                "Unable to delete remote file. Please try again.");
        }

        documentShareRepository.deleteByDocument(doc);
        groupDocumentShareRepository.deleteByDocument(doc);
        documentRepository.delete(doc);
    }

    @Transactional
    public void restoreFolder(Integer folderId, String email) {
        User user = getUser(email);
        user = userRepository.findByIdForUpdate(user.getUserId()).orElse(user);

        Folder folder = folderRepository.findByFolderIdAndOwner(folderId, user)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Folder not found in trash"));

        if (!"DELETED".equals(folder.getStatus())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Folder not found in trash");
        }

        if (folder.getParentFolder() != null && "DELETED".equals(folder.getParentFolder().getStatus())) {
            folder.setParentFolder(null);
        }

        // Collect descendant folders and documents that are currently in status DELETED
        List<Folder> toRestoreFolders = new ArrayList<>();
        List<Document> toRestoreDocuments = new ArrayList<>();
        toRestoreFolders.add(folder);
        collectSubtree(folder, toRestoreFolders, toRestoreDocuments);

        com.demo.ai_study_hub.dto.TierLimits limits = tierPolicyService.getLimitsForUser(user);

        // 1. Check folder count limit
        long currentFolders = usageService.countFolders(user);
        if (currentFolders > limits.maxFolders()) {
            throw new QuotaExceededException(HttpStatus.FORBIDDEN,
                    "Restoring this folder would exceed your folder count limit", "FOLDER_LIMIT_EXCEEDED");
        }

        // 2. Check document count limit
        long currentDocs = usageService.countDocuments(user);
        if (currentDocs > limits.maxDocuments()) {
            throw new QuotaExceededException(HttpStatus.FORBIDDEN,
                    "Restoring this folder would exceed your document count limit", "DOCUMENT_LIMIT_EXCEEDED");
        }

        // 3. Check storage limit
        long currentStorage = usageService.countStorageBytes(user);
        if (currentStorage > limits.storageBytes()) {
            throw new QuotaExceededException(HttpStatus.FORBIDDEN,
                    "Restoring this folder would exceed your storage quota limit", "STORAGE_LIMIT_EXCEEDED");
        }

        // 4. Check folder depth limit
        int parentDepth = 0;
        if (folder.getParentFolder() != null) {
            Integer pd = folderRepository.findFolderDepth(folder.getParentFolder().getFolderId());
            parentDepth = (pd != null) ? pd + 1 : 1;
        }
        int maxSubtreeHeight = getSubtreeHeight(folder);
        int finalMaxDepth = parentDepth + maxSubtreeHeight;
        if (finalMaxDepth >= limits.maxFolderDepth()) {
            throw new QuotaExceededException(HttpStatus.BAD_REQUEST,
                    "Restoring this folder would exceed the maximum folder depth allowed", "FOLDER_DEPTH_LIMIT_EXCEEDED");
        }

        // Apply restoration cascadingly to entire collected subtree
        for (Folder f : toRestoreFolders) {
            f.setStatus("ACTIVE");
            f.setDeletedAt(null);
            folderRepository.save(f);
        }
        for (Document d : toRestoreDocuments) {
            d.setStatus("ACTIVE");
            d.setDeletedAt(null);
            documentRepository.save(d);
        }
    }

    private void collectSubtree(Folder current, List<Folder> toRestoreFolders, List<Document> toRestoreDocuments) {
        List<Folder> subfolders = folderRepository.findByOwnerAndStatusAndParentFolder(current.getOwner(), "DELETED", current);
        for (Folder sub : subfolders) {
            toRestoreFolders.add(sub);
            collectSubtree(sub, toRestoreFolders, toRestoreDocuments);
        }
        List<Document> docs = documentRepository.findByFolder(current).stream()
                .filter(d -> "DELETED".equals(d.getStatus()))
                .collect(Collectors.toList());
        toRestoreDocuments.addAll(docs);
    }

    private int getSubtreeHeight(Folder current) {
        List<Folder> subfolders = folderRepository.findByOwnerAndStatusAndParentFolder(current.getOwner(), "DELETED", current);
        int maxSubHeight = 0;
        for (Folder sub : subfolders) {
            maxSubHeight = Math.max(maxSubHeight, getSubtreeHeight(sub));
        }
        return subfolders.isEmpty() ? 0 : 1 + maxSubHeight;
    }

    @Transactional
    public void permanentDeleteFolder(Integer folderId, String email) {
        User user = getUser(email);
        Folder folder = folderRepository.findByFolderIdAndOwner(folderId, user)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Folder not found in trash"));

        if (!"DELETED".equals(folder.getStatus())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Folder not found in trash");
        }

        folderShareRepository.deleteByFolder(folder);
        groupFolderShareRepository.deleteByFolder(folder);
        folderRepository.delete(folder);
    }

    public EmptyTrashResponse emptyTrash(String email) {
        User user = getUser(email);

        List<Document> trashedDocs = documentRepository.findByOwner_UserIdAndStatus(user.getUserId(), "DELETED");
        List<Folder> trashedFolders = folderRepository.findByOwnerAndStatusOrderByCreatedAtDesc(user, "DELETED");

        int deletedCount = 0;
        List<EmptyTrashResponse.FailureItem> failures = new ArrayList<>();

        TransactionTemplate txTemplate = new TransactionTemplate(transactionManager);
        txTemplate.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);

        for (Document doc : trashedDocs) {
            boolean cloudinaryDeleted = cloudinaryStorageService.deleteFile(doc.getPublicId(), doc.getFileType());
            if (!cloudinaryDeleted) {
                log.warn("Cloudinary file deletion failed during empty trash. publicId={}", doc.getPublicId());
                failures.add(EmptyTrashResponse.FailureItem.builder()
                    .type("DOCUMENT")
                    .id(doc.getDocumentId())
                    .title(doc.getTitle())
                    .reason("Cloudinary delete failed")
                    .build());
                continue;
            }

            try {
                Integer docId = doc.getDocumentId();
                txTemplate.executeWithoutResult(status -> {
                    Document managedDoc = documentRepository.findById(docId).orElseThrow();
                    documentShareRepository.deleteByDocument(managedDoc);
                    groupDocumentShareRepository.deleteByDocument(managedDoc);
                    documentRepository.delete(managedDoc);
                    documentRepository.flush();
                });
                deletedCount++;
            } catch (Exception e) {
                log.error("Database cleanup failed for document {} during empty trash", doc.getDocumentId(), e);
                failures.add(EmptyTrashResponse.FailureItem.builder()
                    .type("DOCUMENT")
                    .id(doc.getDocumentId())
                    .title(doc.getTitle())
                    .reason("Database cleanup failed")
                    .build());
            }
        }

        java.util.Map<Integer, Integer> depthCache = trashedFolders.stream()
            .collect(Collectors.toMap(Folder::getFolderId, this::getFolderDepth));

        List<Folder> sortedFolders = trashedFolders.stream()
            .sorted((a, b) -> Integer.compare(
                depthCache.get(b.getFolderId()),
                depthCache.get(a.getFolderId())))
            .collect(Collectors.toList());

        for (Folder folder : sortedFolders) {
            try {
                Integer folderId = folder.getFolderId();
                txTemplate.executeWithoutResult(status -> {
                    Folder managedFolder = folderRepository.findById(folderId).orElseThrow();
                    folderShareRepository.deleteByFolder(managedFolder);
                    groupFolderShareRepository.deleteByFolder(managedFolder);
                    folderRepository.delete(managedFolder);
                    folderRepository.flush();
                });
                deletedCount++;
            } catch (Exception e) {
                log.error("Database cleanup failed for folder {} during empty trash", folder.getFolderId(), e);
                failures.add(EmptyTrashResponse.FailureItem.builder()
                    .type("FOLDER")
                    .id(folder.getFolderId())
                    .title(folder.getName())
                    .reason("Database cleanup failed")
                    .build());
            }
        }

        String outcome;
        if (failures.isEmpty()) {
            outcome = "SUCCESS";
        } else if (deletedCount > 0) {
            outcome = "PARTIAL_SUCCESS";
        } else {
            outcome = "FAILED";
        }

        return EmptyTrashResponse.builder()
                .outcome(outcome)
                .deletedCount(deletedCount)
                .failedCount(failures.size())
                .failures(failures)
                .build();
    }

    private int getFolderDepth(Folder folder) {
        Integer depth = folderRepository.findFolderDepth(folder.getFolderId());
        return depth != null ? depth : 0;
    }
}
