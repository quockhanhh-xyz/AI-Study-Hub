package com.demo.ai_study_hub.repository;

import com.demo.ai_study_hub.entity.SystemReviewReply;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SystemReviewReplyRepository extends JpaRepository<SystemReviewReply, Integer> {

    List<SystemReviewReply> findBySystemReview_ReviewIdAndDeletedAtIsNullOrderByCreatedAtAsc(Integer reviewId);
}
