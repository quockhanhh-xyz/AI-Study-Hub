package com.demo.ai_study_hub;

import com.demo.ai_study_hub.dto.ProfileResponse;
import com.demo.ai_study_hub.dto.UpdateProfileRequest;
import com.demo.ai_study_hub.entity.User;
import com.demo.ai_study_hub.enums.UserTier;
import com.demo.ai_study_hub.repository.UserRepository;
import com.demo.ai_study_hub.service.AccountProfileService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.util.Optional;

import java.time.Year;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AccountProfileServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private com.demo.ai_study_hub.repository.SchoolRepository schoolRepository;
    @Mock
    private com.demo.ai_study_hub.repository.MajorRepository majorRepository;

    @InjectMocks
    private AccountProfileService accountProfileService;

    private User testUser;
    private UpdateProfileRequest updateRequest;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setUserId(1);
        testUser.setEmail("test@test.com");
        testUser.setFullName("Old Name");
        testUser.setRole("USER");
        testUser.setTier(UserTier.FREE);
        testUser.setStatus("ACTIVE");

        updateRequest = new UpdateProfileRequest();
        updateRequest.setFullName("New Name");
        updateRequest.setPhone("0123456789");
        updateRequest.setBio("Hello");
        updateRequest.setEducationLevel("UNIVERSITY");
    }

    @Test
    void getProfile_Success() {
        ProfileResponse response = accountProfileService.getProfile(testUser);
        assertNotNull(response);
        assertEquals(testUser.getEmail(), response.getEmail());
        assertEquals(testUser.getFullName(), response.getFullName());
    }

    @Test
    void updateProfile_Success() {
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));
        ProfileResponse response = accountProfileService.updateProfile(testUser, updateRequest);
        assertNotNull(response);
        assertEquals("New Name", response.getFullName());
        assertEquals("0123456789", response.getPhone());
        assertEquals("Hello", response.getBio());
        assertEquals("UNIVERSITY", response.getEducationLevel());
        verify(userRepository, times(1)).save(testUser);
    }

    @Test
    void updateProfile_ThrowsIfBlocked() {
        testUser.setStatus("BLOCKED");
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                accountProfileService.updateProfile(testUser, updateRequest));
        assertEquals("403 FORBIDDEN \"AUTH_ACCOUNT_BLOCKED\"", ex.getMessage());
    }

    @Test
    void updateProfile_ThrowsIfGraduationYearTooFar() {
        updateRequest.setGraduationYear(Year.now().getValue() + 11);
        assertThrows(ResponseStatusException.class, () ->
                accountProfileService.updateProfile(testUser, updateRequest));
     }

     @Test
     void updateProfile_ThrowsIfMajorDoesNotBelongToSchool() {
         com.demo.ai_study_hub.entity.School school = new com.demo.ai_study_hub.entity.School();
         school.setSchoolId(1);
         school.setStatus("ACTIVE");

         com.demo.ai_study_hub.entity.School otherSchool = new com.demo.ai_study_hub.entity.School();
         otherSchool.setSchoolId(3);
         otherSchool.setStatus("ACTIVE");

         com.demo.ai_study_hub.entity.Major major = new com.demo.ai_study_hub.entity.Major();
         major.setMajorId(2);
         major.setStatus("ACTIVE");
         major.setSchool(otherSchool); // Major belongs to school 3, user profile selects school 1

         updateRequest.setSchoolId(1);
         updateRequest.setMajorId(2);

         when(schoolRepository.findById(1)).thenReturn(Optional.of(school));
         when(majorRepository.findById(2)).thenReturn(Optional.of(major));

         ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                 accountProfileService.updateProfile(testUser, updateRequest));
         assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
     }
}
