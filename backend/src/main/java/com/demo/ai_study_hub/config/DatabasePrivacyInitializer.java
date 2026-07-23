package com.demo.ai_study_hub.config;

import com.demo.ai_study_hub.entity.User;
import com.demo.ai_study_hub.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
@RequiredArgsConstructor
public class DatabasePrivacyInitializer implements CommandLineRunner {

    private final UserRepository userRepository;

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        try {
            List<User> users = userRepository.findAll();
            boolean updated = false;
            for (User user : users) {
                // Initialize default privacy settings to true for local testing compatibility
                // If a user has profilePublic as false, we upgrade it to true to ensure existing users
                // created before the migration are public by default.
                if (!user.isProfilePublic()) {
                    user.setProfilePublic(true);
                    user.setShowSchool(true);
                    user.setShowMajor(true);
                    user.setShowBio(true);
                    user.setShowPublicDocuments(true);
                    userRepository.save(user);
                    updated = true;
                }
            }
            if (updated) {
                System.out.println(">>> DatabasePrivacyInitializer: Successfully initialized default privacy flags (true) for existing users in the database.");
            }
        } catch (Exception e) {
            System.err.println(">>> DatabasePrivacyInitializer: Failed to auto-initialize default privacy flags: " + e.getMessage());
        }
    }
}
