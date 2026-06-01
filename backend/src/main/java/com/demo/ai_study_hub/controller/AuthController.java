package com.demo.ai_study_hub.controller;

import com.demo.ai_study_hub.config.JwtAuthFilter;
import com.demo.ai_study_hub.dto.ApiResponse;
import com.demo.ai_study_hub.dto.LoginRequest;
import com.demo.ai_study_hub.dto.RegisterRequest;
import com.demo.ai_study_hub.service.AuthService;
import com.demo.ai_study_hub.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final JwtAuthFilter jwtAuthFilter;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<Object>> register(@RequestBody RegisterRequest request) {
        try {
            User user = authService.register(request);
            Map<String, Object> data = Map.of(
                    "email", user.getEmail(),
                    "status", user.getStatus()
            );
            ApiResponse<Object> response = new ApiResponse<>(
                    true,
                    "Register successfully. Please verify OTP sent to your email.",
                    data
            );
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            ApiResponse<Object> response = new ApiResponse<>(false, e.getMessage(), null);
            return ResponseEntity.badRequest().body(response);
        }
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<Object>> login(@RequestBody LoginRequest request) {
        try {
            Map<String, Object> data = authService.login(request);
            ApiResponse<Object> response = new ApiResponse<>(true, "Đăng nhập thành công", data);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            ApiResponse<Object> response = new ApiResponse<>(false, e.getMessage(), null);
            return ResponseEntity.badRequest().body(response);
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Object>> logout(@RequestHeader("Authorization") String authHeader) {
        String token = authHeader.replace("Bearer ", "");
        jwtAuthFilter.blacklist(token);

        ApiResponse<Object> response = new ApiResponse<>(true, "Đăng xuất thành công", null);
        return ResponseEntity.ok(response);
    }
}