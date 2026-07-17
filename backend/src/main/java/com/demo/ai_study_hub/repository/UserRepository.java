package com.demo.ai_study_hub.repository;

import com.demo.ai_study_hub.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface UserRepository extends JpaRepository<User, Integer>, JpaSpecificationExecutor<User> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("SELECT u FROM User u WHERE u.userId = :id")
    Optional<User> findByIdForUpdate(@org.springframework.data.repository.query.Param("id") Integer id);

    @org.springframework.data.jpa.repository.Query("SELECT u.tier, COUNT(u) FROM User u GROUP BY u.tier")
    List<Object[]> countUsersByTier();
}