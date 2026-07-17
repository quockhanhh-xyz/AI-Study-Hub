package com.demo.ai_study_hub.controller;

import com.demo.ai_study_hub.dto.ApiResponse;
import com.demo.ai_study_hub.dto.AdminUserListResponse;
import com.demo.ai_study_hub.dto.AdminUserItem;
import com.demo.ai_study_hub.entity.User;
import com.demo.ai_study_hub.service.AdminUserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/users")
public class AdminUserController {

    @Autowired
    private AdminUserService adminUserService;

    @GetMapping
    public ResponseEntity<ApiResponse<AdminUserListResponse>> getUsers(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String tier,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String direction
    ) {
        Sort sort = direction.equalsIgnoreCase(Sort.Direction.ASC.name()) ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(page, size, sort);
        AdminUserListResponse response = adminUserService.getUsers(search, role, tier, status, pageable);
        return ResponseEntity.ok(ApiResponse.success(response, "Users retrieved successfully"));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<AdminUserItem>> getUserById(@PathVariable Integer id) {
        AdminUserItem user = adminUserService.getUserById(id);
        return ResponseEntity.ok(ApiResponse.success(user, "User retrieved successfully"));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<AdminUserItem>> updateUserStatus(
            @PathVariable Integer id,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal User currentUser) {
        String newStatus = body.get("status");
        if (newStatus == null || newStatus.isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Status is required"));
        }
        AdminUserItem updated = adminUserService.updateUserStatus(id, newStatus, currentUser.getUserId());
        return ResponseEntity.ok(ApiResponse.success(updated, "User status updated successfully"));
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> exportUsers(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String tier,
            @RequestParam(required = false) String status
    ) {
        byte[] data = adminUserService.exportUsers(search, role, tier, status);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
        headers.setContentDispositionFormData("attachment", "users.xlsx");
        return ResponseEntity.ok().headers(headers).body(data);
    }
}
