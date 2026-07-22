package com.demo.ai_study_hub.repository;

import com.demo.ai_study_hub.entity.Document;
import com.demo.ai_study_hub.entity.Folder;
import com.demo.ai_study_hub.entity.User;
import org.springframework.data.domain.Sort;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
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
        "AND ((:folderId IS NULL AND d.folder IS NULL) " +
        "OR (:folderId IS NOT NULL AND d.folder.folderId = :folderId))")
    boolean existsDuplicate(
        @Param("owner") User owner,
        @Param("originalFileName") String originalFileName,
        @Param("fileSize") Long fileSize,
        @Param("folderId") Integer folderId
    );

    @Query("SELECT d FROM Document d LEFT JOIN d.subject s " +
            "WHERE d.owner = :owner " +
            "AND d.status = 'ACTIVE' " +
            "AND d.folder.folderId IN :folderIds " +
            "AND (:keyword IS NULL OR LOWER(d.title) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(d.originalFileName) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
            "AND (:subjectId IS NULL OR s.subjectId = :subjectId) " +
            "AND (:fileType IS NULL OR d.fileType = :fileType) " +
            "ORDER BY d.createdAt DESC")
    List<Document> findByOwnerAndFolderIds(
            @Param("owner") User owner,
            @Param("folderIds") List<Integer> folderIds,
            @Param("keyword") String keyword,
            @Param("subjectId") Integer subjectId,
            @Param("fileType") String fileType
    );

    long countByFolderAndStatus(Folder folder, String status);

    List<Document> findByFolder(Folder folder);
    List<Document> findByOwner_UserIdAndStatus(Integer userId, String status);
    
    long countByOwner(User owner);

    @Query("SELECT d FROM Document d LEFT JOIN d.subject s " +
            "WHERE d.status = 'ACTIVE' " +
            "AND d.visibility = 'PUBLIC' " +
            "AND d.approvalStatus = 'APPROVED' " +
            "AND (:keyword IS NULL OR LOWER(d.title) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(d.originalFileName) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
            "AND (:subjectId IS NULL OR s.subjectId = :subjectId) " +
            "AND (:fileType IS NULL OR d.fileType = :fileType)")
    List<Document> findPublicDocumentsWithFilters(
            @Param("keyword") String keyword,
            @Param("subjectId") Integer subjectId,
            @Param("fileType") String fileType,
            Sort sort
    );

    @Modifying
    @Query("UPDATE Document d SET d.downloadCount = COALESCE(d.downloadCount, 0) + 1 WHERE d.documentId = :id")
    void incrementDownloadCountById(@Param("id") Integer id);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT d FROM Document d WHERE d.documentId = :id")
    java.util.Optional<Document> findByIdForWrite(@Param("id") Integer id);

    @Query("SELECT COUNT(d) FROM Document d WHERE d.owner = :owner AND d.status IN :statuses")
    long countByOwnerAndStatusIn(@Param("owner") User owner, @Param("statuses") List<String> statuses);

    @Query("SELECT COALESCE(SUM(d.fileSize), 0) FROM Document d WHERE d.owner = :owner AND d.status IN :statuses")
    Long sumFileSizeByOwnerAndStatusIn(@Param("owner") User owner, @Param("statuses") List<String> statuses);

    long countByVisibilityAndApprovalStatusAndStatus(String visibility, String approvalStatus, String status);

    long countByStatus(String status);

    @Query("SELECT d.approvalStatus, COUNT(d) FROM Document d WHERE d.status = 'ACTIVE' AND d.visibility = 'PUBLIC' GROUP BY d.approvalStatus")
    List<Object[]> countDocumentsByApprovalStatus();

    @Query("SELECT d FROM Document d LEFT JOIN d.subject s " +
           "WHERE d.status = 'ACTIVE' " +
           "AND d.visibility = 'PUBLIC' " +
           "AND (:search IS NULL OR LOWER(d.title) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(d.owner.email) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "AND (:approvalStatus IS NULL OR d.approvalStatus = :approvalStatus) " +
           "AND (:fileType IS NULL OR d.fileType = :fileType) " +
           "AND (:subjectId IS NULL OR s.subjectId = :subjectId)")
    Page<Document> findPublicDocumentsForAdmin(
            @Param("search") String search,
            @Param("approvalStatus") String approvalStatus,
            @Param("fileType") String fileType,
            @Param("subjectId") Integer subjectId,
            Pageable pageable
    );

    @Query("SELECT d FROM Document d LEFT JOIN d.subject s " +
           "WHERE d.status = 'ACTIVE' " +
           "AND d.visibility = 'PUBLIC' " +
           "AND (:search IS NULL OR LOWER(d.title) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(d.owner.email) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "AND (:approvalStatus IS NULL OR d.approvalStatus = :approvalStatus) " +
           "AND (:fileType IS NULL OR d.fileType = :fileType) " +
           "AND (:subjectId IS NULL OR s.subjectId = :subjectId) " +
           "ORDER BY d.createdAt DESC")
    List<Document> findPublicDocumentsForAdminExport(
            @Param("search") String search,
            @Param("approvalStatus") String approvalStatus,
            @Param("fileType") String fileType,
            @Param("subjectId") Integer subjectId
    );

    long countBySubject(com.demo.ai_study_hub.entity.Subject subject);
    long countBySubjectAndStatus(com.demo.ai_study_hub.entity.Subject subject, String status);
    long countBySubjectAndOwnerAndStatus(com.demo.ai_study_hub.entity.Subject subject, User owner, String status);
    org.springframework.data.domain.Page<Document> findBySubjectAndOwnerAndStatus(com.demo.ai_study_hub.entity.Subject subject, User owner, String status, org.springframework.data.domain.Pageable pageable);
}
