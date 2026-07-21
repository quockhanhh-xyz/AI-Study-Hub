package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.dto.*;
import com.demo.ai_study_hub.entity.Folder;
import com.demo.ai_study_hub.entity.FolderShare;
import com.demo.ai_study_hub.entity.GroupFolderShare;
import com.demo.ai_study_hub.entity.StudyGroup;
import com.demo.ai_study_hub.entity.User;
import com.demo.ai_study_hub.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import com.demo.ai_study_hub.exception.QuotaExceededException;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FolderShareServiceImpl implements FolderShareService {

    private final FolderShareRepository folderShareRepository;
    private final FolderRepository folderRepository;
    private final UserRepository userRepository;
    private final DocumentRepository documentRepository;
    private final GroupFolderShareRepository groupFolderShareRepository;
    private final StudyGroupRepository studyGroupRepository;
    private final StudyGroupMemberRepository studyGroupMemberRepository;
    private final DocumentContentRepository documentContentRepository;
    private final TierPolicyService tierPolicyService;
    private final UsageService usageService;
    private final DocumentPreviewHelper previewHelper;

    @Override
    @Transactional
    public FolderShareResponse shareFolderToUser(Integer folderId, ShareFolderRequest request, String email) {
        User owner = getUser(email);
        owner = userRepository.findByIdForUpdate(owner.getUserId()).orElse(owner);
        Folder folder = getActiveOwnedFolder(folderId, owner);

        com.demo.ai_study_hub.dto.TierLimits limits = tierPolicyService.getLimitsForUser(owner);
        long activeShares = usageService.countActiveShares(owner);
        if (activeShares >= limits.maxActiveShares()) {
            throw new QuotaExceededException(HttpStatus.FORBIDDEN,
                    "Active share links limit exceeded", "SHARE_LIMIT_EXCEEDED");
        }

        User targetUser = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        if (!"ACTIVE".equals(targetUser.getStatus())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found");
        }

        if (targetUser.getUserId().equals(owner.getUserId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "You cannot share a folder with yourself");
        }

        FolderShare existing = folderShareRepository.findByFolderAndSharedWithUser(folder, targetUser).orElse(null);

        FolderShare share;
        if (existing != null) {
            if ("ACTIVE".equals(existing.getStatus())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Folder is already shared with this user");
            }
            existing.setStatus("ACTIVE");
            existing.setSharedBy(owner);
            share = folderShareRepository.save(existing);
        } else {
            FolderShare newShare = new FolderShare();
            newShare.setFolder(folder);
            newShare.setSharedBy(owner);
            newShare.setSharedWithUser(targetUser);
            newShare.setPermission("VIEW");
            newShare.setStatus("ACTIVE");
            share = folderShareRepository.save(newShare);
        }

        return mapToShareResponse(share, owner.getUserId());
    }

    @Override
    @Transactional(readOnly = true)
    public List<FolderShareResponse> getSharedWithMe(String email) {
        User user = getUser(email);

        return folderShareRepository.findBySharedWithUserAndStatus(user, "ACTIVE")
                .stream()
                .filter(s -> "ACTIVE".equals(s.getFolder().getStatus()))
                .map(s -> mapToShareResponse(s, user.getUserId()))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public FolderSharesListResponse getFolderShares(Integer folderId, String email) {
        User owner = getUser(email);
        Folder folder = getActiveOwnedFolder(folderId, owner);

        List<FolderShareResponse> userShares = folderShareRepository.findByFolderAndStatus(folder, "ACTIVE")
                .stream()
                .map(s -> mapToShareResponse(s, owner.getUserId()))
                .collect(Collectors.toList());

        List<FolderShareResponse> groupShares = groupFolderShareRepository.findActiveSharesForFolder(folder)
                .stream()
                .map(g -> mapToGroupShareResponse(g, owner.getUserId()))
                .collect(Collectors.toList());

        return FolderSharesListResponse.builder()
                .userShares(userShares)
                .groupShares(groupShares)
                .build();
    }

    @Override
    @Transactional
    public void revokeFolderShare(Integer shareId, String email) {
        User owner = getUser(email);

        FolderShare share = folderShareRepository.findById(shareId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Share not found"));

        if (!"ACTIVE".equals(share.getStatus())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Share not found");
        }

        if (!share.getFolder().getOwner().getUserId().equals(owner.getUserId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the folder owner can revoke this share");
        }

        share.setStatus("REVOKED");
        folderShareRepository.save(share);
    }

    @Override
    @Transactional(readOnly = true)
    public SharedFolderContentResponse getSharedContent(Integer folderId, String email) {
        User user = getUser(email);
        Folder folder = folderRepository.findById(folderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Folder not found"));

        if (!"ACTIVE".equals(folder.getStatus())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Folder not found");
        }

        boolean isOwner = folder.getOwner().getUserId().equals(user.getUserId());

        Folder sharedRoot = null;
        if (!isOwner) {
            sharedRoot = findSharedAncestor(folder, user);
            if (sharedRoot == null) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Folder not found");
            }
        }

        List<SharedFolderContentResponse.BreadcrumbItem> breadcrumb = isOwner
                ? buildFullBreadcrumb(folder)
                : buildBreadcrumbFromRoot(folder, sharedRoot);

        List<Folder> subfolders = folderRepository.findByOwnerAndStatusAndParentFolder(
                folder.getOwner(), "ACTIVE", folder);
        List<FolderResponse> subfolderResponses = subfolders.stream()
                .map(this::mapToFolderResponseSimple)
                .collect(Collectors.toList());

        List<com.demo.ai_study_hub.entity.Document> docs = documentRepository.findByFolder(folder)
                .stream().filter(d -> "ACTIVE".equals(d.getStatus())).collect(Collectors.toList());

        List<Integer> docIds = docs.stream().map(com.demo.ai_study_hub.entity.Document::getDocumentId).collect(Collectors.toList());
        java.util.Map<Integer, String> statusMap = new java.util.HashMap<>();
        if (!docIds.isEmpty()) {
            List<Object[]> statuses = documentContentRepository.findStatusesByDocumentIds(docIds);
            for (Object[] row : statuses) {
                statusMap.put((Integer) row[0], ((com.demo.ai_study_hub.entity.ProcessingStatus) row[1]).name());
            }
        }

        List<DocumentResponse> documentResponses = docs.stream()
                .map(d -> {
                    DocumentResponse resp = mapToDocumentResponseSimple(d);
                    resp.setProcessingStatus(statusMap.getOrDefault(d.getDocumentId(), "PENDING"));
                    return resp;
                })
                .collect(Collectors.toList());

        SharedFolderContentResponse.CurrentFolderInfo currentFolderInfo =
                SharedFolderContentResponse.CurrentFolderInfo.builder()
                        .folderId(folder.getFolderId())
                        .folderName(folder.getName())
                        .ownerName(folder.getOwner().getFullName())
                        .ownerEmail(isOwner ? folder.getOwner().getEmail() : null)
                        .build();

        return SharedFolderContentResponse.builder()
                .breadcrumb(breadcrumb)
                .currentFolder(currentFolderInfo)
                .subfolders(subfolderResponses)
                .documents(documentResponses)
                .permission(isOwner ? "OWNER" : "VIEW")
                .isSharedView(!isOwner)
                .canUpload(isOwner)
                .canEdit(isOwner)
                .canDelete(isOwner)
                .canMove(isOwner)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public boolean hasAccessToFolder(Integer folderId, String email) {
        User user = getUser(email);
        Folder folder = folderRepository.findById(folderId).orElse(null);
        if (folder == null || !"ACTIVE".equals(folder.getStatus())) {
            return false;
        }
        if (folder.getOwner().getUserId().equals(user.getUserId())) {
            return true;
        }
        return findSharedAncestor(folder, user) != null;
    }


    /**
     * Walks up the folder's ancestor chain (including itself) and returns
     * the first ancestor folder that is directly shared (ACTIVE) with the user or group.
     * Returns null if no such ancestor exists.
     */
    private Folder findSharedAncestor(Folder folder, User user) {
        Folder current = folder;
        while (current != null) {
            if (!"ACTIVE".equals(current.getStatus())) {
                return null;
            }
            boolean directlyShared = folderShareRepository
                    .findByFolderAndSharedWithUserAndStatus(current, user, "ACTIVE")
                    .isPresent();
            if (directlyShared) {
                return current;
            }
            boolean groupShared = groupFolderShareRepository
                    .hasActiveGroupShareForUser(current.getFolderId(), user.getUserId());
            if (groupShared) {
                return current;
            }
            current = current.getParentFolder();
        }
        return null;
    }

    private List<SharedFolderContentResponse.BreadcrumbItem> buildFullBreadcrumb(Folder folder) {
        List<SharedFolderContentResponse.BreadcrumbItem> path = new ArrayList<>();
        Folder current = folder;
        while (current != null) {
            path.add(0, SharedFolderContentResponse.BreadcrumbItem.builder()
                    .folderId(current.getFolderId())
                    .folderName(current.getName())
                    .build());
            current = current.getParentFolder();
        }
        return path;
    }

    private List<SharedFolderContentResponse.BreadcrumbItem> buildBreadcrumbFromRoot(Folder folder, Folder sharedRoot) {
        List<SharedFolderContentResponse.BreadcrumbItem> path = new ArrayList<>();
        Folder current = folder;
        while (current != null) {
            path.add(0, SharedFolderContentResponse.BreadcrumbItem.builder()
                    .folderId(current.getFolderId())
                    .folderName(current.getName())
                    .build());
            if (current.getFolderId().equals(sharedRoot.getFolderId())) {
                break;
            }
            current = current.getParentFolder();
        }
        return path;
    }

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }

    private Folder getActiveOwnedFolder(Integer folderId, User owner) {
        Folder folder = folderRepository.findById(folderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Folder not found"));

        if (!"ACTIVE".equals(folder.getStatus())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Folder not found");
        }

        if (!folder.getOwner().getUserId().equals(owner.getUserId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Folder not found");
        }

        return folder;
    }

    private FolderShareResponse mapToShareResponse(FolderShare share, Integer currentUserId) {
        Folder folder = share.getFolder();
        boolean isOwner = folder.getOwner().getUserId().equals(currentUserId);
        boolean canRevoke = isOwner;

        return FolderShareResponse.builder()
                .shareId(share.getShareId())
                .folderId(folder.getFolderId())
                .folderName(folder.getName())
                .parentFolderId(folder.getParentFolder() != null ? folder.getParentFolder().getFolderId() : null)
                .ownerName(folder.getOwner().getFullName())
                .ownerEmail(isOwner ? folder.getOwner().getEmail() : null)
                .sharedByName(share.getSharedBy().getFullName())
                .sharedWithName(share.getSharedWithUser().getFullName())
                .sharedByEmail(isOwner ? share.getSharedBy().getEmail() : null)
                .sharedWithEmail(isOwner ? share.getSharedWithUser().getEmail() : null)
                .permission(share.getPermission())
                .status(share.getStatus())
                .createdAt(share.getCreatedAt())
                .canRevoke(canRevoke)
                .build();
    }

    private FolderResponse mapToFolderResponseSimple(Folder folder) {
        long fileCount = documentRepository.countByFolderAndStatus(folder, "ACTIVE");
        long subfolderCount = folderRepository.countByParentFolderAndStatus(folder, "ACTIVE");

        return FolderResponse.builder()
                .folderId(folder.getFolderId())
                .folderName(folder.getName())
                .description(folder.getDescription())
                .parentFolderId(folder.getParentFolder() != null ? folder.getParentFolder().getFolderId() : null)
                .fileCount((int) fileCount)
                .documentCount((int) fileCount)
                .subfolderCount((int) subfolderCount)
                .status(folder.getStatus())
                .createdAt(folder.getCreatedAt())
                .updatedAt(folder.getUpdatedAt())
                .build();
    }

    private DocumentResponse mapToDocumentResponseSimple(com.demo.ai_study_hub.entity.Document doc) {
        String normalizedFileType = previewHelper.normalizeFileType(doc.getFileType(), doc.getOriginalFileName());
        com.demo.ai_study_hub.enums.PreviewMode previewMode = previewHelper.getPreviewMode(normalizedFileType);

        return DocumentResponse.builder()
                .documentId(doc.getDocumentId())
                .title(doc.getTitle())
                .description(doc.getDescription())
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
                .createdAt(doc.getCreatedAt())
                .updatedAt(doc.getUpdatedAt())
                .mimeType(previewHelper.getMimeType(normalizedFileType))
                .resourceType(previewHelper.getResourceType(normalizedFileType))
                .previewUrl(previewHelper.getPreviewUrl(doc.getFileUrl(), previewMode))
                .downloadUrl("/api/documents/" + doc.getDocumentId() + "/download")
                .previewMode(previewMode)
                .build();
    }

    @Override
    @Transactional
    public FolderShareResponse shareFolderToGroup(Integer folderId, GroupFolderShareRequest request, String email) {
        User owner = getUser(email);
        owner = userRepository.findByIdForUpdate(owner.getUserId()).orElse(owner);
        Folder folder = getActiveOwnedFolder(folderId, owner);

        com.demo.ai_study_hub.dto.TierLimits limits = tierPolicyService.getLimitsForUser(owner);
        long activeShares = usageService.countActiveShares(owner);
        if (activeShares >= limits.maxActiveShares()) {
            throw new QuotaExceededException(HttpStatus.FORBIDDEN,
                    "Active share links limit exceeded", "SHARE_LIMIT_EXCEEDED");
        }

        StudyGroup group = studyGroupRepository.findById(request.getGroupId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Group not found"));

        if (!"ACTIVE".equals(group.getStatus())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Group not found");
        }

        boolean isMember = studyGroupMemberRepository.existsByGroupAndUserAndStatus(group, owner, "ACTIVE");
        if (!isMember) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Group not found");
        }

        GroupFolderShare existing = groupFolderShareRepository.findByFolderAndGroup(folder, group).orElse(null);
        GroupFolderShare share;
        if (existing != null) {
            if ("ACTIVE".equals(existing.getStatus())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Folder is already shared in this group");
            }
            existing.setStatus("ACTIVE");
            existing.setSharedBy(owner);
            share = groupFolderShareRepository.save(existing);
        } else {
            GroupFolderShare newShare = new GroupFolderShare();
            newShare.setFolder(folder);
            newShare.setGroup(group);
            newShare.setSharedBy(owner);
            newShare.setPermission("VIEW");
            newShare.setStatus("ACTIVE");
            share = groupFolderShareRepository.save(newShare);
        }

        return mapToGroupShareResponse(share, owner.getUserId());
    }

    @Override
    @Transactional(readOnly = true)
    public List<FolderShareResponse> getGroupFolders(Integer groupId, String email) {
        User user = getUser(email);
        StudyGroup group = studyGroupRepository.findById(groupId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Group not found"));

        if (!"ACTIVE".equals(group.getStatus())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Group not found");
        }

        boolean isMember = studyGroupMemberRepository.existsByGroupAndUserAndStatus(group, user, "ACTIVE");
        if (!isMember) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Group not found");
        }

        return groupFolderShareRepository.findActiveSharesForGroup(group)
                .stream()
                .map(share -> mapToGroupShareResponse(share, user.getUserId()))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void revokeGroupFolderShare(Integer shareId, String email) {
        User user = getUser(email);

        GroupFolderShare share = groupFolderShareRepository.findById(shareId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Share not found"));

        if (!"ACTIVE".equals(share.getStatus())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Share not found");
        }

        boolean isFolderOwner = share.getFolder().getOwner().getUserId().equals(user.getUserId());
        boolean isGroupOwner = share.getGroup().getOwner().getUserId().equals(user.getUserId());

        if (!isFolderOwner && !isGroupOwner) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }

        share.setStatus("REVOKED");
        groupFolderShareRepository.save(share);
    }

    private FolderShareResponse mapToGroupShareResponse(GroupFolderShare share, Integer currentUserId) {
        Folder folder = share.getFolder();
        StudyGroup group = share.getGroup();
        boolean canRevoke = folder.getOwner().getUserId().equals(currentUserId)
                || group.getOwner().getUserId().equals(currentUserId);

        return FolderShareResponse.builder()
                .shareId(share.getShareId())
                .folderId(folder.getFolderId())
                .folderName(folder.getName())
                .parentFolderId(folder.getParentFolder() != null ? folder.getParentFolder().getFolderId() : null)
                .ownerName(folder.getOwner().getFullName())
                .ownerEmail(null)
                .sharedByName(share.getSharedBy().getFullName())
                .sharedByEmail(null)
                .groupId(group.getGroupId())
                .groupName(group.getGroupName())
                .permission(share.getPermission())
                .status(share.getStatus())
                .createdAt(share.getCreatedAt())
                .canRevoke(canRevoke)
                .build();
    }
}
