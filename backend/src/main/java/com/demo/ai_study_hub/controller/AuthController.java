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
                    .sameSite("Strict")
                    .path("/")
                    .maxAge(jwtUtil.getExpirationMs() / 1000)
                    .build();
            response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());

            LoginResponse loginResponse = LoginResponse.builder()
                    .userId(user.getUserId())
                    .fullName(user.getFullName())
                    .email(user.getEmail())
                    .role(user.getRole())
                    .status(user.getStatus())
                    .build();

            return ResponseEntity.ok(new ApiResponse<>(true, "Login successful", loginResponse));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(new ApiResponse<>(false, e.getMessage(), null));
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Object>> logout(HttpServletResponse response) {
        ResponseCookie cookie = ResponseCookie.from(AuthCookieConstants.COOKIE_NAME, "")
                .httpOnly(true)
                .secure(AuthCookieConstants.COOKIE_SECURE)
                .sameSite("Strict")
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
            Map<String, Object> data = Map.of(
                    "userId", user.getUserId(),
                    "email", user.getEmail(),
                    "fullName", user.getFullName(),
                    "role", user.getRole(),
                    "tier", user.getTier(),
                    "status", user.getStatus()
            );
            return ResponseEntity.ok(new ApiResponse<>(true, "Current user retrieved successfully", data));
        } catch (RuntimeException e) {
            return ResponseEntity.status(401).body(new ApiResponse<>(false, e.getMessage(), null));
        }
    }
}
