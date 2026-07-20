package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.dto.FolderRequest;
import com.demo.ai_study_hub.dto.FolderResponse;
import com.demo.ai_study_hub.entity.Folder;
import com.demo.ai_study_hub.entity.User;
import com.demo.ai_study_hub.entity.Document;
import com.demo.ai_study_hub.repository.DocumentRepository;
import com.demo.ai_study_hub.repository.FolderRepository;
import com.demo.ai_study_hub.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import com.demo.ai_study_hub.exception.QuotaExceededException;
import java.util.ArrayList;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FolderServiceImpl implements FolderService {

    private final FolderRepository folderRepository;
    private final UserRepository userRepository;
    private final DocumentRepository documentRepository;
    private final TierPolicyService tierPolicyService;
    private final UsageService usageService;

    @Override
    @Transactional
    public FolderResponse createFolder(FolderRequest request, String email) {
        User owner = getUser(email);
        owner = userRepository.findByIdForUpdate(owner.getUserId()).orElse(owner);

        Folder parentFolder = null;
        if (request.getParentFolderId() != null) {
            parentFolder = folderRepository.findByFolderIdAndOwner(request.getParentFolderId(), owner)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Parent folder not found"));
            if (!"ACTIVE".equals(parentFolder.getStatus())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot create subfolder in a deleted folder");
            }
        }

        com.demo.ai_study_hub.dto.TierLimits limits = tierPolicyService.getLimitsForUser(owner);
        long folderCount = usageService.countFolders(owner);
        if (folderCount >= limits.maxFolders()) {
            throw new QuotaExceededException(HttpStatus.FORBIDDEN,
                    "Folders count limit exceeded", "FOLDER_LIMIT_EXCEEDED");
        }
        if (parentFolder != null) {
            Integer parentDepth = folderRepository.findFolderDepth(parentFolder.getFolderId());
            int depth = parentDepth != null ? parentDepth + 1 : 1;
            if (depth >= limits.maxFolderDepth()) {
                throw new QuotaExceededException(HttpStatus.BAD_REQUEST,
                        "Folder depth exceeds maximum level allowed", "FOLDER_DEPTH_LIMIT_EXCEEDED");
            }
        }

        boolean exists = folderRepository.existsByOwnerAndNameAndParentFolderAndStatus(
                owner, request.getFolderName(), parentFolder, "ACTIVE");
        if (exists) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "A folder with the same name already exists in this location.");
        }

        Folder folder = Folder.builder()
                .name(request.getFolderName())
                .description(request.getDescription())
                .owner(owner)
                .parentFolder(parentFolder)
                .status("ACTIVE")
                .build();

        return mapToResponse(folderRepository.save(folder));
    }

    @Override
    @Transactional(readOnly = true)
    public List<FolderResponse> getMyFolders(Integer parentFolderId, Boolean all, String email) {
        User owner = getUser(email);

        if (Boolean.TRUE.equals(all)) {
            return folderRepository.findByOwnerAndStatusOrderByCreatedAtDesc(owner, "ACTIVE")
                    .stream().map(this::mapToResponse).collect(Collectors.toList());
        }

        if (parentFolderId != null) {
            Folder parentFolder = folderRepository.findByFolderIdAndOwner(parentFolderId, owner)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Parent folder not found"));
            if (!"ACTIVE".equals(parentFolder.getStatus())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Parent folder is deleted");
            }
            return folderRepository.findByOwnerAndStatusAndParentFolder(owner, "ACTIVE", parentFolder)
                    .stream().map(this::mapToResponse).collect(Collectors.toList());
        }

        return folderRepository.findByOwnerAndStatusAndParentFolderIsNull(owner, "ACTIVE")
                .stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public FolderResponse getFolderDetail(Integer folderId, String email) {
        User owner = getUser(email);
        return mapToResponse(getValidatedFolder(folderId, owner));
    }

    @Override
    @Transactional
    public FolderResponse updateFolder(Integer folderId, FolderRequest request, String email) {
        User owner = getUser(email);
        Folder folder = getValidatedFolder(folderId, owner);

        boolean exists = folderRepository.existsByOwnerAndNameAndParentFolderAndStatus(
                owner, request.getFolderName(), folder.getParentFolder(), "ACTIVE");
        if (exists && !folder.getName().equals(request.getFolderName())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "A folder with the same name already exists in this location.");
        }

        folder.setName(request.getFolderName());
        folder.setDescription(request.getDescription());
        return mapToResponse(folderRepository.save(folder));
    }

    @Override
    @Transactional
    public void deleteFolder(Integer folderId, String email) {
        User owner = getUser(email);
        Folder folder = getValidatedFolder(folderId, owner);

        List<Folder> toDeleteFolders = new ArrayList<>();
        List<Document> toDeleteDocuments = new ArrayList<>();
        toDeleteFolders.add(folder);
        collectActiveSubtree(folder, toDeleteFolders, toDeleteDocuments);

        LocalDateTime now = LocalDateTime.now();
        for (Folder f : toDeleteFolders) {
            f.setStatus("DELETED");
            f.setDeletedAt(now);
            folderRepository.save(f);
        }
        for (Document d : toDeleteDocuments) {
            d.setStatus("DELETED");
            d.setDeletedAt(now);
            documentRepository.save(d);
        }
    }

    private void collectActiveSubtree(Folder current, List<Folder> toDeleteFolders, List<Document> toDeleteDocuments) {
        List<Folder> subfolders = folderRepository.findByOwnerAndStatusAndParentFolder(current.getOwner(), "ACTIVE", current);
        for (Folder sub : subfolders) {
            toDeleteFolders.add(sub);
            collectActiveSubtree(sub, toDeleteFolders, toDeleteDocuments);
        }
        List<Document> docs = documentRepository.findByFolder(current).stream()
                .filter(d -> "ACTIVE".equals(d.getStatus()))
                .collect(Collectors.toList());
        toDeleteDocuments.addAll(docs);
    }


    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }

    private Folder getValidatedFolder(Integer folderId, User owner) {
        Folder folder = folderRepository.findById(folderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Folder not found"));

        if ("DELETED".equals(folder.getStatus())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Folder not found");
        }

        if (!folder.getOwner().getUserId().equals(owner.getUserId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Folder not found");
        }

        return folder;
    }

    private FolderResponse mapToResponse(Folder folder) {
        long fileCount = documentRepository.countByFolderAndStatus(folder, "ACTIVE");
        long subfolderCount = folderRepository.countByParentFolderAndStatus(folder, "ACTIVE");

        return FolderResponse.builder()
                .folderId(folder.getFolderId())
                .folderName(folder.getName())
                .description(folder.getDescription())
                .parentFolderId(folder.getParentFolder() != null
                        ? folder.getParentFolder().getFolderId() : null)
                .fileCount((int) fileCount)
                .subfolderCount((int) subfolderCount)
                .status(folder.getStatus())
                .createdAt(folder.getCreatedAt())
                .updatedAt(folder.getUpdatedAt())
                .build();
    }
}
