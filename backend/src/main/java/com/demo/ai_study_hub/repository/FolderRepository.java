package com.demo.ai_study_hub.repository;

import com.demo.ai_study_hub.entity.Folder;
import com.demo.ai_study_hub.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FolderRepository extends JpaRepository<Folder, Integer> {

    List<Folder> findByOwnerAndStatusOrderByCreatedAtDesc(User owner, String status);

    Optional<Folder> findByFolderIdAndOwner(Integer folderId, User owner);

    boolean existsByOwnerAndNameAndParentFolderAndStatus(User owner, String name, Folder parentFolder, String status);

    List<Folder> findByOwnerAndStatusAndParentFolderIsNull(User owner, String status);

    List<Folder> findByOwnerAndStatusAndParentFolder(User owner, String status, Folder parentFolder);

    boolean existsByParentFolderAndStatus(Folder parentFolder, String status);

    long countByParentFolderAndStatus(Folder parentFolder, String status);

    @Query("SELECT f.folderId FROM Folder f WHERE f.parentFolder.folderId = :parentId AND f.status = 'ACTIVE'")
    List<Integer> findSubFolderIdsByParentId(@Param("parentId") Integer parentId);
}
