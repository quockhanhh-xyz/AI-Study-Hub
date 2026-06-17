package com.demo.ai_study_hub.repository;

import com.demo.ai_study_hub.entity.Document;
import com.demo.ai_study_hub.entity.Folder;
import com.demo.ai_study_hub.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DocumentRepository extends JpaRepository<Document, Integer> {

    @Query("SELECT d FROM Document d LEFT JOIN d.subject s " +
            "WHERE d.owner = :owner " +
            "AND d.status = 'ACTIVE' " +
            "AND (:keyword IS NULL OR LOWER(d.title) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(d.originalFileName) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
            "AND (:subjectId IS NULL OR s.subjectId = :subjectId) " +
            "AND (:fileType IS NULL OR d.fileType = :fileType) " +
            "AND (:folderId IS NULL OR (:folderId = 0 AND d.folder IS NULL) OR (d.folder.folderId = :folderId)) " +
            "ORDER BY d.createdAt DESC")
    List<Document> findMyDocumentsWithFilters(
            @Param("owner") User owner,
            @Param("keyword") String keyword,
            @Param("subjectId") Integer subjectId,
            @Param("fileType") String fileType,
            @Param("folderId") Integer folderId
    );

    @Query("SELECT COUNT(d) > 0 FROM Document d " +
            "WHERE d.owner = :owner " +
            "AND d.originalFileName = :originalFileName " +
            "AND d.fileSize = :fileSize " +
            "AND d.status = 'ACTIVE' " +
            "AND (:folderId IS NULL AND d.folder IS NULL OR d.folder.folderId = :folderId)")
    boolean existsDuplicate(
            @Param("owner") User owner,
            @Param("originalFileName") String originalFileName,
            @Param("fileSize") Long fileSize,
            @Param("folderId") Integer folderId
    );

    @Query("SELECT d FROM Document d " +
            "WHERE d.owner = :owner " +
            "AND d.status = 'ACTIVE' " +
            "AND d.folder.folderId IN :folderIds " +
            "ORDER BY d.createdAt DESC")
    List<Document> findByOwnerAndFolderIds(
            @Param("owner") User owner,
            @Param("folderIds") List<Integer> folderIds
    );

    long countByFolderAndStatus(Folder folder, String status);

    List<Document> findByFolder(Folder folder);
    List<Document> findByOwner_UserIdAndStatus(Integer userId, String status);
}
