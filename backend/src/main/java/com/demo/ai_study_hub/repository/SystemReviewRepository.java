package com.demo.ai_study_hub.repository;

import com.demo.ai_study_hub.entity.SystemReview;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SystemReviewRepository extends JpaRepository<SystemReview, Integer>, JpaSpecificationExecutor<SystemReview> {

    Optional<SystemReview> findByUser_UserIdAndDeletedAtIsNull(Integer userId);

    Optional<SystemReview> findByUser_UserId(Integer userId);

    @Query("SELECT AVG(r.rating) FROM SystemReview r WHERE r.deletedAt IS NULL")
    Double getAverageRating();

    @Query("SELECT COUNT(r) FROM SystemReview r WHERE r.deletedAt IS NULL")
    long countActiveReviews();

    @Query("SELECT COUNT(r) FROM SystemReview r WHERE r.deletedAt IS NULL AND r.status IN ('NEW', 'IN_REVIEW')")
    long countUnrespondedReviews();

    @Query("SELECT r.rating, COUNT(r) FROM SystemReview r WHERE r.deletedAt IS NULL GROUP BY r.rating")
    List<Object[]> getRatingDistribution();
}
