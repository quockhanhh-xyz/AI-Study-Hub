package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.entity.OtpCode;
import com.demo.ai_study_hub.entity.User;
import com.demo.ai_study_hub.repository.OtpCodeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Random;

@Service
@RequiredArgsConstructor
public class OtpService {

    private final OtpCodeRepository otpCodeRepository;
    private final EmailService emailService;

    // Method cung cấp cho BE1
    public void createAndSendOtp(User user) {
        // Tạo OTP 6 số
        String code = String.format("%06d", new Random().nextInt(999999));

        // Lưu vào DB
        OtpCode otp = new OtpCode();
        otp.setUser(user);
        otp.setCode(code);
        otp.setExpiredAt(LocalDateTime.now().plusMinutes(5));
        otp.setPurpose("REGISTER");
        otp.setUsed(false);
        otpCodeRepository.save(otp);

        // Gửi email
        emailService.sendOtpEmail(user.getEmail(), code);
    }

    // Verify OTP
    public boolean verifyOtp(User user, String inputCode) {
        OtpCode otp = otpCodeRepository
                .findTopByUserAndPurposeAndUsedFalseOrderByExpiredAtDesc(user, "REGISTER")
                .orElse(null);

        if (otp == null) return false;

        // Kiểm tra hết hạn
        if (otp.getExpiredAt().isBefore(LocalDateTime.now())) return false;

        // Kiểm tra mã đúng không
        if (!otp.getCode().equals(inputCode)) return false;

        // Đánh dấu đã dùng
        otp.setUsed(true);
        otpCodeRepository.save(otp);

        return true;
    }
}