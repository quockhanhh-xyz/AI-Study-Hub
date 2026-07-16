package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.dto.NotificationResponse;
import com.demo.ai_study_hub.dto.UnreadCountResponse;
import com.demo.ai_study_hub.entity.Notification;
import com.demo.ai_study_hub.entity.User;
import com.demo.ai_study_hub.repository.NotificationRepository;
import com.demo.ai_study_hub.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<NotificationResponse> getMyNotifications(String email) {
        User user = getUser(email);
        List<Notification> list = notificationRepository.findByRecipient_UserIdOrderByCreatedAtDesc(user.getUserId());
        return list.stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public UnreadCountResponse getUnreadCount(String email) {
        User user = getUser(email);
        long count = notificationRepository.countByRecipient_UserIdAndReadFalse(user.getUserId());
        return new UnreadCountResponse(count);
    }

    @Transactional
    public NotificationResponse markAsRead(Long notificationId, String email) {
        User user = getUser(email);
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification not found"));

        if (!notification.getRecipient().getUserId().equals(user.getUserId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You cannot read other user's notification");
        }

        if (!notification.isRead()) {
            notification.setRead(true);
            notification.setReadAt(LocalDateTime.now(ZoneOffset.UTC));
            notification = notificationRepository.save(notification);
        }

        return toResponse(notification);
    }

    @Transactional
    public void markAllAsRead(String email) {
        User user = getUser(email);
        List<Notification> unread = notificationRepository.findByRecipient_UserIdAndReadFalse(user.getUserId());
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        for (Notification n : unread) {
            n.setRead(true);
            n.setReadAt(now);
        }
        notificationRepository.saveAll(unread);
    }

    @Transactional
    public void createNotification(User recipient, String type, String title, String message, String targetType, Long targetId) {
        createNotification(recipient, type, title, message, targetType, targetId, null);
    }

    @Transactional
    public void createNotification(User recipient, String type, String title, String message, String targetType, Long targetId, Integer actorUserId) {
        Notification notification = Notification.builder()
                .recipient(recipient)
                .type(type)
                .title(title)
                .message(message)
                .targetType(targetType)
                .targetId(targetId)
                .actorUserId(actorUserId)
                .read(false)
                .createdAt(LocalDateTime.now(ZoneOffset.UTC))
                .build();
        notificationRepository.save(notification);
    }

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
    }

    private NotificationResponse toResponse(Notification n) {
        return NotificationResponse.builder()
                .notificationId(n.getNotificationId())
                .type(n.getType())
                .title(n.getTitle())
                .message(n.getMessage())
                .targetType(n.getTargetType())
                .targetId(n.getTargetId())
                .actorUserId(n.getActorUserId())
                .read(n.isRead())
                .createdAt(n.getCreatedAt() != null ? n.getCreatedAt().toInstant(ZoneOffset.UTC) : null)
                .build();
    }
}
