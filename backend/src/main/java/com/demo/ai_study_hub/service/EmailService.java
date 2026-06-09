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

    @Value("${spring.mail.username:}")
    private String fromEmail;

    public void sendOtpEmail(String toEmail, String otpCode) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromEmail); 
        
        message.setTo(toEmail);
        message.setSubject("AI Study Hub - OTP Verification Code");
        message.setText(
                "Hello!\n\n" +
                        "Your OTP code is: " + otpCode + "\n\n" +
                        "This code is valid for 5 minutes.\n" +
                        "Please do not share this code with anyone.\n\n" +
                        "Best regards,\n" +
                        "AI Study Hub Team"
        );
        mailSender.send(message);
    }
}
