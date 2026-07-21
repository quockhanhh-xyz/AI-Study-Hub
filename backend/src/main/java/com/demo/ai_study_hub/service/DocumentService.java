package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.dto.DocumentDownloadInfo;
import com.demo.ai_study_hub.dto.DocumentResponse;
import com.demo.ai_study_hub.dto.DocumentUpdateDTO;
import com.demo.ai_study_hub.dto.FileUploadResult;
import com.demo.ai_study_hub.dto.PublicDocumentResponse;
import com.demo.ai_study_hub.entity.*;
import com.demo.ai_study_hub.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataAccessException;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import com.demo.ai_study_hub.exception.QuotaExceededException;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.ArrayList;
@Service
@RequiredArgsConstructor
public class DocumentService {
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(DocumentService.class);
    private final DocumentRepository documentRepository;
    private final UserRepository userRepository;
    private final CloudinaryStorageService cloudinaryStorageService;
    private final SubjectRepository subjectRepository;
    private final FolderRepository folderRepository;
    private final FolderShareService folderShareService;
    private final DocumentShareRepository documentShareRepository;
    private final GroupDocumentShareRepository groupDocumentShareRepository;
    private final StudyGroupMemberRepository studyGroupMemberRepository;
    private final DocumentContentRepository documentContentRepository;
    private final DocumentChunkRepository documentChunkRepository;
    private final TierPolicyService tierPolicyService;
    private final UsageService usageService;
    private final PlatformTransactionManager transactionManager;
    private final com.demo.ai_study_hub.repository.DocumentFavoriteRepository documentFavoriteRepository;
    private final DocumentPreviewHelper previewHelper;

    public DocumentResponse uploadDocument(MultipartFile file, String title, String description, Integer subjectId, Integer folderId, String email) {
        if (title == null || title.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Title is required");
        }

        // 1. Initial validation (no lock)
        User owner = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        if (subjectId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Subject is required");
        }
        Subject subject = subjectRepository.findById(subjectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Subject not found"));
        if (!"ACTIVE".equals(subject.getStatus())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Subject not found");
        }

        if ("USER_CUSTOM".equals(subject.getScope())
                && (subject.getOwner() == null || !subject.getOwner().getUserId().equals(owner.getUserId()))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You do not have access to this subject");
        }

        Folder folder = null;
        if (folderId != null) {
            folder = folderRepository.findById(folderId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Folder not found"));
            if (!"ACTIVE".equals(folder.getStatus())) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Folder not found");
            }
            if (!folder.getOwner().getUserId().equals(owner.getUserId())) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Folder not found");
            }
        }

        // Check file size limits initially
        com.demo.ai_study_hub.dto.TierLimits initialLimits = tierPolicyService.getLimitsForUser(owner);
        if (file.getSize() > initialLimits.maxFileBytes()) {
            throw new QuotaExceededException(HttpStatus.BAD_REQUEST,
                    "File size exceeds maximum tier limit", "FILE_SIZE_LIMIT_EXCEEDED");
        }

        boolean isDuplicate = documentRepository.existsDuplicate(
                owner,
                file.getOriginalFilename(),
                file.getSize(),
                folderId
        );
        if (isDuplicate) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "A file with the same name already exists in this folder.");
        }

        // 2. Upload to Cloudinary (outside transaction/lock)
        FileUploadResult uploadResult;
        try {
            uploadResult = cloudinaryStorageService.uploadFile(file, owner.getUserId());
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            log.error("Cloudinary upload failed or timed out", e);
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Cloudinary upload failed or timed out. Please try again.");
        }

        String url = uploadResult.getFileUrl();
        String publicId = uploadResult.getPublicId();
        String fileTypeForCleanup = uploadResult.getFileType();
        if (url == null || url.trim().isEmpty() || publicId == null || publicId.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to generate file URL or storage ID from Cloudinary");
        }

        // 3. Open transaction, lock user, check quota, and save metadata
        TransactionTemplate txTemplate = new TransactionTemplate(transactionManager);
        try {
            return txTemplate.execute(status -> {
                // Lock user for update
                User lockedOwner = userRepository.findByIdForUpdate(owner.getUserId())
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

                // Re-validate subject and folder in current hibernate session
                Subject txSubject = subjectRepository.findById(subjectId).orElseThrow();
                Folder txFolder = folderId != null ? folderRepository.findById(folderId).orElseThrow() : null;

                // Re-run duplicate check
                boolean isDup = documentRepository.existsDuplicate(
                        lockedOwner,
                        file.getOriginalFilename(),
                        file.getSize(),
                        folderId
                );
                if (isDup) {
                    throw new ResponseStatusException(HttpStatus.CONFLICT,
                            "A file with the same name already exists in this folder.");
                }

                // Final check on quota limits
                com.demo.ai_study_hub.dto.TierLimits limits = tierPolicyService.getLimitsForUser(lockedOwner);
                long docCount = usageService.countDocuments(lockedOwner);
                if (docCount >= limits.maxDocuments()) {
                    throw new QuotaExceededException(HttpStatus.FORBIDDEN,
                            "Documents count limit exceeded", "DOCUMENT_LIMIT_EXCEEDED");
                }
                long usedStorage = usageService.countStorageBytes(lockedOwner);
                if (usedStorage + file.getSize() > limits.storageBytes()) {
                    throw new QuotaExceededException(HttpStatus.FORBIDDEN,
                            "Storage quota exceeded", "STORAGE_LIMIT_EXCEEDED");
                }

                Document doc = new Document();
                doc.setTitle(title);
                doc.setDescription(description);
                doc.setOriginalFileName(uploadResult.getOriginalFileName());
                doc.setFileType(uploadResult.getFileType());
                doc.setFileSize(uploadResult.getFileSize());
                doc.setFileUrl(url);
                doc.setPublicId(publicId);
                doc.setOwner(lockedOwner);
                doc.setStatus("ACTIVE");
                doc.setSubject(txSubject);
                doc.setFolder(txFolder);

                Document savedDoc = documentRepository.saveAndFlush(doc);
                DocumentContent content = DocumentContent.builder()
                        .document(savedDoc)
                        .processingStatus(ProcessingStatus.PENDING)
                        .characterCount(0)
                        .originalCharacterCount(0)
                        .wordCount(0)
                        .isTruncated(false)
                        .build();
                Optional<DocumentContent> existingContent = documentContentRepository.findByDocument_DocumentId(savedDoc.getDocumentId());
                if (existingContent.isPresent()) {
                    savedDoc.setDocumentContent(existingContent.get());
                    log.warn("Document content already exists for documentId={}, reusing existing record.", savedDoc.getDocumentId());
                } else {
                    try {
                        DocumentContent savedContent = documentContentRepository.saveAndFlush(content);
                        savedDoc.setDocumentContent(savedContent != null ? savedContent : content);
                    } catch (DataAccessException contentException) {
                        DocumentContent recoveredContent = documentContentRepository
                                .findByDocument_DocumentId(savedDoc.getDocumentId())
                                .orElseThrow(() -> contentException);
                        savedDoc.setDocumentContent(recoveredContent);
                        log.warn("Document content already exists for documentId={}, reusing existing record.", savedDoc.getDocumentId());
                    }
                }

                return mapToResponse(savedDoc);
            });
        } catch (Exception e) {
            // Rollback happened, clean up Cloudinary file
            try {
                cloudinaryStorageService.deleteFile(publicId, fileTypeForCleanup);
            } catch (Exception ex) {
                log.error("Failed to clean up file from Cloudinary after metadata transaction rollback", ex);
            }
            if (e instanceof ResponseStatusException) {
                throw (ResponseStatusException) e;
            }
            if (e instanceof QuotaExceededException) {
                throw (QuotaExceededException) e;
            }
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Failed to save document metadata. Upload has been rolled back.");
        }
    }

    public List<DocumentResponse> getMyDocumentsWithFilters(
            String email, String keyword, Integer subjectId,
            String fileType, Integer folderId, Boolean includeSubfolders) {

        User owner = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        if (folderId != null && Boolean.TRUE.equals(includeSubfolders)) {
            List<Integer> allFolderIds = new ArrayList<>();
            allFolderIds.add(folderId);
            collectSubFolderIds(folderId, allFolderIds);
            List<Document> docs = documentRepository.findByOwnerAndFolderIds(owner, allFolderIds, keyword, subjectId, fileType);
            return mapToResponseList(docs, owner);
        }

        List<Document> docs = documentRepository.findMyDocumentsWithFilters(owner, keyword, subjectId, fileType, folderId);
        return mapToResponseList(docs, owner);
    }

    private void collectSubFolderIds(Integer parentId, List<Integer> result) {
        List<Integer> children = folderRepository.findSubFolderIdsByParentId(parentId);
        for (Integer childId : children) {
            result.add(childId);
            collectSubFolderIds(childId, result);
        }
    }

    public DocumentResponse moveDocument(Integer documentId, Integer folderId, String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        Document doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));

        if ("DELETED".equals(doc.getStatus())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found");
        }

        if (!doc.getOwner().getUserId().equals(user.getUserId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found");
        }

        if (folderId == null) {
            doc.setFolder(null);
        } else {
            Folder folder = folderRepository.findById(folderId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Folder not found"));

            if (!folder.getOwner().getUserId().equals(user.getUserId())) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Folder not found");
            }

            if (!"ACTIVE".equals(folder.getStatus())) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Folder not found");
            }

            doc.setFolder(folder);
        }

        documentRepository.save(doc);
        return mapToResponse(doc);
    }

    public DocumentResponse getDocumentDetail(Integer documentId, String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        Document doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));

        validateDocumentAccess(doc, user);

        return mapToResponse(doc, user);
    }

    public String getDocumentDownloadUrl(Integer documentId, String email) {
        return getDocumentDownloadInfo(documentId, email).getFileUrl();
    }

    public DocumentDownloadInfo getDocumentDownloadInfo(Integer documentId, String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        Document doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));

        validateDocumentAccess(doc, user);

        String normalizedFileType = normalizeFileType(doc);
        com.demo.ai_study_hub.enums.PreviewMode previewMode = previewHelper.getPreviewMode(normalizedFileType);

        return DocumentDownloadInfo.builder()
                .fileUrl(doc.getFileUrl())
                .fileName(resolveDownloadFileName(doc))
                .contentType(resolveContentType(doc))
                .mimeType(previewHelper.getMimeType(normalizedFileType))
                .resourceType(previewHelper.getResourceType(normalizedFileType))
                .previewUrl(previewHelper.getPreviewUrl(doc.getFileUrl(), previewMode))
                .downloadUrl("/api/documents/" + doc.getDocumentId() + "/download")
                .previewMode(previewMode)
                .build();
    }

    private void validateDocumentAccess(Document doc, User user) {
        if ("DELETED".equals(doc.getStatus())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found");
        }

        boolean isOwner = doc.getOwner().getUserId().equals(user.getUserId());

        boolean isDirectShared = !isOwner && documentShareRepository
                .findByDocumentAndSharedWithAndStatus(doc, user, "ACTIVE")
                .isPresent();

        boolean isGroupShared = false;
        if (!isOwner && !isDirectShared) {
            List<GroupDocumentShare> activeGroupShares = groupDocumentShareRepository.findByDocumentAndStatus(doc, "ACTIVE");
            for (GroupDocumentShare groupShare : activeGroupShares) {
                if (studyGroupMemberRepository.existsByGroupAndUserAndStatus(groupShare.getGroup(), user, "ACTIVE")) {
                    isGroupShared = true;
                    break;
                }
            }
        }

        boolean hasFolderAccess = !isOwner && !isDirectShared && !isGroupShared
                && doc.getFolder() != null
                && folderShareService != null
                && folderShareService.hasAccessToFolder(doc.getFolder().getFolderId(), user.getEmail());

        boolean isPublicAndApproved = "PUBLIC".equals(doc.getVisibility()) && "APPROVED".equals(doc.getApprovalStatus());

        boolean hasSharedAccess = isDirectShared || isGroupShared || hasFolderAccess || isPublicAndApproved;

        if (!isOwner && !hasSharedAccess) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found");
        }
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
            if ("USER_CUSTOM".equals(subject.getScope())
                    && (subject.getOwner() == null || !subject.getOwner().getUserId().equals(owner.getUserId()))) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You do not have access to this subject");
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
        doc.setDeletedAt(java.time.LocalDateTime.now());
        documentRepository.save(doc);
    }

    private Document getValidatedDocument(Integer documentId, User owner) {
        Document doc = documentRepository.findById(documentId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));

        if ("DELETED".equals(doc.getStatus())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found");
        }

        if (!doc.getOwner().getUserId().equals(owner.getUserId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found");
        }

        return doc;
    }

    @Transactional
    public DocumentContent findOrCreatePending(Document doc) {
        java.util.Optional<DocumentContent> existingContent = documentContentRepository
                .findByDocument_DocumentId(doc.getDocumentId());
        if (existingContent.isPresent()) {
            return existingContent.get();
        }

        Document lockedDocument = documentRepository.findByIdForWrite(doc.getDocumentId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));

        return documentContentRepository.findByDocument_DocumentId(doc.getDocumentId())
                .orElseGet(() -> {
                    DocumentContent content = DocumentContent.builder()
                            .document(lockedDocument)
                            .processingStatus(ProcessingStatus.PENDING)
                            .characterCount(0)
                            .originalCharacterCount(0)
                            .wordCount(0)
                            .isTruncated(false)
                            .build();
                    return documentContentRepository.saveAndFlush(content);
                });
    }

    public List<DocumentResponse> mapToResponseList(List<Document> docs) {
        if (docs == null || docs.isEmpty()) {
            return new ArrayList<>();
        }
        return mapToResponseList(docs, docs.get(0).getOwner());
    }

    public List<DocumentResponse> mapToResponseList(List<Document> docs, User requester) {
        if (docs == null || docs.isEmpty()) {
            return new ArrayList<>();
        }

        List<Integer> docIds = docs.stream().map(Document::getDocumentId).collect(Collectors.toList());
        List<DocumentContent> contents = documentContentRepository.findAllByDocumentIds(docIds);
        java.util.Map<Integer, DocumentContent> contentMap = new java.util.HashMap<>();
        for (DocumentContent content : contents) {
            contentMap.put(content.getDocument().getDocumentId(), content);
        }

        return docs.stream().map(doc -> {
            DocumentContent content = contentMap.get(doc.getDocumentId());
            if (content != null) {
                doc.setDocumentContent(content);
            }
            return mapToResponse(doc, requester);
        }).collect(Collectors.toList());
    }

    private DocumentResponse mapToResponse(Document doc) {
        DocumentContent content = documentContentRepository.findByDocument_DocumentId(doc.getDocumentId()).orElse(null);
        if (content != null) {
            doc.setDocumentContent(content);
        }
        return mapToResponse(doc, doc.getOwner());
    }

    private DocumentResponse mapToResponse(Document doc, User requester) {
        boolean canPreview = false;
        boolean canOpen = false;
        boolean canDownload = false;
        boolean canEdit = false;
        boolean canDelete = false;
        boolean canMove = false;
        boolean canShare = false;
        boolean canPublish = false;
        boolean canUnpublish = false;

        String normalizedFileType = normalizeFileType(doc);
        com.demo.ai_study_hub.enums.PreviewMode previewMode = previewHelper.getPreviewMode(normalizedFileType);
        boolean previewSupported = previewMode != com.demo.ai_study_hub.enums.PreviewMode.FALLBACK;
        boolean isPublicAndApproved = "PUBLIC".equals(doc.getVisibility()) && "APPROVED".equals(doc.getApprovalStatus());
        String subjectScope = doc.getSubject() != null ? doc.getSubject().getScope() : null;
        boolean usesPersonalSubject = "USER_CUSTOM".equalsIgnoreCase(subjectScope);
        boolean isOwnerForRequester = false;

        if (requester != null) {
            isOwnerForRequester = doc.getOwner() != null
                    && doc.getOwner().getUserId().equals(requester.getUserId());
            if (isOwnerForRequester) {
                canPreview = previewSupported;
                canOpen = true;
                canDownload = true;
                canEdit = true;
                canDelete = true;
                canMove = true;
                canShare = true;
                canPublish = !"PUBLIC".equals(doc.getVisibility());
                canUnpublish = "PUBLIC".equals(doc.getVisibility());
            } else if (isPublicAndApproved) {
                canPreview = previewSupported;
                canOpen = true;
                canDownload = true;
            } else {
                boolean isDirectShared = documentShareRepository
                        .findByDocumentAndSharedWithAndStatus(doc, requester, "ACTIVE")
                        .isPresent();

                boolean isGroupShared = false;
                if (!isDirectShared) {
                    List<GroupDocumentShare> activeGroupShares = groupDocumentShareRepository.findByDocumentAndStatus(doc, "ACTIVE");
                    for (GroupDocumentShare groupShare : activeGroupShares) {
                        if (studyGroupMemberRepository.existsByGroupAndUserAndStatus(groupShare.getGroup(), requester, "ACTIVE")) {
                            isGroupShared = true;
                            break;
                        }
                    }
                }

                boolean hasFolderAccess = !isDirectShared && !isGroupShared
                        && doc.getFolder() != null
                        && folderShareService != null
                        && folderShareService.hasAccessToFolder(doc.getFolder().getFolderId(), requester.getEmail());

                if (isDirectShared || isGroupShared || hasFolderAccess) {
                    canPreview = previewSupported;
                    canOpen = true;
                    canDownload = true;
                }
            }
        } else {
            if (isPublicAndApproved) {
                canPreview = previewSupported;
                canOpen = true;
                canDownload = true;
            }
        }

        boolean requiresSystemSubjectRequest = isOwnerForRequester && canPublish && usesPersonalSubject;
        if (requiresSystemSubjectRequest) {
            canPublish = false;
        }
        boolean canRequestSystemSubject = requiresSystemSubjectRequest;

        String processingStatusVal = "PENDING";
        if (doc.getDocumentContent() != null) {
            processingStatusVal = doc.getDocumentContent().getProcessingStatus().name();
        }

        // NOTE: one query per document here (called from mapToResponseList too).
        // Acceptable for MVP given document lists are typically small and not
        // paginated in this codebase; if lists grow large, bulk-fetch via
        // documentFavoriteRepository.findFavoritedDocumentIds(...) once in
        // mapToResponseList() and thread the Set through instead.
        boolean favoritedByMe = requester != null
                && documentFavoriteRepository.existsByUserAndDocument(requester, doc);

        return DocumentResponse.builder()
                .documentId(doc.getDocumentId())
                .title(doc.getTitle())
                .description(doc.getDescription())
                .subjectId(doc.getSubject() != null ? doc.getSubject().getSubjectId() : null)
                .subjectCode(doc.getSubject() != null ? doc.getSubject().getSubjectCode() : null)
                .subjectName(doc.getSubject() != null ? doc.getSubject().getSubjectName() : null)
                .subjectScope(subjectScope)
                .originalFileName(doc.getOriginalFileName())
                .fileType(doc.getFileType())
                .fileSize(doc.getFileSize())
                .fileUrl(doc.getFileUrl())
                .mimeType(previewHelper.getMimeType(normalizedFileType))
                .resourceType(previewHelper.getResourceType(normalizedFileType))
                .previewUrl(previewHelper.getPreviewUrl(doc.getFileUrl(), previewMode))
                .downloadUrl("/api/documents/" + doc.getDocumentId() + "/download")
                .previewMode(previewMode)
                .publicId(doc.getPublicId())
                .folderId(doc.getFolder() != null ? doc.getFolder().getFolderId() : null)
                .folderName(doc.getFolder() != null ? doc.getFolder().getName() : null)
                .uploadedBy(null)
                .uploadedByName(doc.getOwner().getFullName())
                .status(doc.getStatus())
                .visibility(doc.getVisibility())
                .approvalStatus(doc.getApprovalStatus())
                .processingStatus(processingStatusVal)
                .publishedAt(doc.getPublishedAt())
                .viewCount(doc.getViewCount())
                .downloadCount(doc.getDownloadCount())
                .createdAt(doc.getCreatedAt())
                .updatedAt(doc.getUpdatedAt())
                .canPreview(canPreview)
                .canOpen(canOpen)
                .canDownload(canDownload)
                .canEdit(canEdit)
                .canDelete(canDelete)
                .canMove(canMove)
                .canShare(canShare)
                .canPublish(canPublish)
                .canUnpublish(canUnpublish)
                .requiresSystemSubjectRequest(requiresSystemSubjectRequest)
                .canRequestSystemSubject(canRequestSystemSubject)
                .favoritedByMe(favoritedByMe)
                .build();
    }

    public PublicDocumentResponse mapToPublicResponse(Document doc, String requesterEmail) {
        String normalizedFileType = normalizeFileType(doc);
        com.demo.ai_study_hub.enums.PreviewMode previewMode = previewHelper.getPreviewMode(normalizedFileType);
        boolean previewSupported = previewMode != com.demo.ai_study_hub.enums.PreviewMode.FALLBACK;
        boolean isPublicAndApproved = "PUBLIC".equals(doc.getVisibility()) && "APPROVED".equals(doc.getApprovalStatus());
        String processingStatusVal = "PENDING";
        if (doc.getDocumentContent() != null) {
            processingStatusVal = doc.getDocumentContent().getProcessingStatus().name();
        }

        boolean canPreview = isPublicAndApproved && previewSupported;
        boolean canOpen = isPublicAndApproved;
        boolean canDownload = isPublicAndApproved;

        // Public endpoints don't require login — requesterEmail is null for
        // anonymous visitors, in which case favoritedByMe is always false
        // (favoriting requires an account, see DocumentFavoriteService).
        boolean favoritedByMe = false;

        // Permission flags: guest is always false; authenticated users get canUseAiTools
        // when COMPLETED; only the owner gets canProcess / canReprocess.
        boolean canUseAiTools = false;
        boolean canProcess = false;
        boolean canReprocess = false;

        if (requesterEmail != null) {
            User requester = userRepository.findByEmail(requesterEmail).orElse(null);
            if (requester != null) {
                favoritedByMe = documentFavoriteRepository.existsByUserAndDocument(requester, doc);

                boolean isCompleted = "COMPLETED".equals(processingStatusVal);
                boolean isOwner = doc.getOwner() != null
                        && doc.getOwner().getUserId().equals(requester.getUserId());

                canUseAiTools = isCompleted;

                if (isOwner) {
                    canProcess = "PENDING".equals(processingStatusVal)
                            || "FAILED".equals(processingStatusVal)
                            || "UNSUPPORTED".equals(processingStatusVal)
                            || "EMPTY_CONTENT".equals(processingStatusVal);

                    canReprocess = "COMPLETED".equals(processingStatusVal)
                            || "FAILED".equals(processingStatusVal);
                }
            }
        }

        return PublicDocumentResponse.builder()
                .documentId(doc.getDocumentId())
                .title(doc.getTitle())
                .description(doc.getDescription())
                .subjectId(doc.getSubject() != null ? doc.getSubject().getSubjectId() : null)
                .subjectCode(doc.getSubject() != null ? doc.getSubject().getSubjectCode() : null)
                .subjectName(doc.getSubject() != null ? doc.getSubject().getSubjectName() : null)
                .fileType(doc.getFileType())
                .fileSize(doc.getFileSize())
                .fileUrl(doc.getFileUrl())
                .mimeType(previewHelper.getMimeType(normalizedFileType))
                .resourceType(previewHelper.getResourceType(normalizedFileType))
                .previewUrl(previewHelper.getPreviewUrl(doc.getFileUrl(), previewMode))
                .downloadUrl("/api/documents/public/" + doc.getDocumentId() + "/download")
                .previewMode(previewMode)
                .visibility(doc.getVisibility())
                .approvalStatus(doc.getApprovalStatus())
                .processingStatus(processingStatusVal)
                .publishedAt(doc.getPublishedAt())
                .viewCount(doc.getViewCount())
                .downloadCount(doc.getDownloadCount())
                .createdAt(doc.getCreatedAt())
                .ownerName(doc.getOwner() != null ? doc.getOwner().getFullName() : null)
                .displayName(doc.getOwner() != null ? doc.getOwner().getFullName() : null)
                .canPreview(canPreview)
                .canOpen(canOpen)
                .canDownload(canDownload)
                .favoritedByMe(favoritedByMe)
                .canUseAiTools(canUseAiTools)
                .canProcess(canProcess)
                .canReprocess(canReprocess)
                .build();
    }

    private boolean isPreviewSupported(Document doc) {
        return previewHelper.getPreviewMode(normalizeFileType(doc)) != com.demo.ai_study_hub.enums.PreviewMode.FALLBACK;
    }

    public String resolveDownloadFileName(Document doc) {
        String originalName = doc.getOriginalFileName();
        if (originalName != null && !originalName.trim().isEmpty()) {
            return originalName.trim();
        }
        String title = doc.getTitle();
        if (title != null && !title.trim().isEmpty()) {
            return title.trim();
        }
        return "document-" + doc.getDocumentId();
    }

    public String resolveContentType(Document doc) {
        return previewHelper.getMimeType(normalizeFileType(doc));
    }

    private String normalizeFileType(Document doc) {
        String fileType = doc.getFileType();
        if (fileType == null || fileType.trim().isEmpty()) {
            fileType = extractExtension(doc.getOriginalFileName());
        }
        return fileType == null ? "" : fileType.trim().replace(".", "").toUpperCase();
    }

    private String extractExtension(String fileName) {
        if (fileName == null) {
            return "";
        }
        int lastDot = fileName.lastIndexOf('.');
        if (lastDot < 0 || lastDot == fileName.length() - 1) {
            return "";
        }
        return fileName.substring(lastDot + 1);
    }

    public List<PublicDocumentResponse> getPublicDocuments(String keyword, Integer subjectId, String fileType, String sortType, String requesterEmail) {
        Sort sort = Sort.by(Sort.Order.desc("publishedAt"), Sort.Order.desc("createdAt"));
        if ("mostViewed".equalsIgnoreCase(sortType)) {
            sort = Sort.by(Sort.Order.desc("viewCount"), Sort.Order.desc("publishedAt"));
        } else if ("mostDownloaded".equalsIgnoreCase(sortType)) {
            sort = Sort.by(Sort.Order.desc("downloadCount"), Sort.Order.desc("publishedAt"));
        }

        return documentRepository.findPublicDocumentsWithFilters(keyword, subjectId, fileType, sort)
                .stream()
                .map(doc -> mapToPublicResponse(doc, requesterEmail))
                .collect(Collectors.toList());
    }

    public PublicDocumentResponse getPublicDocumentDetail(Integer documentId, String requesterEmail) {
        Document doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));

        if ("DELETED".equals(doc.getStatus())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found");
        }

        if (!"PUBLIC".equals(doc.getVisibility()) || !"APPROVED".equals(doc.getApprovalStatus())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found");
        }

        doc.setViewCount((doc.getViewCount() == null ? 0L : doc.getViewCount()) + 1);
        documentRepository.save(doc);

        return mapToPublicResponse(doc, requesterEmail);
    }

    public DocumentDownloadInfo getPublicDocumentDownloadInfo(Integer documentId) {
        Document doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));

        if ("DELETED".equals(doc.getStatus())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found");
        }

        if (!"PUBLIC".equals(doc.getVisibility()) || !"APPROVED".equals(doc.getApprovalStatus())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found");
        }

        String normalizedFileType = normalizeFileType(doc);
        com.demo.ai_study_hub.enums.PreviewMode previewMode = previewHelper.getPreviewMode(normalizedFileType);

        return DocumentDownloadInfo.builder()
                .fileUrl(doc.getFileUrl())
                .fileName(resolveDownloadFileName(doc))
                .contentType(resolveContentType(doc))
                .mimeType(previewHelper.getMimeType(normalizedFileType))
                .resourceType(previewHelper.getResourceType(normalizedFileType))
                .previewUrl(previewHelper.getPreviewUrl(doc.getFileUrl(), previewMode))
                .downloadUrl("/api/documents/public/" + doc.getDocumentId() + "/download")
                .previewMode(previewMode)
                .build();
    }

    @Transactional
    public void incrementDownloadCount(Integer documentId) {
        if (!documentRepository.existsById(documentId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found");
        }
        documentRepository.incrementDownloadCountById(documentId);
    }

    public DocumentResponse publishDocument(Integer documentId, String email) {
        User owner = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        Document doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));

        if ("DELETED".equals(doc.getStatus())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found");
        }

        if (!doc.getOwner().getUserId().equals(owner.getUserId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found");
        }

        if (doc.getSubject() != null && "USER_CUSTOM".equalsIgnoreCase(doc.getSubject().getScope())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This subject is personal. Please request it as a system subject before publishing to Community Library.");
        }

        doc.setVisibility("PUBLIC");
        doc.setApprovalStatus("PENDING");
        doc.setPublishedAt(null);
        doc.setRejectReason(null);
        documentRepository.save(doc);

        return mapToResponse(doc, owner);
    }

    public DocumentResponse unpublishDocument(Integer documentId, String email) {
        User owner = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        Document doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));

        if ("DELETED".equals(doc.getStatus())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found");
        }

        if (!doc.getOwner().getUserId().equals(owner.getUserId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found");
        }

        doc.setVisibility("PRIVATE");
        doc.setApprovalStatus("PENDING");
        doc.setPublishedAt(null);
        documentRepository.save(doc);

        return mapToResponse(doc, owner);
    }
}
