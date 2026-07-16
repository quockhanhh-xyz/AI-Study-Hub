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
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GroupApprovalTest {

    @Mock private StudyGroupRepository studyGroupRepository;
    @Mock private StudyGroupMemberRepository studyGroupMemberRepository;
    @Mock private UserRepository userRepository;
    @Mock private GroupDocumentShareRepository groupDocumentShareRepository;
    @Mock private GroupFolderShareRepository groupFolderShareRepository;
    @Mock private TierPolicyService tierPolicyService;
    @Mock private UsageService usageService;
    @Mock private EmailService emailService;
    @Mock private FrontendProperties frontendProperties;
    @Mock private NotificationService notificationService;
    @Mock private GroupInvitationRepository groupInvitationRepository;

    @InjectMocks
    private StudyGroupServiceImpl studyGroupService;

    private User owner;
    private User newUser;
    private StudyGroup groupWithApproval;
    private StudyGroup groupWithoutApproval;
    private StudyGroupMember ownerMembership;
    private TierLimits limits;

    @BeforeEach
    void setUp() {
        owner = new User();
        owner.setUserId(1);
        owner.setEmail("owner@test.com");

        newUser = new User();
        newUser.setUserId(2);
        newUser.setEmail("newuser@test.com");

        groupWithApproval = new StudyGroup();
        groupWithApproval.setGroupId(10);
        groupWithApproval.setGroupName("Approval Group");
        groupWithApproval.setInviteCode("APPROVE1");
        groupWithApproval.setOwner(owner);
        groupWithApproval.setStatus("ACTIVE");
        groupWithApproval.setRequiresApproval(true);

        groupWithoutApproval = new StudyGroup();
        groupWithoutApproval.setGroupId(20);
        groupWithoutApproval.setGroupName("Open Group");
        groupWithoutApproval.setInviteCode("OPEN1234");
        groupWithoutApproval.setOwner(owner);
        groupWithoutApproval.setStatus("ACTIVE");
        groupWithoutApproval.setRequiresApproval(false);

        ownerMembership = new StudyGroupMember();
        ownerMembership.setMemberId(1);
        ownerMembership.setGroup(groupWithApproval);
        ownerMembership.setUser(owner);
        ownerMembership.setRole("OWNER");
        ownerMembership.setStatus("ACTIVE");

        limits = new TierLimits(
                100L * 1024 * 1024, 30, 10L * 1024 * 1024, 20, 3, 3, 10, 30, 3, 500, 5, 500, 3, 500,
                "gemini-2.5-flash-lite", 1, 1, 1, 5
        );
        lenient().when(tierPolicyService.getLimitsForUser(any())).thenReturn(limits);
        lenient().when(groupInvitationRepository.existsByGroupAndEmail(any(), anyString())).thenReturn(false);
    }

    // ─── joinGroup ────────────────────────────────────────────────────────────

    @Test
    void joinGroup_WhenApprovalRequired_ShouldCreatePendingMembership() {
        JoinGroupRequest request = new JoinGroupRequest();
        request.setInviteCode("APPROVE1");

        when(userRepository.findByEmail("newuser@test.com")).thenReturn(Optional.of(newUser));
        when(studyGroupRepository.findByInviteCodeForUpdate("APPROVE1")).thenReturn(Optional.of(groupWithApproval));
        lenient().when(studyGroupMemberRepository.existsByGroupAndUserAndStatus(groupWithApproval, newUser, "ACTIVE")).thenReturn(false);
        lenient().when(studyGroupMemberRepository.existsByGroupAndUserAndStatus(groupWithApproval, newUser, "PENDING")).thenReturn(false);
        lenient().when(studyGroupMemberRepository.countByGroupAndStatus(groupWithApproval, "ACTIVE")).thenReturn(2L);
        when(studyGroupMemberRepository.findByGroupAndUser(groupWithApproval, newUser)).thenReturn(Optional.empty());
        when(studyGroupMemberRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        GroupResponse response = studyGroupService.joinGroup(request, "newuser@test.com");

        assertNotNull(response);
        assertEquals("PENDING", response.getMembershipStatus());
        verify(studyGroupMemberRepository).save(argThat(m ->
                "PENDING".equals(m.getStatus()) && "MEMBER".equals(m.getRole())
        ));
    }

    @Test
    void joinGroup_WhenNoApproval_ShouldCreateActiveMembership() {
        JoinGroupRequest request = new JoinGroupRequest();
        request.setInviteCode("OPEN1234");

        when(userRepository.findByEmail("newuser@test.com")).thenReturn(Optional.of(newUser));
        when(studyGroupRepository.findByInviteCodeForUpdate("OPEN1234")).thenReturn(Optional.of(groupWithoutApproval));
        lenient().when(studyGroupMemberRepository.existsByGroupAndUserAndStatus(groupWithoutApproval, newUser, "ACTIVE")).thenReturn(false);
        lenient().when(studyGroupMemberRepository.existsByGroupAndUserAndStatus(groupWithoutApproval, newUser, "PENDING")).thenReturn(false);
        lenient().when(studyGroupMemberRepository.countByGroupAndStatus(groupWithoutApproval, "ACTIVE")).thenReturn(2L);
        when(studyGroupMemberRepository.findByGroupAndUser(groupWithoutApproval, newUser)).thenReturn(Optional.empty());
        when(studyGroupMemberRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        GroupResponse response = studyGroupService.joinGroup(request, "newuser@test.com");

        assertNotNull(response);
        assertEquals("ACTIVE", response.getMembershipStatus());
        verify(studyGroupMemberRepository).save(argThat(m ->
                "ACTIVE".equals(m.getStatus()) && "MEMBER".equals(m.getRole())
        ));
    }

    @Test
    void joinGroup_WhenInvited_ShouldSetStatusToActive_AndBypassApproval() {
        JoinGroupRequest request = new JoinGroupRequest();
        request.setInviteCode("APPROVE1"); // group requires approval

        when(userRepository.findByEmail("newuser@test.com")).thenReturn(Optional.of(newUser));
        when(studyGroupRepository.findByInviteCodeForUpdate("APPROVE1")).thenReturn(Optional.of(groupWithApproval));
        lenient().when(studyGroupMemberRepository.existsByGroupAndUserAndStatus(groupWithApproval, newUser, "ACTIVE")).thenReturn(false);
        lenient().when(studyGroupMemberRepository.existsByGroupAndUserAndStatus(groupWithApproval, newUser, "PENDING")).thenReturn(false);
        lenient().when(studyGroupMemberRepository.countByGroupAndStatus(groupWithApproval, "ACTIVE")).thenReturn(2L);
        when(studyGroupMemberRepository.findByGroupAndUser(groupWithApproval, newUser)).thenReturn(Optional.empty());
        when(studyGroupMemberRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        // MOCK isInvited = true
        when(groupInvitationRepository.existsByGroupAndEmail(groupWithApproval, "newuser@test.com")).thenReturn(true);

        GroupResponse response = studyGroupService.joinGroup(request, "newuser@test.com");

        assertNotNull(response);
        assertEquals("ACTIVE", response.getMembershipStatus());
        verify(studyGroupMemberRepository).save(argThat(m ->
                "ACTIVE".equals(m.getStatus()) && "MEMBER".equals(m.getRole())
        ));
        // Verify invitation deleted
        verify(groupInvitationRepository).deleteByGroupAndEmail(groupWithApproval, "newuser@test.com");
    }

    @Test
    void joinGroup_WhenAlreadyPending_ShouldThrow400() {
        JoinGroupRequest request = new JoinGroupRequest();
        request.setInviteCode("APPROVE1");

        when(userRepository.findByEmail("newuser@test.com")).thenReturn(Optional.of(newUser));
        when(studyGroupRepository.findByInviteCodeForUpdate("APPROVE1")).thenReturn(Optional.of(groupWithApproval));
        lenient().when(studyGroupMemberRepository.existsByGroupAndUserAndStatus(groupWithApproval, newUser, "ACTIVE")).thenReturn(false);
        when(studyGroupMemberRepository.existsByGroupAndUserAndStatus(groupWithApproval, newUser, "PENDING")).thenReturn(true);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                studyGroupService.joinGroup(request, "newuser@test.com"));

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        assertTrue(ex.getReason().toLowerCase().contains("pending"));
        verify(studyGroupMemberRepository, never()).save(any());
    }

    @Test
    void joinGroup_WhenApprovalAndExistingRejectedRecord_ShouldUpdateToPending() {
        JoinGroupRequest request = new JoinGroupRequest();
        request.setInviteCode("APPROVE1");

        StudyGroupMember previousMembership = new StudyGroupMember();
        previousMembership.setGroup(groupWithApproval);
        previousMembership.setUser(newUser);
        previousMembership.setRole("MEMBER");
        previousMembership.setStatus("REJECTED");

        when(userRepository.findByEmail("newuser@test.com")).thenReturn(Optional.of(newUser));
        when(studyGroupRepository.findByInviteCodeForUpdate("APPROVE1")).thenReturn(Optional.of(groupWithApproval));
        lenient().when(studyGroupMemberRepository.existsByGroupAndUserAndStatus(groupWithApproval, newUser, "ACTIVE")).thenReturn(false);
        lenient().when(studyGroupMemberRepository.existsByGroupAndUserAndStatus(groupWithApproval, newUser, "PENDING")).thenReturn(false);
        lenient().when(studyGroupMemberRepository.countByGroupAndStatus(groupWithApproval, "ACTIVE")).thenReturn(1L);
        when(studyGroupMemberRepository.findByGroupAndUser(groupWithApproval, newUser)).thenReturn(Optional.of(previousMembership));
        when(studyGroupMemberRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        studyGroupService.joinGroup(request, "newuser@test.com");

        assertEquals("PENDING", previousMembership.getStatus());
    }

    // ─── listPendingMembers ───────────────────────────────────────────────────

    @Test
    void listPendingMembers_OwnerCanList_ReturnsBothMemberIdAndUserId() {
        StudyGroupMember pending1 = new StudyGroupMember();
        pending1.setMemberId(100);
        pending1.setUser(newUser);
        pending1.setGroup(groupWithApproval);
        pending1.setRole("MEMBER");
        pending1.setStatus("PENDING");

        when(userRepository.findByEmail("owner@test.com")).thenReturn(Optional.of(owner));
        when(studyGroupRepository.findById(10)).thenReturn(Optional.of(groupWithApproval));
        when(studyGroupMemberRepository.findByGroupAndUserAndStatus(groupWithApproval, owner, "ACTIVE"))
                .thenReturn(Optional.of(ownerMembership));
        when(studyGroupMemberRepository.findByGroupAndStatus(groupWithApproval, "PENDING"))
                .thenReturn(List.of(pending1));

        List<PendingMemberResponse> result = studyGroupService.listPendingMembers(10, "owner@test.com");

        assertEquals(1, result.size());
        // memberId for internal reference, userId for approve/reject endpoint
        assertEquals(100, result.get(0).getMemberId());
        assertEquals(2, result.get(0).getUserId());
    }

    @Test
    void listPendingMembers_NonOwner_ShouldThrow403() {
        User regularUser = new User();
        regularUser.setUserId(3);
        regularUser.setEmail("regular@test.com");

        StudyGroupMember regularMembership = new StudyGroupMember();
        regularMembership.setGroup(groupWithApproval);
        regularMembership.setUser(regularUser);
        regularMembership.setRole("MEMBER");
        regularMembership.setStatus("ACTIVE");

        when(userRepository.findByEmail("regular@test.com")).thenReturn(Optional.of(regularUser));
        when(studyGroupRepository.findById(10)).thenReturn(Optional.of(groupWithApproval));
        when(studyGroupMemberRepository.findByGroupAndUserAndStatus(groupWithApproval, regularUser, "ACTIVE"))
                .thenReturn(Optional.of(regularMembership));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                studyGroupService.listPendingMembers(10, "regular@test.com"));

        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
    }

    @Test
    void listPendingMembers_WhenNoPending_ShouldReturnEmptyList() {
        when(userRepository.findByEmail("owner@test.com")).thenReturn(Optional.of(owner));
        when(studyGroupRepository.findById(10)).thenReturn(Optional.of(groupWithApproval));
        when(studyGroupMemberRepository.findByGroupAndUserAndStatus(groupWithApproval, owner, "ACTIVE"))
                .thenReturn(Optional.of(ownerMembership));
        when(studyGroupMemberRepository.findByGroupAndStatus(groupWithApproval, "PENDING"))
                .thenReturn(List.of());

        List<PendingMemberResponse> result = studyGroupService.listPendingMembers(10, "owner@test.com");

        assertNotNull(result);
        assertTrue(result.isEmpty());
    }

    // ─── approveMember (by userId) ────────────────────────────────────────────

    @Test
    void approveMember_OwnerApprovesByUserId_ShouldSetActive() {
        StudyGroupMember pendingMembership = new StudyGroupMember();
        pendingMembership.setMemberId(99);
        pendingMembership.setGroup(groupWithApproval);
        pendingMembership.setUser(newUser);
        pendingMembership.setRole("MEMBER");
        pendingMembership.setStatus("PENDING");

        when(userRepository.findByEmail("owner@test.com")).thenReturn(Optional.of(owner));
        when(studyGroupRepository.findById(10)).thenReturn(Optional.of(groupWithApproval));
        when(studyGroupMemberRepository.findByGroupAndUserAndStatus(groupWithApproval, owner, "ACTIVE"))
                .thenReturn(Optional.of(ownerMembership));
        when(userRepository.findById(2)).thenReturn(Optional.of(newUser));
        when(studyGroupMemberRepository.findByGroupAndUser(groupWithApproval, newUser))
                .thenReturn(Optional.of(pendingMembership));
        when(studyGroupMemberRepository.countByGroupAndStatus(groupWithApproval, "ACTIVE")).thenReturn(5L);

        studyGroupService.approveJoinRequest(10, 2, "owner@test.com");

        assertEquals("ACTIVE", pendingMembership.getStatus());
        verify(studyGroupMemberRepository).save(pendingMembership);
    }

    @Test
    void approveMember_WhenUserHasNoPendingRequest_ShouldThrow404() {
        when(userRepository.findByEmail("owner@test.com")).thenReturn(Optional.of(owner));
        when(studyGroupRepository.findById(10)).thenReturn(Optional.of(groupWithApproval));
        when(studyGroupMemberRepository.findByGroupAndUserAndStatus(groupWithApproval, owner, "ACTIVE"))
                .thenReturn(Optional.of(ownerMembership));
        when(userRepository.findById(2)).thenReturn(Optional.of(newUser));
        lenient().when(studyGroupMemberRepository.findByGroupAndUser(groupWithApproval, newUser))
                .thenReturn(Optional.empty());

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                studyGroupService.approveJoinRequest(10, 2, "owner@test.com"));

        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
        verify(studyGroupMemberRepository, never()).save(any());
    }

    @Test
    void approveMember_WhenMemberLimitReached_ShouldThrowForbidden() {
        StudyGroupMember pendingMembership = new StudyGroupMember();
        pendingMembership.setGroup(groupWithApproval);
        pendingMembership.setUser(newUser);
        pendingMembership.setStatus("PENDING");

        when(userRepository.findByEmail("owner@test.com")).thenReturn(Optional.of(owner));
        when(studyGroupRepository.findById(10)).thenReturn(Optional.of(groupWithApproval));
        when(studyGroupMemberRepository.findByGroupAndUserAndStatus(groupWithApproval, owner, "ACTIVE"))
                .thenReturn(Optional.of(ownerMembership));
        when(userRepository.findById(2)).thenReturn(Optional.of(newUser));
        when(studyGroupMemberRepository.findByGroupAndUser(groupWithApproval, newUser))
                .thenReturn(Optional.of(pendingMembership));
        when(studyGroupMemberRepository.countByGroupAndStatus(groupWithApproval, "ACTIVE")).thenReturn(30L);

        QuotaExceededException ex = assertThrows(QuotaExceededException.class, () ->
                studyGroupService.approveJoinRequest(10, 2, "owner@test.com"));

        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
        assertEquals("GROUP_MEMBER_LIMIT_EXCEEDED", ex.getCode());
        verify(studyGroupMemberRepository, never()).save(any());
    }

    @Test
    void approveMember_WhenUserNotFound_ShouldThrow404() {
        when(userRepository.findByEmail("owner@test.com")).thenReturn(Optional.of(owner));
        when(studyGroupRepository.findById(10)).thenReturn(Optional.of(groupWithApproval));
        when(studyGroupMemberRepository.findByGroupAndUserAndStatus(groupWithApproval, owner, "ACTIVE"))
                .thenReturn(Optional.of(ownerMembership));
        when(userRepository.findById(999)).thenReturn(Optional.empty());

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                studyGroupService.approveJoinRequest(10, 999, "owner@test.com"));

        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
    }

    // ─── rejectMember (by userId) ─────────────────────────────────────────────

    @Test
    void rejectMember_OwnerRejectsByUserId_ShouldSetRejected() {
        StudyGroupMember pendingMembership = new StudyGroupMember();
        pendingMembership.setMemberId(99);
        pendingMembership.setGroup(groupWithApproval);
        pendingMembership.setUser(newUser);
        pendingMembership.setRole("MEMBER");
        pendingMembership.setStatus("PENDING");

        when(userRepository.findByEmail("owner@test.com")).thenReturn(Optional.of(owner));
        when(studyGroupRepository.findById(10)).thenReturn(Optional.of(groupWithApproval));
        when(studyGroupMemberRepository.findByGroupAndUserAndStatus(groupWithApproval, owner, "ACTIVE"))
                .thenReturn(Optional.of(ownerMembership));
        when(userRepository.findById(2)).thenReturn(Optional.of(newUser));
        when(studyGroupMemberRepository.findByGroupAndUser(groupWithApproval, newUser))
                .thenReturn(Optional.of(pendingMembership));

        studyGroupService.rejectJoinRequest(10, 2, "owner@test.com");

        assertEquals("REJECTED", pendingMembership.getStatus());
        verify(studyGroupMemberRepository).save(pendingMembership);
    }

    @Test
    void rejectMember_WhenUserHasNoPendingRequest_ShouldThrow404() {
        when(userRepository.findByEmail("owner@test.com")).thenReturn(Optional.of(owner));
        when(studyGroupRepository.findById(10)).thenReturn(Optional.of(groupWithApproval));
        when(studyGroupMemberRepository.findByGroupAndUserAndStatus(groupWithApproval, owner, "ACTIVE"))
                .thenReturn(Optional.of(ownerMembership));
        when(userRepository.findById(2)).thenReturn(Optional.of(newUser));
        lenient().when(studyGroupMemberRepository.findByGroupAndUser(groupWithApproval, newUser))
                .thenReturn(Optional.empty());

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                studyGroupService.rejectJoinRequest(10, 2, "owner@test.com"));

        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
        verify(studyGroupMemberRepository, never()).save(any());
    }

    @Test
    void rejectMember_NonOwner_ShouldThrow403() {
        User regularUser = new User();
        regularUser.setUserId(3);
        regularUser.setEmail("regular@test.com");

        StudyGroupMember regularMembership = new StudyGroupMember();
        regularMembership.setGroup(groupWithApproval);
        regularMembership.setUser(regularUser);
        regularMembership.setRole("MEMBER");
        regularMembership.setStatus("ACTIVE");

        when(userRepository.findByEmail("regular@test.com")).thenReturn(Optional.of(regularUser));
        when(studyGroupRepository.findById(10)).thenReturn(Optional.of(groupWithApproval));
        when(studyGroupMemberRepository.findByGroupAndUserAndStatus(groupWithApproval, regularUser, "ACTIVE"))
                .thenReturn(Optional.of(regularMembership));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                studyGroupService.rejectJoinRequest(10, 2, "regular@test.com"));

        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
        verify(studyGroupMemberRepository, never()).save(any());
    }

    // ─── requiresApproval toggle ──────────────────────────────────────────────

    @Test
    void updateGroup_OwnerCanToggleRequiresApproval() {
        UpdateGroupRequest request = new UpdateGroupRequest();
        request.setGroupName("Updated Name");
        request.setRequiresApproval(true);

        groupWithoutApproval.setOwner(owner);
        StudyGroupMember ownerInOpenGroup = new StudyGroupMember();
        ownerInOpenGroup.setGroup(groupWithoutApproval);
        ownerInOpenGroup.setUser(owner);
        ownerInOpenGroup.setRole("OWNER");
        ownerInOpenGroup.setStatus("ACTIVE");

        when(userRepository.findByEmail("owner@test.com")).thenReturn(Optional.of(owner));
        when(studyGroupRepository.findById(20)).thenReturn(Optional.of(groupWithoutApproval));
        when(studyGroupMemberRepository.findByGroupAndUserAndStatus(groupWithoutApproval, owner, "ACTIVE"))
                .thenReturn(Optional.of(ownerInOpenGroup));
        when(studyGroupRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        GroupResponse response = studyGroupService.updateGroup(20, request, "owner@test.com");

        assertTrue(response.isRequiresApproval());
        assertTrue(groupWithoutApproval.isRequiresApproval());
    }

    @Test
    void updateGroup_WhenRequiresApprovalNull_ShouldKeepExistingValue() {
        UpdateGroupRequest request = new UpdateGroupRequest();
        request.setGroupName("Updated Name");
        request.setRequiresApproval(null);

        groupWithApproval.setOwner(owner);

        when(userRepository.findByEmail("owner@test.com")).thenReturn(Optional.of(owner));
        when(studyGroupRepository.findById(10)).thenReturn(Optional.of(groupWithApproval));
        when(studyGroupMemberRepository.findByGroupAndUserAndStatus(groupWithApproval, owner, "ACTIVE"))
                .thenReturn(Optional.of(ownerMembership));
        when(studyGroupRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        GroupResponse response = studyGroupService.updateGroup(10, request, "owner@test.com");

        assertTrue(response.isRequiresApproval());
    }
}
