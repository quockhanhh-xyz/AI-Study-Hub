package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.dto.LoginRequest;
import com.demo.ai_study_hub.dto.RegisterRequest;
import com.demo.ai_study_hub.entity.User;
import com.demo.ai_study_hub.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final OtpService otpService;

    @Transactional
    public User register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email đã tồn tại trong hệ thống!");
        }

        // ================= FIX P1: VALIDATE PASSWORD POLICY =================
        String password = request.getPassword();
        if (password == null || password.length() < 8) {
            throw new RuntimeException("Mật khẩu phải có độ dài tối thiểu 8 ký tự!");
        }
        // Biểu thức chính quy: Kiểm tra chứa ít nhất 1 chữ cái và 1 chữ số
        if (!password.matches(".*[a-zA-Z].*") || !password.matches(".*\\d.*")) {
            throw new RuntimeException("Mật khẩu phải chứa ít nhất 1 chữ cái và 1 chữ số!");
        }
        // ====================================================================

        User user = new User();
        user.setFullName(request.getFullName());
        user.setEmail(request.getEmail());
        user.setPasswordHash(passwordEncoder.encode(password));

        userRepository.save(user);

        // Sinh và gửi OTP về email
        otpService.createAndSendOtp(user);

        return user;
    }

    public Map<String, Object> login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tài khoản với email này!"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new RuntimeException("Sai mật khẩu!");
        }

        // ================= FIX P1: LOGIN STATUS CHECK (TỔNG QUÁT) =================
        // Thay vì check từng trạng thái xấu, ta đổi tư duy: Không phải ACTIVE thì block hết
        if (!"ACTIVE".equals(user.getStatus())) {
            if ("INACTIVE".equals(user.getStatus())) {
                throw new RuntimeException("Please verify your email before login");
            } else if ("BLOCKED".equals(user.getStatus())) {
                throw new RuntimeException("Your account has been blocked");
            } else {
                throw new RuntimeException("Account is not active");
            }
        }
        // ==========================================================================

        String token = jwtUtil.generateToken(user.getEmail());

        Map<String, Object> data = new HashMap<>();
        data.put("token", token);
        data.put("userId", user.getUserId());
        data.put("role", user.getRole());
        data.put("email", user.getEmail());
        data.put("fullName", user.getFullName());
        data.put("status", user.getStatus());

        return data;
    }

    public User getCurrentUser() {
        String email = org.springframework.security.core.context.SecurityContextHolder
                .getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Tài khoản không tồn tại!"));
    }
}