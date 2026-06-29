package com.demo.ai_study_hub.repository;

import com.demo.ai_study_hub.entity.DocumentContent;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface DocumentContentRepository extends JpaRepository<DocumentContent, Long> {

    Optional<DocumentContent> findByDocument_DocumentId(Integer documentId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT dc FROM DocumentContent dc WHERE dc.document.documentId = :documentId")
    Optional<DocumentContent> findByDocumentIdForWrite(@Param("documentId") Integer documentId);

    @Query("SELECT dc.document.documentId, dc.processingStatus FROM DocumentContent dc WHERE dc.document.documentId IN :documentIds")
    List<Object[]> findStatusesByDocumentIds(@Param("documentIds") List<Integer> documentIds);

    @Query("SELECT dc FROM DocumentContent dc JOIN FETCH dc.document d WHERE d.documentId IN :documentIds")
    List<DocumentContent> findAllByDocumentIds(@Param("documentIds") List<Integer> documentIds);
}
