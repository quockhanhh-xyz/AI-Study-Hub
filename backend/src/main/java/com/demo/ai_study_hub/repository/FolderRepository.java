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
}
