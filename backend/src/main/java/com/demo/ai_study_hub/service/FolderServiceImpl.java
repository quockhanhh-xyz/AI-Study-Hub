package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.dto.FolderRequest;
import com.demo.ai_study_hub.dto.FolderResponse;
import com.demo.ai_study_hub.entity.Document;
import com.demo.ai_study_hub.entity.Folder;
import com.demo.ai_study_hub.entity.User;
import com.demo.ai_study_hub.repository.DocumentRepository;
import com.demo.ai_study_hub.repository.FolderRepository;
import com.demo.ai_study_hub.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
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
    public FolderResponse createFolder(FolderRequest request, String email) {
        User owner = getUser(email);

        if (folderRepository.existsByOwnerAndNameAndStatus(owner, request.getName(), "ACTIVE")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Folder name already exists");
        }

        Folder folder = Folder.builder()
                .name(request.getName())
                .description(request.getDescription())
                .owner(owner)
                .status("ACTIVE")
                .build();

        return mapToResponse(folderRepository.save(folder));
    }

    @Override
    public List<FolderResponse> getMyFolders(String email) {
        User owner = getUser(email);

        return folderRepository.findByOwnerAndStatusOrderByCreatedAtDesc(owner, "ACTIVE")
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public FolderResponse getFolderDetail(Integer folderId, String email) {
        User owner = getUser(email);
        return mapToResponse(getValidatedFolder(folderId, owner));
    }

    @Override
    public FolderResponse updateFolder(Integer folderId, FolderRequest request, String email) {
        User owner = getUser(email);
        Folder folder = getValidatedFolder(folderId, owner);

        if (!folder.getName().equals(request.getName()) &&
                folderRepository.existsByOwnerAndNameAndStatus(owner, request.getName(), "ACTIVE")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Folder name already exists");
        }

        folder.setName(request.getName());
        folder.setDescription(request.getDescription());

        return mapToResponse(folderRepository.save(folder));
    }

    @Override
    public void deleteFolder(Integer folderId, String email) {
        User owner = getUser(email);
        Folder folder = getValidatedFolder(folderId, owner);

        List<Document> documents = documentRepository.findByFolder(folder);
        LocalDateTime now = LocalDateTime.now();
        documents.forEach(doc -> {
            doc.setStatus("DELETED");
            doc.setDeletedAt(now);
        });
        documentRepository.saveAll(documents);

        folder.setStatus("DELETED");
        folder.setDeletedAt(now);
        folderRepository.save(folder);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

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
                .name(folder.getName())
                .description(folder.getDescription())
                .status(folder.getStatus())
                .createdAt(folder.getCreatedAt())
                .updatedAt(folder.getUpdatedAt())
                .build();
    }
}
