package com.demo.ai_study_hub.controller;

import com.demo.ai_study_hub.config.JwtAuthFilter;
import com.demo.ai_study_hub.dto.LoginRequest;
import com.demo.ai_study_hub.entity.User;
import com.demo.ai_study_hub.repository.UserRepository;
import com.demo.ai_study_hub.service.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final JwtAuthFilter jwtAuthFilter;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest req) {
        User user = userRepository.findByEmail(req.getEmail())
                .orElse(null);

        if (user == null || !passwordEncoder.matches(req.getPassword(), user.getPassword())) {
            return ResponseEntity.status(401).body(Map.of("message", "Email hoặc mật khẩu không đúng"));
        }

        if (!"ACTIVE".equals(user.getStatus())) {
            return ResponseEntity.status(403).body(Map.of("message", "Tài khoản chưa được kích hoạt"));
        }

        String token = jwtUtil.generateToken(user.getEmail());
        return ResponseEntity.ok(Map.of(
                "token", token,
                "role", user.getRole(),
                "email", user.getEmail()));
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(@RequestHeader("Authorization") String authHeader) {
        String token = authHeader.replace("Bearer ", "");
        jwtAuthFilter.blacklist(token);
        return ResponseEntity.ok(Map.of("message", "Đăng xuất thành công"));
    }
}