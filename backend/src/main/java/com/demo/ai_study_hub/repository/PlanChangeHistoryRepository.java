package com.demo.ai_study_hub.repository;

import com.demo.ai_study_hub.entity.PlanChangeHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface PlanChangeHistoryRepository extends JpaRepository<PlanChangeHistory, Long> {
    List<PlanChangeHistory> findAllByOrderByChangedAtDesc();
}
