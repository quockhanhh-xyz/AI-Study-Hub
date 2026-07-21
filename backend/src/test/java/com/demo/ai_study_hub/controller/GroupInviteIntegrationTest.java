package com.demo.ai_study_hub.controller;

import com.demo.ai_study_hub.dto.GroupEmailInviteRequest;
import com.demo.ai_study_hub.entity.StudyGroup;
import com.demo.ai_study_hub.entity.User;
import com.demo.ai_study_hub.repository.StudyGroupRepository;
import com.demo.ai_study_hub.repository.StudyGroupMemberRepository;
import com.demo.ai_study_hub.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.hamcrest.Matchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
public class GroupInviteIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private StudyGroupRepository studyGroupRepository;
    
    @Autowired
    private StudyGroupMemberRepository memberRepository;

    @org.springframework.boot.test.mock.mockito.MockBean
    private com.demo.ai_study_hub.service.EmailService emailService;

    private User owner;
    private User invitee;
    private StudyGroup group;

    @BeforeEach
    void setUp() {
        owner = new User();
        owner.setEmail("owner@test.com");
        owner.setFullName("Test Owner");
        owner.setPasswordHash("pass");
        owner.setStatus("ACTIVE");
        owner = userRepository.save(owner);

        invitee = new User();
        invitee.setEmail("invitee@test.com");
        invitee.setFullName("Test Invitee");
        invitee.setPasswordHash("pass");
        invitee.setStatus("ACTIVE");
        invitee = userRepository.save(invitee);

        group = new StudyGroup();
        group.setGroupName("Test Group");
        group.setRequiresApproval(false);
        group.setInviteCode("TESTCODE");
        group.setOwner(owner);
        group = studyGroupRepository.save(group);
        
        com.demo.ai_study_hub.entity.StudyGroupMember ownerMember = new com.demo.ai_study_hub.entity.StudyGroupMember();
        ownerMember.setGroup(group);
        ownerMember.setUser(owner);
        ownerMember.setRole("OWNER");
        ownerMember.setStatus("ACTIVE");
        memberRepository.save(ownerMember);
    }

    @Test
    @WithMockUser(username = "owner@test.com")
    void testInviteUserSuccessfully() throws Exception {
        GroupEmailInviteRequest request = new GroupEmailInviteRequest();
        request.setEmail("invitee@test.com");

        mockMvc.perform(post("/api/groups/{id}/invites/email", group.getGroupId())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.message", is("Invitation email sent successfully")));
    }

    @Test
    @WithMockUser(username = "owner@test.com")
    void testInviteUserAlreadyMember() throws Exception {
        com.demo.ai_study_hub.entity.StudyGroupMember member = new com.demo.ai_study_hub.entity.StudyGroupMember();
        member.setGroup(group);
        member.setUser(invitee);
        member.setRole("MEMBER");
        member.setStatus("ACTIVE");
        memberRepository.save(member);

        GroupEmailInviteRequest request = new GroupEmailInviteRequest();
        request.setEmail("invitee@test.com");

        mockMvc.perform(post("/api/groups/{id}/invites/email", group.getGroupId())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.message", is("This user is already an active member of the group")));
    }

    @Test
    @WithMockUser(username = "owner@test.com")
    void testInviteUserNotFound() throws Exception {
        GroupEmailInviteRequest request = new GroupEmailInviteRequest();
        request.setEmail("nonexistent@test.com");

        mockMvc.perform(post("/api/groups/{id}/invites/email", group.getGroupId())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.message", is("Invitation email sent successfully")));
    }

    @Test
    @WithMockUser(username = "owner@test.com")
    void testListPendingInvites() throws Exception {
        // Invite first
        GroupEmailInviteRequest request = new GroupEmailInviteRequest();
        request.setEmail("invitee@test.com");
        mockMvc.perform(post("/api/groups/{id}/invites/email", group.getGroupId())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)));

        // List invites
        mockMvc.perform(get("/api/group-invites/groups/{id}/invites", group.getGroupId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].email", is("invitee@test.com")))
                .andExpect(jsonPath("$.data[0].status", is("PENDING")));
    }
}
