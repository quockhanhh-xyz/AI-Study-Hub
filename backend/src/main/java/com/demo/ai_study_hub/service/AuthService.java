package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.dto.LoginRequest;
import com.demo.ai_study_hub.dto.RegisterRequest;
import com.demo.ai_study_hub.entity.User;
import com.demo.ai_study_hub.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final OtpService otpService;
    private final NotificationService notificationService;

    @Transactional
    public User register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already exists.");
        }

        String password = request.getPassword();
        if (password == null || !password.matches("^(?=.*[A-Za-z])(?=.*\\d).{8,}$")) {
            throw new RuntimeException(
                    "Password must be at least 8 characters, including at least 1 letter and 1 number.");
        }

        User user = new User();
        user.setFullName(request.getFullName());
        user.setEmail(request.getEmail());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        userRepository.save(user);
        otpService.createAndSendOtp(user);

        notificationService.notifyAllAdmins(
            "USER_REGISTER",
            "New User Registered",
            "User " + user.getFullName() + " (" + user.getEmail() + ") has registered a new account.",
            "USER",
            (long) user.getUserId()
        );

        return user;
    }

    public User loginAndGetUser(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Invalid email or password."));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new RuntimeException("Invalid email or password.");
        }

        if (!"ACTIVE".equals(user.getStatus())) {
            if ("INACTIVE".equals(user.getStatus())) {
                throw new RuntimeException("Please verify your email before login.");
            } else if ("BLOCKED".equals(user.getStatus())) {
                throw new RuntimeException("Your account has been blocked.");
            } else {
                throw new RuntimeException("Account is not active.");
            }
        }

        notificationService.notifyAllAdmins(
            "USER_LOGIN",
            "User Logged In",
            "User " + user.getFullName() + " (" + user.getEmail() + ") has logged in.",
            "USER",
            (long) user.getUserId()
        );

        return user;
    }

    public User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found."));
    }

    public User getCurrentUser() {
        String email = org.springframework.security.core.context.SecurityContextHolder
                .getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found."));
    }
}
