package com.demo.ai_study_hub.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
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

    public void sendResetPasswordEmail(String toEmail, String otpCode) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromEmail);
        message.setTo(toEmail);
        message.setSubject("AI Study Hub - Reset Password OTP");
        message.setText(
                "Hello!\n\n" +
                        "You requested to reset your password. Your OTP code is: " + otpCode + "\n\n" +
                        "This code is valid for 5 minutes.\n" +
                        "If you did not request this, you can safely ignore this email.\n\n" +
                        "Best regards,\n" +
                        "AI Study Hub Team"
        );
        mailSender.send(message);
    }

    /**
     * Sends an HTML group invite email with a styled "Join Group" button.
     *
     * @param toEmail   recipient's email address
     * @param groupName display name of the study group
     * @param joinUrl   full URL including the invite code query param
     */
    public void sendGroupInviteEmail(String toEmail, String groupName, String joinUrl) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject("AI Study Hub - You have been invited to join \"" + groupName + "\"");

            String html = "<div style=\"font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px;\">"
                    + "<h2 style=\"color:#4f46e5;margin-bottom:8px;\">You've been invited!</h2>"
                    + "<p style=\"color:#374151;font-size:15px;\">"
                    + "You have been invited to join the study group: <strong>" + escapeHtml(groupName) + "</strong></p>"
                    + "<p style=\"color:#6b7280;font-size:14px;\">Click the button below to join:</p>"
                    + "<a href=\"" + joinUrl + "\" "
                    + "style=\"display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;"
                    + "padding:12px 28px;border-radius:8px;font-size:15px;font-weight:600;margin:12px 0;\">"
                    + "Join Group</a>"
                    + "<p style=\"color:#9ca3af;font-size:12px;margin-top:20px;\">"
                    + "If the button doesn't work, copy and paste this link into your browser:<br>"
                    + "<a href=\"" + joinUrl + "\" style=\"color:#4f46e5;\">" + joinUrl + "</a></p>"
                    + "<hr style=\"border:none;border-top:1px solid #e5e7eb;margin:24px 0;\">"
                    + "<p style=\"color:#9ca3af;font-size:12px;\">AI Study Hub Team</p>"
                    + "</div>";

            helper.setText(html, true);
            mailSender.send(message);
        } catch (MessagingException e) {
            log.error("Failed to send group invite email to {}: {}", toEmail, e.getMessage());
            throw new RuntimeException("Failed to send group invite email", e);
        }
    }

    private String escapeHtml(String text) {
        if (text == null) return "";
        return text.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }
}
