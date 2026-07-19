package com.demo.ai_study_hub;

import com.demo.ai_study_hub.dto.ChangePasswordRequest;
import com.demo.ai_study_hub.entity.User;
import com.demo.ai_study_hub.repository.UserRepository;
import com.demo.ai_study_hub.service.AccountPasswordService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AccountPasswordServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private AccountPasswordService accountPasswordService;

    private User testUser;
    private ChangePasswordRequest request;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setUserId(1);
        testUser.setStatus("ACTIVE");
        testUser.setPasswordHash("hashed_old_password");

        request = new ChangePasswordRequest();
        request.setCurrentPassword("old_password");
        request.setNewPassword("newPassword123");
    }

    @Test
    void changePassword_Success() {
        when(passwordEncoder.matches("old_password", "hashed_old_password")).thenReturn(true);
        when(passwordEncoder.matches("newPassword123", "hashed_old_password")).thenReturn(false);
        when(passwordEncoder.encode("newPassword123")).thenReturn("hashed_new_password");

        accountPasswordService.changePassword(testUser, request);

        verify(userRepository, times(1)).save(testUser);
        assertEquals("hashed_new_password", testUser.getPasswordHash());
    }

    @Test
    void changePassword_ThrowsIfBlocked() {
        testUser.setStatus("BLOCKED");
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                accountPasswordService.changePassword(testUser, request));
        assertEquals("403 FORBIDDEN \"AUTH_ACCOUNT_BLOCKED\"", ex.getMessage());
    }

    @Test
    void changePassword_ThrowsIfCurrentIncorrect() {
        when(passwordEncoder.matches("old_password", "hashed_old_password")).thenReturn(false);
        
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                accountPasswordService.changePassword(testUser, request));
        assertEquals("400 BAD_REQUEST \"CURRENT_PASSWORD_INCORRECT\"", ex.getMessage());
    }

    @Test
    void changePassword_ThrowsIfNewSameAsCurrent() {
        when(passwordEncoder.matches("old_password", "hashed_old_password")).thenReturn(true);
        when(passwordEncoder.matches("newPassword123", "hashed_old_password")).thenReturn(true);

        assertThrows(ResponseStatusException.class, () ->
                accountPasswordService.changePassword(testUser, request));
    }
}
