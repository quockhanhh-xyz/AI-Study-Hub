package com.demo.ai_study_hub.controller;

import com.demo.ai_study_hub.dto.ApiResponse;
import com.demo.ai_study_hub.dto.ResendOtpRequest;
import com.demo.ai_study_hub.dto.VerifyOtpRequest;
import com.demo.ai_study_hub.entity.OtpCode;
import com.demo.ai_study_hub.entity.User;
import com.demo.ai_study_hub.repository.OtpCodeRepository;
import com.demo.ai_study_hub.repository.UserRepository;
import com.demo.ai_study_hub.service.OtpService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class OtpController {

    private final UserRepository userRepository;
    private final OtpService otpService;
    private final OtpCodeRepository otpCodeRepository;

    @PostMapping("/verify-otp")
    public ResponseEntity<ApiResponse<Object>> verifyOtp(@RequestBody VerifyOtpRequest req) {
        User user = userRepository.findByEmail(req.getEmail()).orElse(null);

        if (user == null) {
            return ResponseEntity.status(404)
                    .body(new ApiResponse<>(false, "User not found", null));
        }

        if ("ACTIVE".equals(user.getStatus())) {
            return ResponseEntity.badRequest()
                    .body(new ApiResponse<>(false, "Account is already verified", null));
        }

        OtpCode otp = otpCodeRepository
                .findTopByUserAndPurposeAndUsedFalseOrderByExpiredAtDesc(user, "REGISTER")
                .orElse(null);

        if (otp == null || !otp.getCode().equals(req.getOtpCode())) {
            return ResponseEntity.badRequest()
                    .body(new ApiResponse<>(false, "Invalid OTP", null));
        }

        if (otp.getExpiredAt().isBefore(LocalDateTime.now())) {
            return ResponseEntity.badRequest()
                    .body(new ApiResponse<>(false, "OTP has expired", null));
        }

        // Mark OTP as used and activate user
        otp.setUsed(true);
        otpCodeRepository.save(otp);

        user.setStatus("ACTIVE");
        userRepository.save(user);

        Map<String, Object> data = Map.of(
                "email", user.getEmail(),
                "status", user.getStatus()
        );

        return ResponseEntity.ok(new ApiResponse<>(true, "Email verified successfully", data));
    }

    @PostMapping("/resend-otp")
    public ResponseEntity<ApiResponse<Object>> resendOtp(@RequestBody ResendOtpRequest req) {
        User user = userRepository.findByEmail(req.getEmail()).orElse(null);

        if (user == null) {
            return ResponseEntity.status(404)
                    .body(new ApiResponse<>(false, "User not found", null));
        }

        if ("ACTIVE".equals(user.getStatus())) {
            return ResponseEntity.badRequest()
                    .body(new ApiResponse<>(false, "Account is already verified", null));
        }

        otpService.createAndSendOtp(user);

        Map<String, Object> data = Map.of(
                "email", user.getEmail()
        );

        return ResponseEntity.ok(new ApiResponse<>(true, "OTP has been resent to your email", data));
    }
}