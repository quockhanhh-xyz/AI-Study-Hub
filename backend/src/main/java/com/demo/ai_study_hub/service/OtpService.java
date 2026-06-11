package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.entity.OtpCode;
import com.demo.ai_study_hub.entity.User;
import com.demo.ai_study_hub.repository.OtpCodeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.security.SecureRandom;

@Service
@RequiredArgsConstructor
public class OtpService {

    private final OtpCodeRepository otpCodeRepository;
    private final EmailService emailService;
    private final SecureRandom secureRandom = new SecureRandom();

    public void createAndSendOtp(User user) {
        String code = String.format("%06d", secureRandom.nextInt(1000000));

        OtpCode otp = new OtpCode();
        otp.setUser(user);
        otp.setCode(code);
        otp.setExpiredAt(LocalDateTime.now().plusMinutes(5));
        otp.setPurpose("REGISTER");
        otp.setUsed(false);
        otpCodeRepository.save(otp);

        emailService.sendOtpEmail(user.getEmail(), code);
    }

    // Verify OTP
    public boolean verifyOtp(User user, String inputCode) {
        OtpCode otp = otpCodeRepository
                .findTopByUserAndPurposeAndUsedFalseOrderByExpiredAtDesc(user, "REGISTER")
                .orElse(null);

        if (otp == null) return false;

        if (otp.getExpiredAt().isBefore(LocalDateTime.now())) return false;

        if (!otp.getCode().equals(inputCode)) return false;

        otp.setUsed(true);
        otpCodeRepository.save(otp);

        return true;
    }
}
