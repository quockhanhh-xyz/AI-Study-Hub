package com.demo.ai_study_hub;

import com.demo.ai_study_hub.config.FrontendProperties;
import com.demo.ai_study_hub.dto.*;
import com.demo.ai_study_hub.entity.*;
import com.demo.ai_study_hub.exception.QuotaExceededException;
import com.demo.ai_study_hub.repository.*;
import com.demo.ai_study_hub.service.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GroupEmailInviteTest {

    @Mock private StudyGroupRepository studyGroupRepository;
    @Mock private StudyGroupMemberRepository studyGroupMemberRepository;
    @Mock private UserRepository userRepository;
    @Mock private GroupDocumentShareRepository groupDocumentShareRepository;
    @Mock private GroupFolderShareRepository groupFolderShareRepository;
    @Mock private TierPolicyService tierPolicyService;
    @Mock private UsageService usageService;
    @Mock private EmailService emailService;
    @Mock private FrontendProperties frontendProperties;

    @InjectMocks
    private StudyGroupServiceImpl studyGroupService;

    private User owner;
    private User member;
    private User outsider;
    private StudyGroup group;
    private StudyGroupMember ownerMembership;
    private StudyGroupMember memberMembership;

    @BeforeEach
    void setUp() {
        owner = new User();
        owner.setUserId(1);
        owner.setEmail("owner@test.com");

        member = new User();
        member.setUserId(2);
        member.setEmail("member@test.com");

        outsider = new User();
        outsider.setUserId(3);
        outsider.setEmail("outsider@test.com");

        group = new StudyGroup();
        group.setGroupId(10);
        group.setGroupName("Study Group A");
        group.setInviteCode("CODE1234");
        group.setOwner(owner);
        group.setStatus("ACTIVE");

        ownerMembership = new StudyGroupMember();
        ownerMembership.setUser(owner);
        ownerMembership.setGroup(group);
        ownerMembership.setRole("OWNER");
        ownerMembership.setStatus("ACTIVE");

        memberMembership = new StudyGroupMember();
        memberMembership.setUser(member);
        memberMembership.setGroup(group);
        memberMembership.setRole("MEMBER");
        memberMembership.setStatus("ACTIVE");

        lenient().when(frontendProperties.getBaseUrl()).thenReturn("http://localhost:5500");
    }

    @Test
    void sendEmailInvite_OwnerInvitesNonMember_ShouldSucceed() {
        GroupEmailInviteRequest request = new GroupEmailInviteRequest();
        request.setEmail("newuser@test.com");

        when(userRepository.findByEmail("owner@test.com")).thenReturn(Optional.of(owner));
        when(studyGroupRepository.findById(10)).thenReturn(Optional.of(group));
        when(studyGroupMemberRepository.findByGroupAndUserAndStatus(group, owner, "ACTIVE"))
                .thenReturn(Optional.of(ownerMembership));
        when(userRepository.findByEmail("newuser@test.com")).thenReturn(Optional.empty());
        doNothing().when(emailService).sendGroupInviteEmail(any(), any(), any());

        GroupEmailInviteResponse response = studyGroupService.sendEmailInvite(10, request, "owner@test.com");

        assertNotNull(response);
        assertEquals(10, response.getGroupId());
        assertEquals("newuser@test.com", response.getEmail());
        assertEquals("CODE1234", response.getInviteCode());
        assertTrue(response.getJoinUrl().contains("CODE1234"));
        assertTrue(response.getJoinUrl().startsWith("http://localhost:5500"));
        verify(emailService).sendGroupInviteEmail("newuser@test.com", "Study Group A", response.getJoinUrl());
    }

    @Test
    void sendEmailInvite_NonOwnerMember_ShouldThrowForbidden() {
        GroupEmailInviteRequest request = new GroupEmailInviteRequest();
        request.setEmail("newuser@test.com");

        when(userRepository.findByEmail("member@test.com")).thenReturn(Optional.of(member));
        when(studyGroupRepository.findById(10)).thenReturn(Optional.of(group));
        when(studyGroupMemberRepository.findByGroupAndUserAndStatus(group, member, "ACTIVE"))
                .thenReturn(Optional.of(memberMembership));

        QuotaExceededException ex = assertThrows(QuotaExceededException.class, () ->
                studyGroupService.sendEmailInvite(10, request, "member@test.com"));

        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
        assertEquals("GROUP_INVITE_FORBIDDEN", ex.getCode());
        verify(emailService, never()).sendGroupInviteEmail(any(), any(), any());
    }

    @Test
    void sendEmailInvite_NotAMember_ShouldThrowForbidden() {
        GroupEmailInviteRequest request = new GroupEmailInviteRequest();
        request.setEmail("newuser@test.com");

        when(userRepository.findByEmail("outsider@test.com")).thenReturn(Optional.of(outsider));
        when(studyGroupRepository.findById(10)).thenReturn(Optional.of(group));
        when(studyGroupMemberRepository.findByGroupAndUserAndStatus(group, outsider, "ACTIVE"))
                .thenReturn(Optional.empty());

        QuotaExceededException ex = assertThrows(QuotaExceededException.class, () ->
                studyGroupService.sendEmailInvite(10, request, "outsider@test.com"));

        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
        assertEquals("GROUP_INVITE_FORBIDDEN", ex.getCode());
    }

    @Test
    void sendEmailInvite_InviteeAlreadyActiveMember_ShouldThrow400() {
        GroupEmailInviteRequest request = new GroupEmailInviteRequest();
        request.setEmail("member@test.com");

        when(userRepository.findByEmail("owner@test.com")).thenReturn(Optional.of(owner));
        when(studyGroupRepository.findById(10)).thenReturn(Optional.of(group));
        when(studyGroupMemberRepository.findByGroupAndUserAndStatus(group, owner, "ACTIVE"))
                .thenReturn(Optional.of(ownerMembership));
        when(userRepository.findByEmail("member@test.com")).thenReturn(Optional.of(member));
        when(studyGroupMemberRepository.existsByGroupAndUserAndStatus(group, member, "ACTIVE"))
                .thenReturn(true);

        QuotaExceededException ex = assertThrows(QuotaExceededException.class, () ->
                studyGroupService.sendEmailInvite(10, request, "owner@test.com"));

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        assertEquals("GROUP_MEMBER_ALREADY_EXISTS", ex.getCode());
        verify(emailService, never()).sendGroupInviteEmail(any(), any(), any());
    }

    @Test
    void sendEmailInvite_GroupNotFound_ShouldThrow404() {
        GroupEmailInviteRequest request = new GroupEmailInviteRequest();
        request.setEmail("newuser@test.com");

        when(userRepository.findByEmail("owner@test.com")).thenReturn(Optional.of(owner));
        when(studyGroupRepository.findById(99)).thenReturn(Optional.empty());

        assertThrows(Exception.class, () ->
                studyGroupService.sendEmailInvite(99, request, "owner@test.com"));
    }

    @Test
    void sendEmailInvite_JoinUrlContainsInviteCode() {
        GroupEmailInviteRequest request = new GroupEmailInviteRequest();
        request.setEmail("newuser@test.com");

        when(userRepository.findByEmail("owner@test.com")).thenReturn(Optional.of(owner));
        when(studyGroupRepository.findById(10)).thenReturn(Optional.of(group));
        when(studyGroupMemberRepository.findByGroupAndUserAndStatus(group, owner, "ACTIVE"))
                .thenReturn(Optional.of(ownerMembership));
        when(userRepository.findByEmail("newuser@test.com")).thenReturn(Optional.empty());
        doNothing().when(emailService).sendGroupInviteEmail(any(), any(), any());

        GroupEmailInviteResponse response = studyGroupService.sendEmailInvite(10, request, "owner@test.com");

        assertEquals("http://localhost:5500/frontend/groups.html?inviteCode=CODE1234", response.getJoinUrl());
    }
}
