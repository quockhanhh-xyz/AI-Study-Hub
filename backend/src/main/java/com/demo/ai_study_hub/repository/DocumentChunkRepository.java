package com.demo.ai_study_hub.repository;

import com.demo.ai_study_hub.entity.DocumentChunk;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface DocumentChunkRepository extends JpaRepository<DocumentChunk, Long> {

    List<DocumentChunk> findByDocument_DocumentIdOrderByChunkIndexAsc(Integer documentId);

    @Modifying
    @Transactional
    @Query("DELETE FROM DocumentChunk dc WHERE dc.document.documentId = :documentId")
    void deleteByDocumentId(@Param("documentId") Integer documentId);
}
