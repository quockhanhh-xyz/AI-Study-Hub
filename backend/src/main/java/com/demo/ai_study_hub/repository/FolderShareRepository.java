package com.demo.ai_study_hub.repository;

import com.demo.ai_study_hub.entity.Folder;
import com.demo.ai_study_hub.entity.FolderShare;
import com.demo.ai_study_hub.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FolderShareRepository extends JpaRepository<FolderShare, Integer> {

    Optional<FolderShare> findByFolderAndSharedWithUser(Folder folder, User sharedWithUser);

    List<FolderShare> findBySharedWithUserAndStatus(User sharedWithUser, String status);

    List<FolderShare> findByFolderAndStatus(Folder folder, String status);

    Optional<FolderShare> findByFolderAndSharedWithUserAndStatus(Folder folder, User sharedWithUser, String status);

    void deleteByFolder(Folder folder);

    long countBySharedByAndStatus(User sharedBy, String status);

    List<FolderShare> findBySharedByAndStatus(User sharedBy, String status);
}
