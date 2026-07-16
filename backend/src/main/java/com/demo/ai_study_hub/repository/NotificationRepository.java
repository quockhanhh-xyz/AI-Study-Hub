package com.demo.ai_study_hub.repository;

import com.demo.ai_study_hub.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findByRecipient_UserIdOrderByCreatedAtDesc(Integer recipientUserId);

    long countByRecipient_UserIdAndReadFalse(Integer recipientUserId);

    List<Notification> findByRecipient_UserIdAndReadFalse(Integer recipientUserId);
}
