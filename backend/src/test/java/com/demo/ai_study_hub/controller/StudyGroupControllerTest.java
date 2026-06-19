package com.demo.ai_study_hub.controller;

import com.demo.ai_study_hub.dto.StudyGroupRequest;
import com.demo.ai_study_hub.dto.StudyGroupResponse;
import com.demo.ai_study_hub.dto.GroupMemberResponse;
import com.demo.ai_study_hub.service.StudyGroupService;
import com.demo.ai_study_hub.service.JwtUtil;
import com.demo.ai_study_hub.service.UserDetailsServiceImpl;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(StudyGroupController.class)
class StudyGroupControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private StudyGroupService studyGroupService;

    @MockBean
    private JwtUtil jwtUtil;

    @MockBean
    private UserDetailsServiceImpl userDetailsService;

    private StudyGroupResponse sampleGroupResponse;

    @BeforeEach
    void setUp() {
        sampleGroupResponse = StudyGroupResponse.builder()
                .groupId(1)
                .groupName("Java Study Group")
                .description("A group to study Java")
                .inviteCode("ABCD1234")
                .ownerId(10)
                .status("ACTIVE")
                .role("OWNER")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }

    @Test
    @WithMockUser(username = "user@gmail.com")
    void createGroup_Success() throws Exception {
        when(studyGroupService.createGroup(any(StudyGroupRequest.class), anyString()))
                .thenReturn(sampleGroupResponse);

        StudyGroupRequest request = new StudyGroupRequest("Java Study Group", "A group to study Java");

        mockMvc.perform(post("/api/groups")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Study group created successfully"))
                .andExpect(jsonPath("$.data.groupId").value(1))
                .andExpect(jsonPath("$.data.groupName").value("Java Study Group"))
                .andExpect(jsonPath("$.data.inviteCode").value("ABCD1234"));
    }

    @Test
    @WithMockUser(username = "user@gmail.com")
    void getMyGroups_Success() throws Exception {
        when(studyGroupService.getMyGroups(anyString()))
                .thenReturn(List.of(sampleGroupResponse));

        mockMvc.perform(get("/api/groups/my"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].groupId").value(1))
                .andExpect(jsonPath("$.data[0].role").value("OWNER"));
    }

    @Test
    @WithMockUser(username = "user@gmail.com")
    void getGroupDetail_Success() throws Exception {
        sampleGroupResponse.setMembers(List.of(
                GroupMemberResponse.builder()
                        .memberId(1)
                        .userId(10)
                        .email("user@gmail.com")
                        .fullName("Java User")
                        .role("OWNER")
                        .status("ACTIVE")
                        .joinedAt(LocalDateTime.now())
                        .build()
        ));

        when(studyGroupService.getGroupDetail(anyInt(), anyString()))
                .thenReturn(sampleGroupResponse);

        mockMvc.perform(get("/api/groups/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.groupId").value(1))
                .andExpect(jsonPath("$.data.members[0].userId").value(10));
    }

    @Test
    @WithMockUser(username = "user@gmail.com")
    void joinGroup_Success() throws Exception {
        StudyGroupResponse joinResponse = StudyGroupResponse.builder()
                .groupId(1)
                .groupName("Java Study Group")
                .role("MEMBER")
                .build();

        when(studyGroupService.joinGroup(anyString(), anyString()))
                .thenReturn(joinResponse);

        mockMvc.perform(post("/api/groups/join")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("inviteCode", "ABCD1234"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.role").value("MEMBER"));
    }

    @Test
    @WithMockUser(username = "user@gmail.com")
    void leaveGroup_Success() throws Exception {
        doNothing().when(studyGroupService).leaveGroup(anyInt(), anyString());

        mockMvc.perform(post("/api/groups/1/leave")
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Left group successfully"));
    }

    @Test
    @WithMockUser(username = "user@gmail.com")
    void updateGroup_Success() throws Exception {
        when(studyGroupService.updateGroup(anyInt(), any(StudyGroupRequest.class), anyString()))
                .thenReturn(sampleGroupResponse);

        StudyGroupRequest request = new StudyGroupRequest("Java Study Group", "A group to study Java");

        mockMvc.perform(put("/api/groups/1")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.groupId").value(1));
    }

    @Test
    @WithMockUser(username = "user@gmail.com")
    void deleteGroup_Success() throws Exception {
        doNothing().when(studyGroupService).deleteGroup(anyInt(), anyString());

        mockMvc.perform(delete("/api/groups/1")
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Group deleted successfully"));
    }

    @Test
    @WithMockUser(username = "user@gmail.com")
    void removeMember_Success() throws Exception {
        doNothing().when(studyGroupService).removeMember(anyInt(), anyInt(), anyString());

        mockMvc.perform(delete("/api/groups/1/members/2")
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Member removed successfully"));
    }
}
