package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.dto.DocumentDownloadInfo;
import com.demo.ai_study_hub.dto.DocumentResponse;
import com.demo.ai_study_hub.dto.DocumentUpdateDTO;
import com.demo.ai_study_hub.dto.FileUploadResult;
import com.demo.ai_study_hub.dto.PublicDocumentResponse;
import com.demo.ai_study_hub.entity.*;
import com.demo.ai_study_hub.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
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

    @Transactional
    public DocumentResponse uploadDocument(MultipartFile file, String title, String description, Integer subjectId, Integer folderId, String email) {
        if (title == null || title.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Title is required");
        }

        User owner = userRepository.findByEmail(email).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

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
        doc.setFolder(folder);

        Document savedDoc;
        try {
            savedDoc = documentRepository.saveAndFlush(doc);
            DocumentContent content = DocumentContent.builder()
                    .document(savedDoc)
                    .processingStatus(ProcessingStatus.PENDING)
                    .characterCount(0)
                    .originalCharacterCount(0)
                    .wordCount(0)
                    .isTruncated(false)
                    .build();
            documentContentRepository.saveAndFlush(content);
            savedDoc.setDocumentContent(content);
        } catch (Exception persistenceException) {
            log.error("Failed to persist document metadata, rolling back Cloudinary upload. publicId={}", publicId, persistenceException);
            boolean cleaned = cloudinaryStorageService.deleteFile(publicId, fileTypeForCleanup);
            if (!cleaned) {
                log.warn("Cloudinary cleanup failed for orphaned file. publicId={}", publicId);
            }
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                "Failed to save document metadata. Upload has been rolled back.");
        }

        return mapToResponse(savedDoc);
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

        return DocumentDownloadInfo.builder()
                .fileUrl(doc.getFileUrl())
                .fileName(resolveDownloadFileName(doc))
                .contentType(resolveContentType(doc))
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
        documentRepository.findByIdForWrite(doc.getDocumentId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));

        return documentContentRepository.findByDocument_DocumentId(doc.getDocumentId())
                .orElseGet(() -> {
                    DocumentContent content = DocumentContent.builder()
                            .document(doc)
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

        boolean previewSupported = isPreviewSupported(doc);
        boolean isPublicAndApproved = "PUBLIC".equals(doc.getVisibility()) && "APPROVED".equals(doc.getApprovalStatus());

        if (requester != null) {
            boolean isOwner = doc.getOwner().getUserId().equals(requester.getUserId());
            if (isOwner) {
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

        String processingStatusVal = "PENDING";
        if (doc.getDocumentContent() != null) {
            processingStatusVal = doc.getDocumentContent().getProcessingStatus().name();
        }

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
                .build();
    }

    private PublicDocumentResponse mapToPublicResponse(Document doc) {
        boolean previewSupported = isPreviewSupported(doc);
        boolean isPublicAndApproved = "PUBLIC".equals(doc.getVisibility()) && "APPROVED".equals(doc.getApprovalStatus());

        boolean canPreview = isPublicAndApproved && previewSupported;
        boolean canOpen = isPublicAndApproved;
        boolean canDownload = isPublicAndApproved;

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
                .visibility(doc.getVisibility())
                .approvalStatus(doc.getApprovalStatus())
                .publishedAt(doc.getPublishedAt())
                .viewCount(doc.getViewCount())
                .downloadCount(doc.getDownloadCount())
                .createdAt(doc.getCreatedAt())
                .ownerName(doc.getOwner() != null ? doc.getOwner().getFullName() : null)
                .displayName(doc.getOwner() != null ? doc.getOwner().getFullName() : null)
                .canPreview(canPreview)
                .canOpen(canOpen)
                .canDownload(canDownload)
                .build();
    }

    private boolean isPreviewSupported(Document doc) {
        String type = normalizeFileType(doc);
        return "PDF".equals(type)
                || "PNG".equals(type)
                || "JPG".equals(type)
                || "JPEG".equals(type)
                || "TXT".equals(type);
    }

    private String resolveDownloadFileName(Document doc) {
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

    private String resolveContentType(Document doc) {
        String type = normalizeFileType(doc);
        return switch (type) {
            case "PDF" -> "application/pdf";
            case "PNG" -> "image/png";
            case "JPG", "JPEG" -> "image/jpeg";
            case "TXT" -> "text/plain";
            case "DOC" -> "application/msword";
            case "DOCX" -> "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
            case "PPT" -> "application/vnd.ms-powerpoint";
            case "PPTX" -> "application/vnd.openxmlformats-officedocument.presentationml.presentation";
            case "XLS" -> "application/vnd.ms-excel";
            case "XLSX" -> "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
            default -> "application/octet-stream";
        };
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

    public List<PublicDocumentResponse> getPublicDocuments(String keyword, Integer subjectId, String fileType, String sortType) {
        Sort sort = Sort.by(Sort.Order.desc("publishedAt"), Sort.Order.desc("createdAt"));
        if ("mostViewed".equalsIgnoreCase(sortType)) {
            sort = Sort.by(Sort.Order.desc("viewCount"), Sort.Order.desc("publishedAt"));
        } else if ("mostDownloaded".equalsIgnoreCase(sortType)) {
            sort = Sort.by(Sort.Order.desc("downloadCount"), Sort.Order.desc("publishedAt"));
        }

        return documentRepository.findPublicDocumentsWithFilters(keyword, subjectId, fileType, sort)
                .stream()
                .map(this::mapToPublicResponse)
                .collect(Collectors.toList());
    }

    public PublicDocumentResponse getPublicDocumentDetail(Integer documentId) {
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

        return mapToPublicResponse(doc);
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

        return DocumentDownloadInfo.builder()
                .fileUrl(doc.getFileUrl())
                .fileName(resolveDownloadFileName(doc))
                .contentType(resolveContentType(doc))
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

        doc.setVisibility("PUBLIC");
        doc.setApprovalStatus("APPROVED");
        doc.setPublishedAt(java.time.LocalDateTime.now());
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
