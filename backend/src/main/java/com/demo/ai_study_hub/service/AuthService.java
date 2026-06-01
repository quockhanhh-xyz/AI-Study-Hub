package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.dto.LoginRequest;
import com.demo.ai_study_hub.dto.RegisterRequest;
import com.demo.ai_study_hub.entity.User;
import com.demo.ai_study_hub.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final OtpService otpService;

    public String register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email đã tồn tại trong hệ thống!");
        }

        User user = new User();
        user.setFullName(request.getFullName());
        user.setEmail(request.getEmail());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));

        userRepository.save(user);

        // Sinh và gửi OTP về email
        otpService.createAndSendOtp(user);

        return "Đăng ký thành công! Vui lòng kiểm tra email để lấy mã OTP.";
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
        data.put("role", user.getRole());
        data.put("email", user.getEmail());
        data.put("fullName", user.getFullName());

        return data;
    }
}