package com.demo.ai_study_hub.repository;

import com.demo.ai_study_hub.entity.Document;
import com.demo.ai_study_hub.entity.DocumentRating;
import com.demo.ai_study_hub.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface DocumentRatingRepository extends JpaRepository<DocumentRating, Long> {

    Optional<DocumentRating> findByDocumentAndUser(Document document, User user);

    @Query("SELECT COUNT(r) FROM DocumentRating r WHERE r.document = :document")
    Long countRatingsByDocument(@Param("document") Document document);

    @Query("SELECT AVG(r.rating) FROM DocumentRating r WHERE r.document = :document")
    Double getAverageRatingByDocument(@Param("document") Document document);
}
