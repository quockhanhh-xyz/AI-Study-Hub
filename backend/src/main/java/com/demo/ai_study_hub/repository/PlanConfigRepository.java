package com.demo.ai_study_hub.repository;

import com.demo.ai_study_hub.entity.PlanConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PlanConfigRepository extends JpaRepository<PlanConfig, String> {
    List<PlanConfig> findByTargetTier(String targetTier);
}
