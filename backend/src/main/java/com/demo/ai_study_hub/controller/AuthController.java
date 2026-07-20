package com.demo.ai_study_hub.controller;

import com.demo.ai_study_hub.config.AuthCookieConstants;
import com.demo.ai_study_hub.dto.ApiResponse;
import com.demo.ai_study_hub.dto.LoginRequest;
import com.demo.ai_study_hub.dto.LoginResponse;
import com.demo.ai_study_hub.dto.RegisterRequest;
import com.demo.ai_study_hub.entity.User;
import com.demo.ai_study_hub.service.AuthService;
import com.demo.ai_study_hub.service.JwtUtil;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final JwtUtil jwtUtil;
    private final com.demo.ai_study_hub.service.TierPolicyService tierPolicyService;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<Object>> register(@RequestBody RegisterRequest request) {
        try {
            User user = authService.register(request);
            Map<String, Object> data = Map.of(
                    "email", user.getEmail(),
                    "status", user.getStatus()
            );
            return ResponseEntity.ok(new ApiResponse<>(
                    true,
                    "Register successfully. Please verify OTP sent to your email.",
                    data
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(new ApiResponse<>(false, e.getMessage(), null));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(
            @RequestBody LoginRequest request,
            HttpServletResponse response) {
        try {
            User user = authService.loginAndGetUser(request);
            String token = jwtUtil.generateToken(user.getEmail());

            ResponseCookie cookie = ResponseCookie.from(AuthCookieConstants.COOKIE_NAME, token)
                    .httpOnly(true)
                    .secure(AuthCookieConstants.COOKIE_SECURE)
                    .sameSite(AuthCookieConstants.COOKIE_SAME_SITE)
                    .path("/")
                    .maxAge(jwtUtil.getExpirationMs() / 1000)
                    .build();
            response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());

            String normalizedRole = user.getRole();
            if (normalizedRole != null) {
                normalizedRole = normalizedRole.toUpperCase();
                if (normalizedRole.startsWith("ROLE_")) {
                    normalizedRole = normalizedRole.substring(5);
                }
            } else {
                normalizedRole = "USER";
            }

            LoginResponse loginResponse = LoginResponse.builder()
                    .userId(user.getUserId())
                    .fullName(user.getFullName())
                    .email(user.getEmail())
                    .role(normalizedRole)
                    .status(user.getStatus())
                    .build();

            return ResponseEntity.ok(new ApiResponse<>(true, "Login successful", loginResponse));
        } catch (RuntimeException e) {
            if ("Your account has been blocked.".equals(e.getMessage())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(ApiResponse.error(e.getMessage(), "AUTH_ACCOUNT_BLOCKED"));
            }
            return ResponseEntity.badRequest().body(new ApiResponse<>(false, e.getMessage(), null));
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Object>> logout(HttpServletResponse response) {
        ResponseCookie cookie = ResponseCookie.from(AuthCookieConstants.COOKIE_NAME, "")
                .httpOnly(true)
                .secure(AuthCookieConstants.COOKIE_SECURE)
                .sameSite(AuthCookieConstants.COOKIE_SAME_SITE)
                .path("/")
                .maxAge(0)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());

        return ResponseEntity.ok(new ApiResponse<>(true, "Logout successfully", null));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<Object>> getMe(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401)
                    .body(new ApiResponse<>(false, "Unauthorized", null));
        }
        try {
            User user = authService.getUserByEmail(authentication.getName());
            String normalizedRole = user.getRole();
            if (normalizedRole != null) {
                normalizedRole = normalizedRole.toUpperCase();
                if (normalizedRole.startsWith("ROLE_")) {
                    normalizedRole = normalizedRole.substring(5);
                }
            } else {
                normalizedRole = "USER";
            }

            Map<String, Object> data = new java.util.LinkedHashMap<>();
            data.put("userId", user.getUserId());
            data.put("email", user.getEmail());
            data.put("fullName", user.getFullName());
            data.put("avatarUrl", user.getAvatarUrl());
            data.put("role", normalizedRole);
            data.put("tier", user.getTier());
            data.put("status", user.getStatus());
            data.put("effectiveTier", tierPolicyService.getEffectiveTier(user));
            data.put("tierExpiresAt", user.getTierExpiresAt() != null ? user.getTierExpiresAt().atZone(java.time.ZoneOffset.UTC).format(java.time.format.DateTimeFormatter.ISO_INSTANT) : null);
            return ResponseEntity.ok(new ApiResponse<>(true, "Current user retrieved successfully", data));
        } catch (RuntimeException e) {
            return ResponseEntity.status(401).body(new ApiResponse<>(false, e.getMessage(), null));
        }
    }
}
