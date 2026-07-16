package com.demo.ai_study_hub;

import com.demo.ai_study_hub.dto.*;
import com.demo.ai_study_hub.entity.*;
import com.demo.ai_study_hub.repository.*;
import com.demo.ai_study_hub.service.StudyGroupServiceImpl;
import com.demo.ai_study_hub.service.NotificationService;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import com.demo.ai_study_hub.service.TierPolicyService;
import com.demo.ai_study_hub.service.UsageService;
import com.demo.ai_study_hub.dto.TierLimits;
import static org.mockito.ArgumentMatchers.any;

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
    @Mock
    private TierPolicyService tierPolicyService;
    @Mock
    private UsageService usageService;
    @Mock
    private NotificationService notificationService;
    @Mock
    private GroupInvitationRepository groupInvitationRepository;

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

        TierLimits mockLimits = new TierLimits(
                100L * 1024 * 1024, 30, 10L * 1024 * 1024, 20, 3, 3, 10, 30, 3, 500, 5, 500, 3, 500,
                "gemini-2.5-flash-lite", 1, 1, 1, 5
        );
        lenient().when(tierPolicyService.getLimitsForUser(any())).thenReturn(mockLimits);
        lenient().when(usageService.countOwnedGroups(any())).thenReturn(0L);
    }

    @Test
    void joinGroup_WhenAlreadyActiveMember_ShouldThrow400() {
        JoinGroupRequest request = new JoinGroupRequest();
        request.setInviteCode("ABCD1234");

        when(userRepository.findByEmail("member@gmail.com")).thenReturn(Optional.of(member));
        when(studyGroupRepository.findByInviteCodeForUpdate("ABCD1234")).thenReturn(Optional.of(group));
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
    void removeMember_WhenOwnerRemovesMember_ShouldRevokeMemberGroupShares() {
        StudyGroupMember ownerMembership = new StudyGroupMember();
        ownerMembership.setGroup(group);
        ownerMembership.setUser(owner);
        ownerMembership.setRole("OWNER");
        ownerMembership.setStatus("ACTIVE");

        StudyGroupMember targetMembership = new StudyGroupMember();
        targetMembership.setGroup(group);
        targetMembership.setUser(member);
        targetMembership.setRole("MEMBER");
        targetMembership.setStatus("ACTIVE");

        GroupDocumentShare mockDocShare = new GroupDocumentShare();
        mockDocShare.setGroup(group);
        mockDocShare.setSharedBy(member);
        mockDocShare.setStatus("ACTIVE");

        GroupFolderShare mockFolderShare = new GroupFolderShare();
        mockFolderShare.setGroup(group);
        mockFolderShare.setSharedBy(member);
        mockFolderShare.setStatus("ACTIVE");

        when(userRepository.findByEmail("owner@gmail.com")).thenReturn(Optional.of(owner));
        when(studyGroupRepository.findById(1)).thenReturn(Optional.of(group));
        when(studyGroupMemberRepository.findByGroupAndUserAndStatus(group, owner, "ACTIVE"))
                .thenReturn(Optional.of(ownerMembership));
        when(userRepository.findById(2)).thenReturn(Optional.of(member));
        when(studyGroupMemberRepository.findByGroupAndUserAndStatus(group, member, "ACTIVE"))
                .thenReturn(Optional.of(targetMembership));

        when(groupDocumentShareRepository.findByGroupAndSharedByAndStatus(group, member, "ACTIVE"))
                .thenReturn(java.util.List.of(mockDocShare));
        when(groupFolderShareRepository.findByGroupAndSharedByAndStatus(group, member, "ACTIVE"))
                .thenReturn(java.util.List.of(mockFolderShare));

        studyGroupService.removeMember(1, 2, "owner@gmail.com");

        assertEquals("REMOVED", targetMembership.getStatus());
        assertEquals("REVOKED", mockDocShare.getStatus());
        assertEquals("REVOKED", mockFolderShare.getStatus());
        verify(groupDocumentShareRepository, times(1)).saveAll(anyList());
        verify(groupFolderShareRepository, times(1)).saveAll(anyList());
    }

    @Test
    void leaveGroup_WhenMemberLeaves_ShouldRevokeMemberGroupShares() {
        StudyGroupMember memberMembership = new StudyGroupMember();
        memberMembership.setGroup(group);
        memberMembership.setUser(member);
        memberMembership.setRole("MEMBER");
        memberMembership.setStatus("ACTIVE");

        GroupDocumentShare mockDocShare = new GroupDocumentShare();
        mockDocShare.setGroup(group);
        mockDocShare.setSharedBy(member);
        mockDocShare.setStatus("ACTIVE");

        GroupFolderShare mockFolderShare = new GroupFolderShare();
        mockFolderShare.setGroup(group);
        mockFolderShare.setSharedBy(member);
        mockFolderShare.setStatus("ACTIVE");

        when(userRepository.findByEmail("member@gmail.com")).thenReturn(Optional.of(member));
        when(studyGroupRepository.findById(1)).thenReturn(Optional.of(group));
        when(studyGroupMemberRepository.findByGroupAndUserAndStatus(group, member, "ACTIVE"))
                .thenReturn(Optional.of(memberMembership));

        when(groupDocumentShareRepository.findByGroupAndSharedByAndStatus(group, member, "ACTIVE"))
                .thenReturn(java.util.List.of(mockDocShare));
        when(groupFolderShareRepository.findByGroupAndSharedByAndStatus(group, member, "ACTIVE"))
                .thenReturn(java.util.List.of(mockFolderShare));

        studyGroupService.leaveGroup(1, "member@gmail.com");

        assertEquals("LEFT", memberMembership.getStatus());
        assertEquals("REVOKED", mockDocShare.getStatus());
        assertEquals("REVOKED", mockFolderShare.getStatus());
        verify(groupDocumentShareRepository, times(1)).saveAll(anyList());
        verify(groupFolderShareRepository, times(1)).saveAll(anyList());
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

    @Test
    void getMyGroups_ShouldPopulateCounts() {
        StudyGroupMember membership = new StudyGroupMember();
        membership.setGroup(group);
        membership.setUser(owner);
        membership.setRole("OWNER");
        membership.setStatus("ACTIVE");

        when(userRepository.findByEmail("owner@gmail.com")).thenReturn(Optional.of(owner));
        when(studyGroupMemberRepository.findByUserAndStatus(owner, "ACTIVE")).thenReturn(List.of(membership));

        List<Object[]> memberCountsMock = new java.util.ArrayList<>();
        memberCountsMock.add(new Object[]{1, 3L});
        List<Object[]> docCountsMock = new java.util.ArrayList<>();
        docCountsMock.add(new Object[]{1, 5L});
        List<Object[]> folderCountsMock = new java.util.ArrayList<>();
        folderCountsMock.add(new Object[]{1, 2L});

        when(studyGroupMemberRepository.countActiveMembersByGroupIds(List.of(1)))
                .thenReturn(memberCountsMock);
        when(groupDocumentShareRepository.countActiveSharesByGroupIds(List.of(1)))
                .thenReturn(docCountsMock);
        when(groupFolderShareRepository.countActiveSharesByGroupIds(List.of(1)))
                .thenReturn(folderCountsMock);

        List<GroupResponse> responses = studyGroupService.getMyGroups("owner@gmail.com");

        assertNotNull(responses);
        assertEquals(1, responses.size());
        assertEquals(3L, responses.get(0).getMemberCount());
        assertEquals(5L, responses.get(0).getDocumentCount());
        assertEquals(2L, responses.get(0).getFolderCount());
    }

    @Test
    void getGroupDetail_ShouldPopulateCounts() {
        StudyGroupMember membership = new StudyGroupMember();
        membership.setGroup(group);
        membership.setUser(owner);
        membership.setRole("OWNER");
        membership.setStatus("ACTIVE");

        when(userRepository.findByEmail("owner@gmail.com")).thenReturn(Optional.of(owner));
        when(studyGroupRepository.findById(1)).thenReturn(Optional.of(group));
        when(studyGroupMemberRepository.findByGroupAndUserAndStatus(group, owner, "ACTIVE"))
                .thenReturn(Optional.of(membership));

        when(studyGroupMemberRepository.findByGroupAndStatusIn(group, List.of("ACTIVE", "PENDING")))
                .thenReturn(List.of(membership));
        when(studyGroupMemberRepository.countByGroupAndStatus(group, "ACTIVE"))
                .thenReturn(1L);
        when(groupDocumentShareRepository.findActiveSharesForGroup(group))
                .thenReturn(java.util.Collections.emptyList());
        when(groupFolderShareRepository.findActiveSharesForGroup(group))
                .thenReturn(java.util.Collections.emptyList());

        GroupDetailResponse response = studyGroupService.getGroupDetail(1, "owner@gmail.com");

        assertNotNull(response);
        assertEquals(1L, response.getMemberCount());
        assertEquals(0L, response.getDocumentCount());
        assertEquals(0L, response.getFolderCount());
    }

    @Test
    void createGroup_ShouldSetCountsTo100() {
        CreateGroupRequest request = new CreateGroupRequest();
        request.setGroupName("Java Devs");
        request.setDescription("Java description");

        when(userRepository.findByEmail("owner@gmail.com")).thenReturn(Optional.of(owner));
        when(userRepository.findByIdForUpdate(1)).thenReturn(Optional.of(owner));
        when(studyGroupRepository.save(any(StudyGroup.class))).thenAnswer(invocation -> {
            StudyGroup saved = invocation.getArgument(0);
            saved.setGroupId(1);
            return saved;
        });

        GroupResponse response = studyGroupService.createGroup(request, "owner@gmail.com");

        assertNotNull(response);
        assertEquals(1L, response.getMemberCount());
        assertEquals(0L, response.getDocumentCount());
        assertEquals(0L, response.getFolderCount());
        assertEquals("OWNER", response.getRole());
        assertEquals("ACTIVE", response.getStatus());
        verify(studyGroupMemberRepository, times(1)).save(any(StudyGroupMember.class));
    }

    @Test
    void joinGroup_WhenValid_ShouldSetStatusToPendingAndNotifyOwner() {
        JoinGroupRequest request = new JoinGroupRequest();
        request.setInviteCode("ABCD1234");

        when(userRepository.findByEmail("member@gmail.com")).thenReturn(Optional.of(member));
        when(studyGroupRepository.findByInviteCodeForUpdate("ABCD1234")).thenReturn(Optional.of(group));
        when(studyGroupMemberRepository.existsByGroupAndUserAndStatus(group, member, "ACTIVE")).thenReturn(false);
        when(studyGroupMemberRepository.countByGroupAndStatus(group, "ACTIVE")).thenReturn(1L);

        GroupResponse response = studyGroupService.joinGroup(request, "member@gmail.com");

        assertNotNull(response);
        assertEquals("MEMBER", response.getRole());
        verify(studyGroupMemberRepository, times(1)).save(any(StudyGroupMember.class));
        verify(notificationService, times(1)).createNotification(
                eq(owner),
                eq("GROUP_JOIN_REQUEST"),
                eq("New join request"),
                contains("member@gmail.com requested to join"),
                eq("GROUP"),
                eq(1L),
                eq(2)
        );
    }

    @Test
    void approveJoinRequest_WhenPending_ShouldSetActiveAndNotifyUser() {
        StudyGroupMember pendingMembership = new StudyGroupMember();
        pendingMembership.setGroup(group);
        pendingMembership.setUser(member);
        pendingMembership.setStatus("PENDING");
        pendingMembership.setRole("MEMBER");

        StudyGroupMember ownerMembership = new StudyGroupMember();
        ownerMembership.setGroup(group);
        ownerMembership.setUser(owner);
        ownerMembership.setStatus("ACTIVE");
        ownerMembership.setRole("OWNER");

        when(userRepository.findByEmail("owner@gmail.com")).thenReturn(Optional.of(owner));
        when(studyGroupRepository.findById(1)).thenReturn(Optional.of(group));
        when(studyGroupMemberRepository.findByGroupAndUserAndStatus(group, owner, "ACTIVE"))
                .thenReturn(Optional.of(ownerMembership));
        when(userRepository.findById(2)).thenReturn(Optional.of(member));
        when(studyGroupMemberRepository.findByGroupAndUser(group, member)).thenReturn(Optional.of(pendingMembership));
        when(studyGroupMemberRepository.countByGroupAndStatus(group, "ACTIVE")).thenReturn(1L);

        studyGroupService.approveJoinRequest(1, 2, "owner@gmail.com");

        assertEquals("ACTIVE", pendingMembership.getStatus());
        verify(studyGroupMemberRepository, times(1)).save(pendingMembership);
        verify(notificationService, times(1)).createNotification(
                eq(member),
                eq("GROUP_JOIN_APPROVED"),
                eq("Join request approved"),
                contains("was approved"),
                eq("GROUP"),
                eq(1L)
        );
    }

    @Test
    void rejectJoinRequest_WhenPending_ShouldSetRejectedAndNotifyUser() {
        StudyGroupMember pendingMembership = new StudyGroupMember();
        pendingMembership.setGroup(group);
        pendingMembership.setUser(member);
        pendingMembership.setStatus("PENDING");
        pendingMembership.setRole("MEMBER");

        StudyGroupMember ownerMembership = new StudyGroupMember();
        ownerMembership.setGroup(group);
        ownerMembership.setUser(owner);
        ownerMembership.setStatus("ACTIVE");
        ownerMembership.setRole("OWNER");

        when(userRepository.findByEmail("owner@gmail.com")).thenReturn(Optional.of(owner));
        when(studyGroupRepository.findById(1)).thenReturn(Optional.of(group));
        when(studyGroupMemberRepository.findByGroupAndUserAndStatus(group, owner, "ACTIVE"))
                .thenReturn(Optional.of(ownerMembership));
        when(userRepository.findById(2)).thenReturn(Optional.of(member));
        when(studyGroupMemberRepository.findByGroupAndUser(group, member)).thenReturn(Optional.of(pendingMembership));

        studyGroupService.rejectJoinRequest(1, 2, "owner@gmail.com");

        assertEquals("REJECTED", pendingMembership.getStatus());
        verify(studyGroupMemberRepository, times(1)).save(pendingMembership);
        verify(notificationService, times(1)).createNotification(
                eq(member),
                eq("GROUP_JOIN_REJECTED"),
                eq("Join request rejected"),
                contains("was rejected"),
                eq("GROUP"),
                eq(1L)
        );
    }

    @Test
    void joinGroup_WhenPreInvitedViaEmail_ShouldJoinDirectlyAsActiveAndCleanUpInvitation() {
        JoinGroupRequest request = new JoinGroupRequest();
        request.setInviteCode("ABCD1234");

        when(userRepository.findByEmail("member@gmail.com")).thenReturn(Optional.of(member));
        when(studyGroupRepository.findByInviteCodeForUpdate("ABCD1234")).thenReturn(Optional.of(group));
        when(studyGroupMemberRepository.existsByGroupAndUserAndStatus(group, member, "ACTIVE")).thenReturn(false);
        when(studyGroupMemberRepository.countByGroupAndStatus(group, "ACTIVE")).thenReturn(1L);
        when(studyGroupMemberRepository.findByGroupAndUser(group, member)).thenReturn(Optional.empty());
        when(groupInvitationRepository.existsByGroupAndEmail(group, "member@gmail.com")).thenReturn(true);

        GroupResponse response = studyGroupService.joinGroup(request, "member@gmail.com");

        assertNotNull(response);
        assertEquals("MEMBER", response.getRole());
        assertEquals("ACTIVE", response.getMembershipStatus());
        verify(studyGroupMemberRepository, times(1)).save(any(StudyGroupMember.class));
        verify(groupInvitationRepository, times(1)).deleteByGroupAndEmail(group, "member@gmail.com");
        verify(notificationService, never()).createNotification(any(), any(), any(), any(), any(), any(), any());
    }
}
