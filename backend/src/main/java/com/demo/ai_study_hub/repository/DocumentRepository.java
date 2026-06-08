package com.demo.ai_study_hub.repository;

import com.demo.ai_study_hub.entity.Document;
import com.demo.ai_study_hub.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DocumentRepository extends JpaRepository<Document, Integer> {
    List<Document> findByOwner_UserId(Integer userId);

    Optional<Document> findByDocumentIdAndOwnerAndStatus(Integer documentId, User owner, String status);

    @Query("SELECT d FROM Document d " +
            "WHERE d.owner = :owner " +
            "AND d.status = 'ACTIVE' " +
            "AND (:keyword IS NULL OR LOWER(d.title) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(d.originalFileName) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
            "AND (:subjectId IS NULL OR d.subject.subjectId = :subjectId) " +
            "AND (:fileType IS NULL OR d.fileType = :fileType) " +
            "ORDER BY d.createdAt DESC")
    List<Document> findMyDocumentsWithFilters(
            @Param("owner") User owner,
            @Param("keyword") String keyword,
            @Param("subjectId") Integer subjectId,
            @Param("fileType") String fileType
    );
}