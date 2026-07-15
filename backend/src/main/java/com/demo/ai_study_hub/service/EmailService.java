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

    /**
     * Sends a group invite email containing the invite link.
     * The recipient can join the group directly by clicking the link,
     * or by entering the invite code on the Groups page.
     *
     * @param toEmail   recipient's email address
     * @param groupName display name of the study group
     * @param joinUrl   full URL including the invite code query param
     */
    public void sendGroupInviteEmail(String toEmail, String groupName, String joinUrl) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromEmail);
        message.setTo(toEmail);
        message.setSubject("AI Study Hub - You have been invited to join \"" + groupName + "\"");
        message.setText(
                "Hello!\n\n" +
                        "You have been invited to join the study group: " + groupName + "\n\n" +
                        "Click the link below to join the group:\n" +
                        joinUrl + "\n\n" +
                        "If the link does not work, you can enter the invite code manually on the Groups page.\n\n" +
                        "Best regards,\n" +
                        "AI Study Hub Team"
        );
        mailSender.send(message);
    }
}
