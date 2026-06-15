package com.demo.ai_study_hub.repository;

import com.demo.ai_study_hub.entity.Folder;
import com.demo.ai_study_hub.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FolderRepository extends JpaRepository<Folder, Integer> {

    List<Folder> findByOwnerAndStatusOrderByCreatedAtDesc(User owner, String status);

    Optional<Folder> findByFolderIdAndOwner(Integer folderId, User owner);

    boolean existsByOwnerAndNameAndStatus(User owner, String name, String status);

    // Get root folders
    List<Folder> findByOwnerAndStatusAndParentFolderIsNull(User owner, String status);

    // Get subfolders by parent
    List<Folder> findByOwnerAndStatusAndParentFolder(User owner, String status, Folder parentFolder);

    // Check active subfolders exist
    boolean existsByParentFolderAndStatus(Folder parentFolder, String status);

    // Count active subfolders
    long countByParentFolderAndStatus(Folder parentFolder, String status);
}
