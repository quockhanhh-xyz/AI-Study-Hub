package com.demo.ai_study_hub.repository;

import com.demo.ai_study_hub.entity.Document;
import com.demo.ai_study_hub.entity.DocumentShare;
import com.demo.ai_study_hub.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface DocumentShareRepository extends JpaRepository<DocumentShare, Integer> {

    Optional<DocumentShare> findByDocumentAndSharedWithAndStatus(Document document, User sharedWith, String status);

    List<DocumentShare> findByDocumentAndStatus(Document document, String status);

    @Query("SELECT ds FROM DocumentShare ds WHERE ds.sharedWith = :user AND ds.status = 'ACTIVE' AND ds.document.status = 'ACTIVE'")
    List<DocumentShare> findActiveSharesWithMe(@Param("user") User user);

    void deleteByDocument(Document document);

    long countBySharedByAndStatus(User sharedBy, String status);
}
