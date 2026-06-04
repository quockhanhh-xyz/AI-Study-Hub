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
        String password = request.getPassword();
        if (password == null || !password.matches("^(?=.*[A-Za-z])(?=.*\\d).{8,}$")) {
            throw new RuntimeException(
                    "Password must be at least 8 characters, including at least 1 letter and 1 number.");
        }
    }

    User user = new User();user.setFullName(request.getFullName());user.setEmail(request.getEmail());user.setPasswordHash(passwordEncoder.encode(request.getPassword()));

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

        if ("INACTIVE".equals(user.getStatus())) {
            throw new RuntimeException("Tài khoản chưa xác thực OTP!");
        }

        if ("BLOCKED".equals(user.getStatus())) {
            throw new RuntimeException("Tài khoản đã bị admin khóa!");
        }

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