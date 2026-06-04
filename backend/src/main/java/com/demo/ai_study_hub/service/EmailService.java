package com.demo.ai_study_hub.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    // Đã thêm giá trị mặc định fallback bằng dấu hai chấm : để chạy test không bị crash
    @Value("${spring.mail.username:}")
    private String fromEmail;

    public void sendOtpEmail(String toEmail, String otpCode) {
        SimpleMailMessage message = new SimpleMailMessage();
        
        // Thay thế chuỗi viết cứng cũ bằng biến fromEmail đã được tiêm (inject) ở trên
        message.setFrom(fromEmail); 
        
        message.setTo(toEmail);
        message.setSubject("AI Study Hub - Mã xác thực OTP");
        message.setText(
                "Xin chào!\n\n" +
                        "Mã OTP của bạn là: " + otpCode + "\n\n" +
                        "Mã có hiệu lực trong 5 phút.\n" +
                        "Vui lòng không chia sẻ mã này với ai.\n\n" +
                        "AI Study Hub Team"
        );
        mailSender.send(message);
    }
}