package com.demo.ai_study_hub;

import com.demo.ai_study_hub.dto.*;
import com.demo.ai_study_hub.entity.StudyGroup;
import com.demo.ai_study_hub.entity.StudyGroupMember;
import com.demo.ai_study_hub.entity.User;
import com.demo.ai_study_hub.repository.*;
import com.demo.ai_study_hub.service.StudyGroupServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class StudyGroupServiceTest {

    @Mock
    private StudyGroupRepository studyGroupRepository;
    @Mock
    private StudyGroupMemberRepository studyGroupMemberRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private GroupDocumentShareRepository groupDocumentShareRepository;
    @Mock
    private GroupFolderShareRepository groupFolderShareRepository;

    @InjectMocks
    private StudyGroupServiceImpl studyGroupService;

    private User owner;
    private User member;
    private StudyGroup group;

    @BeforeEach
    void setUp() {
        owner = new User();
        owner.setUserId(1);
        owner.setEmail("owner@gmail.com");

        member = new User();
        member.setUserId(2);
        member.setEmail("member@gmail.com");

        group = new StudyGroup();
        group.setGroupId(1);
        group.setGroupName("Java Devs");
        group.setInviteCode("ABCD1234");
        group.setOwner(owner);
        group.setStatus("ACTIVE");
    }

    @Test
    void joinGroup_WhenAlreadyActiveMember_ShouldThrow400() {
        JoinGroupRequest request = new JoinGroupRequest();
        request.setInviteCode("ABCD1234");

        when(userRepository.findByEmail("member@gmail.com")).thenReturn(Optional.of(member));
        when(studyGroupRepository.findByInviteCode("ABCD1234")).thenReturn(Optional.of(group));
        when(studyGroupMemberRepository.existsByGroupAndUserAndStatus(group, member, "ACTIVE")).thenReturn(true);

        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> {
            studyGroupService.joinGroup(request, "member@gmail.com");
        });

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
        assertEquals("You are already a member of this group", exception.getReason());
    }

    @Test
    void leaveGroup_WhenOwnerTriesToLeave_ShouldThrow400() {
        StudyGroupMember ownerMembership = new StudyGroupMember();
        ownerMembership.setGroup(group);
        ownerMembership.setUser(owner);
        ownerMembership.setRole("OWNER");
        ownerMembership.setStatus("ACTIVE");

        when(userRepository.findByEmail("owner@gmail.com")).thenReturn(Optional.of(owner));
        when(studyGroupRepository.findById(1)).thenReturn(Optional.of(group));
        when(studyGroupMemberRepository.findByGroupAndUserAndStatus(group, owner, "ACTIVE"))
                .thenReturn(Optional.of(ownerMembership));

        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> {
            studyGroupService.leaveGroup(1, "owner@gmail.com");
        });

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
        assertEquals("Group owner cannot leave the group. Delete the group instead.", exception.getReason());
    }

    @Test
    void updateGroup_WhenMemberTriesToUpdate_ShouldThrow403() {
        StudyGroupMember memberMembership = new StudyGroupMember();
        memberMembership.setGroup(group);
        memberMembership.setUser(member);
        memberMembership.setRole("MEMBER");
        memberMembership.setStatus("ACTIVE");

        UpdateGroupRequest request = new UpdateGroupRequest();
        request.setGroupName("New Name");

        when(userRepository.findByEmail("member@gmail.com")).thenReturn(Optional.of(member));
        when(studyGroupRepository.findById(1)).thenReturn(Optional.of(group));
        when(studyGroupMemberRepository.findByGroupAndUserAndStatus(group, member, "ACTIVE"))
                .thenReturn(Optional.of(memberMembership));

        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> {
            studyGroupService.updateGroup(1, request, "member@gmail.com");
        });

        assertEquals(HttpStatus.FORBIDDEN, exception.getStatusCode());
        assertEquals("Only the group owner can perform this action", exception.getReason());
    }

    @Test
    void removeMember_WhenNotOwner_ShouldThrow403() {
        StudyGroupMember memberMembership = new StudyGroupMember();
        memberMembership.setGroup(group);
        memberMembership.setUser(member);
        memberMembership.setRole("MEMBER");
        memberMembership.setStatus("ACTIVE");

        when(userRepository.findByEmail("member@gmail.com")).thenReturn(Optional.of(member));
        when(studyGroupRepository.findById(1)).thenReturn(Optional.of(group));
        when(studyGroupMemberRepository.findByGroupAndUserAndStatus(group, member, "ACTIVE"))
                .thenReturn(Optional.of(memberMembership));

        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> {
            studyGroupService.removeMember(1, 3, "member@gmail.com");
        });

        assertEquals(HttpStatus.FORBIDDEN, exception.getStatusCode());
    }

    @Test
    void getGroupDetail_WhenGroupDeleted_ShouldThrow404() {
        group.setStatus("DELETED");

        when(userRepository.findByEmail("owner@gmail.com")).thenReturn(Optional.of(owner));
        when(studyGroupRepository.findById(1)).thenReturn(Optional.of(group));

        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> {
            studyGroupService.getGroupDetail(1, "owner@gmail.com");
        });

        assertEquals(HttpStatus.NOT_FOUND, exception.getStatusCode());
        assertEquals("Group not found", exception.getReason());
    }
}
