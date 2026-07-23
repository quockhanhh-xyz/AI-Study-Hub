package com.demo.ai_study_hub.repository;

import com.demo.ai_study_hub.entity.Appeal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AppealRepository extends JpaRepository<Appeal, Integer> {
    List<Appeal> findAllByOrderByCreatedAtDesc();
}
