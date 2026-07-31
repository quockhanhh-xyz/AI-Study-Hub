package com.demo.ai_study_hub.controller;

import com.demo.ai_study_hub.dto.PublicProfileResponse;
import com.demo.ai_study_hub.dto.ProfilePrivacyRequest;
import com.demo.ai_study_hub.service.UserFollowService;
import com.demo.ai_study_hub.service.PublicProfileService;
import com.demo.ai_study_hub.service.JwtUtil;
import com.demo.ai_study_hub.service.UserDetailsServiceImpl;
import com.demo.ai_study_hub.repository.UserRepository;
import com.demo.ai_study_hub.repository.DocumentRepository;
import com.demo.ai_study_hub.repository.DocumentRatingRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import com.demo.ai_study_hub.config.SecurityConfig;
import com.demo.ai_study_hub.config.CorsConfig;
import com.demo.ai_study_hub.config.JwtAuthenticationEntryPoint;
import com.demo.ai_study_hub.config.CustomAccessDeniedHandler;
import org.springframework.context.annotation.Import;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(UserController.class)
@Import({SecurityConfig.class, CorsConfig.class, JwtAuthenticationEntryPoint.class, CustomAccessDeniedHandler.class})
class UserFollowControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private UserFollowService userFollowService;

    @MockBean
    private PublicProfileService publicProfileService;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private DocumentRepository documentRepository;

    @MockBean
    private DocumentRatingRepository documentRatingRepository;

    @MockBean
    private JwtUtil jwtUtil;

    @MockBean
    private UserDetailsServiceImpl userDetailsService;

    @Test
    @WithMockUser(username = "requester@example.com")
    void testFollowUserSuccess() throws Exception {
        PublicProfileResponse profileResponse = PublicProfileResponse.builder()
                .userId(2)
                .fullName("John Doe")
                .followedByMe(true)
                .followersCount(15L)
                .followingCount(10L)
                .build();

        doNothing().when(userFollowService).followUser(2, "requester@example.com");
        when(publicProfileService.getPublicProfile(2, "requester@example.com")).thenReturn(profileResponse);

        mockMvc.perform(post("/api/users/2/follow")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.userId").value(2))
                .andExpect(jsonPath("$.data.followedByMe").value(true))
                .andExpect(jsonPath("$.data.followersCount").value(15));

        verify(userFollowService, times(1)).followUser(2, "requester@example.com");
    }

    @Test
    @WithMockUser(username = "requester@example.com")
    void testUnfollowUserSuccess() throws Exception {
        PublicProfileResponse profileResponse = PublicProfileResponse.builder()
                .userId(2)
                .fullName("John Doe")
                .followedByMe(false)
                .followersCount(14L)
                .followingCount(10L)
                .build();

        doNothing().when(userFollowService).unfollowUser(2, "requester@example.com");
        when(publicProfileService.getPublicProfile(2, "requester@example.com")).thenReturn(profileResponse);

        mockMvc.perform(delete("/api/users/2/follow")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.userId").value(2))
                .andExpect(jsonPath("$.data.followedByMe").value(false))
                .andExpect(jsonPath("$.data.followersCount").value(14));

        verify(userFollowService, times(1)).unfollowUser(2, "requester@example.com");
    }

    @Test
    void testGetPublicProfileSuccess() throws Exception {
        PublicProfileResponse response = PublicProfileResponse.builder()
                .userId(2)
                .fullName("John Doe")
                .build();

        when(publicProfileService.getPublicProfile(2, null)).thenReturn(response);

        mockMvc.perform(get("/api/users/2/public-profile")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.userId").value(2))
                .andExpect(jsonPath("$.data.fullName").value("John Doe"));

        verify(publicProfileService, times(1)).getPublicProfile(2, null);
    }

    @Test
    @WithMockUser(username = "user@example.com")
    void testUpdateProfilePrivacySuccess() throws Exception {
        doNothing().when(publicProfileService).updateProfilePrivacy(any(ProfilePrivacyRequest.class), eq("user@example.com"));

        mockMvc.perform(put("/api/users/me/profile-privacy")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"profilePublic\":true,\"showSchool\":false,\"showMajor\":true,\"showBio\":false,\"showPublicDocuments\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Profile privacy updated successfully"));

        verify(publicProfileService, times(1)).updateProfilePrivacy(any(ProfilePrivacyRequest.class), eq("user@example.com"));
    }
}
