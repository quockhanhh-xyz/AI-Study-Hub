package com.demo.ai_study_hub.repository;

import com.demo.ai_study_hub.entity.Document;
import com.demo.ai_study_hub.entity.DocumentFavorite;
import com.demo.ai_study_hub.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.Set;

public interface DocumentFavoriteRepository extends JpaRepository<DocumentFavorite, Long> {

    Optional<DocumentFavorite> findByUserAndDocument(User user, Document document);

    boolean existsByUserAndDocument(User user, Document document);

    boolean existsByUser_UserIdAndDocument_DocumentId(Integer userId, Integer documentId);

    List<DocumentFavorite> findByUserOrderByCreatedAtDesc(User user);

    /**
     * Bulk existence check for a set of document ids, used to compute
     * favoritedByMe efficiently on list endpoints (my/public/shared-with-me)
     * without one query per row.
     */
    @Query("SELECT f.document.documentId FROM DocumentFavorite f " +
            "WHERE f.user.userId = :userId AND f.document.documentId IN :documentIds")
    Set<Integer> findFavoritedDocumentIds(@Param("userId") Integer userId,
                                          @Param("documentIds") List<Integer> documentIds);
}