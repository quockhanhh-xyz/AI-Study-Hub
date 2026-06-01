package com.demo.ai_study_hub.controller;

import com.demo.ai_study_hub.dto.ApiResponse;
import com.demo.ai_study_hub.dto.ResendOtpRequest;
import com.demo.ai_study_hub.dto.VerifyOtpRequest;
import com.demo.ai_study_hub.entity.User;
import com.demo.ai_study_hub.repository.UserRepository;
import com.demo.ai_study_hub.service.OtpService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class OtpController {

    private final UserRepository userRepository;
    private final OtpService otpService;

    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(@RequestBody VerifyOtpRequest req) {
        User user = userRepository.findByEmail(req.getEmail()).orElse(null);

        if (user == null) {
            return ResponseEntity.status(404)
                    .body(ApiResponse.builder()
                            .success(false)
                            .message("Email không tồn tại")
                            .build());
        }

        boolean valid = otpService.verifyOtp(user, req.getOtpCode());

        if (!valid) {
            return ResponseEntity.status(400)
                    .body(ApiResponse.builder()
                            .success(false)
                            .message("OTP không đúng hoặc đã hết hạn")
                            .build());
        }

        // Kích hoạt tài khoản
        user.setStatus("ACTIVE");
        userRepository.save(user);

        return ResponseEntity.ok(ApiResponse.builder()
                .success(true)
                .message("Xác thực thành công! Tài khoản đã được kích hoạt")
                .build());
    }

    @PostMapping("/resend-otp")
    public ResponseEntity<?> resendOtp(@RequestBody ResendOtpRequest req) {
        User user = userRepository.findByEmail(req.getEmail()).orElse(null);

        if (user == null) {
            return ResponseEntity.status(404)
                    .body(ApiResponse.builder()
                            .success(false)
                            .message("Email không tồn tại")
                            .build());
        }

        if ("ACTIVE".equals(user.getStatus())) {
            return ResponseEntity.status(400)
                    .body(ApiResponse.builder()
                            .success(false)
                            .message("Tài khoản đã được xác thực rồi")
                            .build());
        }

        otpService.createAndSendOtp(user);

        return ResponseEntity.ok(ApiResponse.builder()
                .success(true)
                .message("Đã gửi lại OTP về email của bạn")
                .build());
    }
}