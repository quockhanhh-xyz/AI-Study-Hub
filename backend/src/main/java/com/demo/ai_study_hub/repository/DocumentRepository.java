package com.demo.ai_study_hub.repository;

import com.demo.ai_study_hub.entity.Document;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DocumentRepository extends JpaRepository<Document, Integer> {
    List<Document> findByOwner_UserId(Integer userId);
}