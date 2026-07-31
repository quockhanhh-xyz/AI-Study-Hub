package com.demo.ai_study_hub;

import com.demo.ai_study_hub.dto.NotificationResponse;
import com.demo.ai_study_hub.dto.UnreadCountResponse;
import com.demo.ai_study_hub.entity.Notification;
import com.demo.ai_study_hub.entity.User;
import com.demo.ai_study_hub.repository.NotificationRepository;
import com.demo.ai_study_hub.repository.UserRepository;
import com.demo.ai_study_hub.service.NotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock private NotificationRepository notificationRepository;
    @Mock private UserRepository userRepository;

    private NotificationService notificationService;
    private User recipient;
    private User otherUser;
    private Notification notification;

    @BeforeEach
    void setUp() {
        notificationService = new NotificationService(notificationRepository, userRepository);

        recipient = new User();
        recipient.setUserId(1);
        recipient.setEmail("recipient@test.com");

        otherUser = new User();
        otherUser.setUserId(2);
        otherUser.setEmail("other@test.com");

        notification = Notification.builder()
                .notificationId(100L)
                .recipient(recipient)
                .type("GROUP_JOIN_REQUEST")
                .title("New join request")
                .message("Alice requested to join.")
                .targetType("GROUP")
                .targetId(5L)
                .read(false)
                .createdAt(LocalDateTime.now())
                .build();
    }

    @Test
    void getMyNotifications_ShouldReturnOnlyUserNotifications() {
        when(userRepository.findByEmail("recipient@test.com")).thenReturn(Optional.of(recipient));
        when(notificationRepository.findByRecipient_UserIdOrderByCreatedAtDesc(1))
                .thenReturn(List.of(notification));

        List<NotificationResponse> responses = notificationService.getMyNotifications("recipient@test.com");

        assertNotNull(responses);
        assertEquals(1, responses.size());
        assertEquals("New join request", responses.get(0).getTitle());
        assertFalse(responses.get(0).isRead());
    }

    @Test
    void getUnreadCount_ShouldReturnCorrectCount() {
        when(userRepository.findByEmail("recipient@test.com")).thenReturn(Optional.of(recipient));
        when(notificationRepository.countByRecipient_UserIdAndReadFalse(1)).thenReturn(3L);

        UnreadCountResponse response = notificationService.getUnreadCount("recipient@test.com");

        assertNotNull(response);
        assertEquals(3L, response.getCount());
    }

    @Test
    void markAsRead_WhenOwnNotification_ShouldSuccess() {
        when(userRepository.findByEmail("recipient@test.com")).thenReturn(Optional.of(recipient));
        when(notificationRepository.findById(100L)).thenReturn(Optional.of(notification));
        when(notificationRepository.save(any(Notification.class))).thenAnswer(i -> i.getArgument(0));

        NotificationResponse response = notificationService.markAsRead(100L, "recipient@test.com");

        assertNotNull(response);
        assertTrue(response.isRead());
        verify(notificationRepository, times(1)).save(any(Notification.class));
    }

    @Test
    void markAsRead_WhenOtherUserNotification_ShouldThrowForbidden() {
        when(userRepository.findByEmail("other@test.com")).thenReturn(Optional.of(otherUser));
        when(notificationRepository.findById(100L)).thenReturn(Optional.of(notification));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> notificationService.markAsRead(100L, "other@test.com"));

        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
        assertEquals("You cannot read other user's notification", ex.getReason());
        verify(notificationRepository, never()).save(any(Notification.class));
    }

    @Test
    void markAllAsRead_ShouldMarkAllUnreadAsRead() {
        when(userRepository.findByEmail("recipient@test.com")).thenReturn(Optional.of(recipient));
        when(notificationRepository.findByRecipient_UserIdAndReadFalse(1)).thenReturn(List.of(notification));

        notificationService.markAllAsRead("recipient@test.com");

        assertTrue(notification.isRead());
        assertNotNull(notification.getReadAt());
        verify(notificationRepository, times(1)).saveAll(anyList());
    }

    @Test
    void createNotification_ShouldSaveNotification() {
        notificationService.createNotification(recipient, "GROUP_JOIN_REQUEST", "Title", "Message", "GROUP", 5L);

        verify(notificationRepository, times(1)).save(any(Notification.class));
    }
}
