package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.dto.*;
import com.demo.ai_study_hub.entity.Folder;
import com.demo.ai_study_hub.entity.FolderShare;
import com.demo.ai_study_hub.entity.User;
import com.demo.ai_study_hub.repository.DocumentRepository;
import com.demo.ai_study_hub.repository.FolderRepository;
import com.demo.ai_study_hub.repository.FolderShareRepository;
import com.demo.ai_study_hub.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

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

    @Override
    @Transactional
    public FolderShareResponse shareFolderToUser(Integer folderId, ShareFolderRequest request, String email) {
        User owner = getUser(email);
        Folder folder = getActiveOwnedFolder(folderId, owner);

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

        return mapToShareResponse(share);
    }

    @Override
    @Transactional(readOnly = true)
    public List<FolderShareResponse> getSharedWithMe(String email) {
        User user = getUser(email);

        return folderShareRepository.findBySharedWithUserAndStatus(user, "ACTIVE")
                .stream()
                .filter(s -> "ACTIVE".equals(s.getFolder().getStatus()))
                .map(this::mapToShareResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<FolderShareResponse> getFolderShares(Integer folderId, String email) {
        User owner = getUser(email);
        Folder folder = getActiveOwnedFolder(folderId, owner);

        return folderShareRepository.findByFolderAndStatus(folder, "ACTIVE")
                .stream()
                .map(this::mapToShareResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void revokeFolderShare(Integer shareId, String email) {
        User owner = getUser(email);

        FolderShare share = folderShareRepository.findById(shareId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Share not found"));

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
            sharedRoot = findDirectSharedAncestor(folder, user);
            if (sharedRoot == null) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You do not have access to this folder");
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
        List<DocumentResponse> documentResponses = docs.stream()
                .map(this::mapToDocumentResponseSimple)
                .collect(Collectors.toList());

        SharedFolderContentResponse.CurrentFolderInfo currentFolderInfo =
                SharedFolderContentResponse.CurrentFolderInfo.builder()
                        .folderId(folder.getFolderId())
                        .folderName(folder.getName())
                        .ownerName(folder.getOwner().getFullName())
                        .ownerEmail(folder.getOwner().getEmail())
                        .build();

        return SharedFolderContentResponse.builder()
                .breadcrumb(breadcrumb)
                .currentFolder(currentFolderInfo)
                .subfolders(subfolderResponses)
                .documents(documentResponses)
                .permission("VIEW")
                .isSharedView(!isOwner)
                .canUpload(false)
                .canEdit(false)
                .canDelete(false)
                .canMove(false)
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
        return findDirectSharedAncestor(folder, user) != null;
    }


    /**
     * Walks up the folder's ancestor chain (including itself) and returns
     * the first ancestor folder that is directly shared (ACTIVE) with the user.
     * Returns null if no such ancestor exists.
     */
    private Folder findDirectSharedAncestor(Folder folder, User user) {
        Folder current = folder;
        while (current != null) {
            if (!"ACTIVE".equals(current.getStatus())) {
                return null;
            }
            boolean shared = folderShareRepository
                    .findByFolderAndSharedWithUserAndStatus(current, user, "ACTIVE")
                    .isPresent();
            if (shared) {
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
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the folder owner can perform this action");
        }

        return folder;
    }

    private FolderShareResponse mapToShareResponse(FolderShare share) {
        Folder folder = share.getFolder();
        return FolderShareResponse.builder()
                .shareId(share.getShareId())
                .folderId(folder.getFolderId())
                .folderName(folder.getName())
                .parentFolderId(folder.getParentFolder() != null ? folder.getParentFolder().getFolderId() : null)
                .ownerName(folder.getOwner().getFullName())
                .ownerEmail(folder.getOwner().getEmail())
                .sharedByName(share.getSharedBy().getFullName())
                .sharedByEmail(share.getSharedBy().getEmail())
                .sharedWithEmail(share.getSharedWithUser().getEmail())
                .permission(share.getPermission())
                .status(share.getStatus())
                .createdAt(share.getCreatedAt())
                .canRevoke(true)
                .build();
    }

    private FolderResponse mapToFolderResponseSimple(Folder folder) {
        return FolderResponse.builder()
                .folderId(folder.getFolderId())
                .folderName(folder.getName())
                .description(folder.getDescription())
                .parentFolderId(folder.getParentFolder() != null ? folder.getParentFolder().getFolderId() : null)
                .status(folder.getStatus())
                .createdAt(folder.getCreatedAt())
                .updatedAt(folder.getUpdatedAt())
                .build();
    }

    private DocumentResponse mapToDocumentResponseSimple(com.demo.ai_study_hub.entity.Document doc) {
        return DocumentResponse.builder()
                .documentId(doc.getDocumentId())
                .title(doc.getTitle())
                .fileType(doc.getFileType())
                .fileSize(doc.getFileSize())
                .fileUrl(doc.getFileUrl())
                .status(doc.getStatus())
                .createdAt(doc.getCreatedAt())
                .build();
    }
}
