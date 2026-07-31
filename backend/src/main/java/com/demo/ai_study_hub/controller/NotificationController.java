package com.demo.ai_study_hub.controller;

import com.demo.ai_study_hub.dto.ApiResponse;
import com.demo.ai_study_hub.dto.NotificationResponse;
import com.demo.ai_study_hub.dto.UnreadCountResponse;
import com.demo.ai_study_hub.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping("/my")
    public ResponseEntity<ApiResponse<List<NotificationResponse>>> getMyNotifications(Principal principal) {
        List<NotificationResponse> list = notificationService.getMyNotifications(principal.getName());
        return ResponseEntity.ok(ApiResponse.success(list, "Notifications retrieved successfully"));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<ApiResponse<UnreadCountResponse>> getUnreadCount(Principal principal) {
        UnreadCountResponse data = notificationService.getUnreadCount(principal.getName());
        return ResponseEntity.ok(ApiResponse.success(data, "Unread notification count fetched successfully"));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<ApiResponse<NotificationResponse>> markAsRead(@PathVariable Long id, Principal principal) {
        NotificationResponse data = notificationService.markAsRead(id, principal.getName());
        return ResponseEntity.ok(ApiResponse.success(data, "Notification marked as read successfully"));
    }

    @PutMapping("/read-all")
    public ResponseEntity<ApiResponse<Void>> markAllAsRead(Principal principal) {
        notificationService.markAllAsRead(principal.getName());
        return ResponseEntity.ok(ApiResponse.success(null, "All notifications marked as read successfully"));
    }
}
