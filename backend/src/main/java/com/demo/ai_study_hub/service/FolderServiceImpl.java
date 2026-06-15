package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.dto.FolderRequest;
import com.demo.ai_study_hub.dto.FolderResponse;
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

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FolderServiceImpl implements FolderService {

    private final FolderRepository folderRepository;
    private final UserRepository userRepository;
    private final DocumentRepository documentRepository;

    @Override
    @Transactional
    public FolderResponse createFolder(FolderRequest request, String email) {
        User owner = getUser(email);

        Folder parentFolder = null;
        if (request.getParentFolderId() != null) {
            parentFolder = folderRepository.findByFolderIdAndOwner(request.getParentFolderId(), owner)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Parent folder not found"));

            if (!"ACTIVE".equals(parentFolder.getStatus())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot create subfolder in a deleted folder");
            }
        }


        boolean exists = folderRepository.existsByOwnerAndNameAndParentFolderAndStatus(
                owner, request.getFolderName(), parentFolder, "ACTIVE");
        if (exists) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A folder with this name already exists in this location");
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
    public List<FolderResponse> getMyFolders(Integer parentFolderId, String email) {
        User owner = getUser(email);

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
        Folder folder = getValidatedFolder(folderId, owner);
        return mapToResponse(folder);
    }

    @Override
    @Transactional
    public FolderResponse updateFolder(Integer folderId, FolderRequest request, String email) {
        User owner = getUser(email);
        Folder folder = getValidatedFolder(folderId, owner);


        boolean exists = folderRepository.existsByOwnerAndNameAndParentFolderAndStatus(
                owner, request.getFolderName(), folder.getParentFolder(), "ACTIVE");
        if (exists && !folder.getName().equals(request.getFolderName())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A folder with this name already exists in this location");
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

        // Khớp với nghiệp vụ mới: Chỉ cho phép xóa thư mục rỗng
        long activeDocs = documentRepository.countByFolderAndStatus(folder, "ACTIVE");
        long activeSubFolders = folderRepository.countByParentFolderAndStatus(folder, "ACTIVE");
        if (activeDocs > 0 || activeSubFolders > 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Folder must be empty before deleting.");
        }

        folder.setStatus("DELETED");
        folder.setDeletedAt(LocalDateTime.now());
        folderRepository.save(folder);
    }

    @Override
    @Transactional
    public void restoreFolder(Integer folderId, String email) {
        // Ủy nhiệm toàn quyền xử lý khôi phục qua cho TrashService theo Contract
    }

    @Override
    @Transactional
    public void permanentDeleteFolder(Integer folderId, String email) {
        // Ủy nhiệm toàn quyền xử lý xóa vĩnh viễn qua cho TrashService theo Contract
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
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }

        return folder;
    }

    private FolderResponse mapToResponse(Folder folder) {
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
}
