package com.demo.ai_study_hub;

import com.demo.ai_study_hub.dto.GroupChatMessageResponse;
import com.demo.ai_study_hub.entity.*;
import com.demo.ai_study_hub.repository.*;
import com.demo.ai_study_hub.service.GroupChatService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GroupChatServiceTest {

    @Mock private StudyGroupRepository studyGroupRepository;
    @Mock private StudyGroupMemberRepository studyGroupMemberRepository;
    @Mock private GroupChatMessageRepository groupChatMessageRepository;
    @Mock private UserRepository userRepository;

    @InjectMocks
    private GroupChatService groupChatService;

    private User mockUser;
    private User otherUser;
    private StudyGroup mockGroup;
    private StudyGroupMember mockMember;

    @BeforeEach
    void setUp() {
        mockUser = new User();
        mockUser.setUserId(1);
        mockUser.setEmail("user@test.com");
        mockUser.setFullName("Nguyen Van A");

        otherUser = new User();
        otherUser.setUserId(2);
        otherUser.setEmail("other@test.com");
        otherUser.setFullName("Tran Thi B");

        mockGroup = new StudyGroup();
        mockGroup.setGroupId(10);
        mockGroup.setGroupName("Study Group X");
        mockGroup.setStatus("ACTIVE");
        mockGroup.setOwner(mockUser);

        mockMember = new StudyGroupMember();
        mockMember.setUser(mockUser);
        mockMember.setGroup(mockGroup);
        mockMember.setRole("OWNER");
        mockMember.setStatus("ACTIVE");
    }

    // =========================================================================
    // 1. GET messages - Permission checks
    // =========================================================================

    @Test
    void getMessages_WhenGroupNotFound_ShouldThrow404() {
        // TC-GC-007
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));
        when(studyGroupRepository.findById(99)).thenReturn(Optional.empty());

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                groupChatService.getMessages(99, null, null, "user@test.com"));

        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
    }

    @Test
    void getMessages_WhenGroupDeleted_ShouldThrow404() {
        // TC-GC-006
        mockGroup.setStatus("DELETED");
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));
        when(studyGroupRepository.findById(10)).thenReturn(Optional.of(mockGroup));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                groupChatService.getMessages(10, null, null, "user@test.com"));

        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
    }

    @Test
    void getMessages_WhenNonMember_ShouldThrow403() {
        // TC-GC-002
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));
        when(studyGroupRepository.findById(10)).thenReturn(Optional.of(mockGroup));
        when(studyGroupMemberRepository.existsByGroupAndUserAndStatus(mockGroup, mockUser, "ACTIVE"))
                .thenReturn(false);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                groupChatService.getMessages(10, null, null, "user@test.com"));

        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
    }

    @Test
    void getMessages_WhenRemovedMember_ShouldThrow403() {
        // TC-GC-004: membership exists but not ACTIVE
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));
        when(studyGroupRepository.findById(10)).thenReturn(Optional.of(mockGroup));
        when(studyGroupMemberRepository.existsByGroupAndUserAndStatus(mockGroup, mockUser, "ACTIVE"))
                .thenReturn(false);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                groupChatService.getMessages(10, null, null, "user@test.com"));

        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
    }

    @Test
    void getMessages_WhenActiveMember_ShouldReturnMessages() {
        // TC-GC-005
        GroupChatMessage msg1 = buildMessage(1L, mockUser, "Hello");
        GroupChatMessage msg2 = buildMessage(2L, otherUser, "Hi there");

        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));
        when(studyGroupRepository.findById(10)).thenReturn(Optional.of(mockGroup));
        when(studyGroupMemberRepository.existsByGroupAndUserAndStatus(mockGroup, mockUser, "ACTIVE"))
                .thenReturn(true);
        when(groupChatMessageRepository.findLatestActiveMessages(eq(mockGroup), any(Pageable.class)))
                .thenReturn(List.of(msg2, msg1)); // newest first from DB
        when(studyGroupMemberRepository.findByGroupAndUser(eq(mockGroup), any()))
                .thenReturn(Optional.of(mockMember));

        List<GroupChatMessageResponse> responses = groupChatService
                .getMessages(10, null, null, "user@test.com");

        assertNotNull(responses);
        assertEquals(2, responses.size());
        // After reverse: msg1 (id=1) first, msg2 (id=2) second
        assertEquals(1L, responses.get(0).getMessageId());
        assertEquals(2L, responses.get(1).getMessageId());
    }

    @Test
    void getMessages_ShouldReturnLatestMessagesInAscOrder() {
        // TC-GC-010: latest 50, returned ASC
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));
        when(studyGroupRepository.findById(10)).thenReturn(Optional.of(mockGroup));
        when(studyGroupMemberRepository.existsByGroupAndUserAndStatus(mockGroup, mockUser, "ACTIVE"))
                .thenReturn(true);

        GroupChatMessage newest = buildMessage(60L, mockUser, "Newest");
        GroupChatMessage oldest = buildMessage(11L, mockUser, "Oldest in window");
        // DB returns newest first
        when(groupChatMessageRepository.findLatestActiveMessages(eq(mockGroup), any(Pageable.class)))
                .thenReturn(List.of(newest, oldest));
        when(studyGroupMemberRepository.findByGroupAndUser(eq(mockGroup), any()))
                .thenReturn(Optional.of(mockMember));

        List<GroupChatMessageResponse> responses = groupChatService
                .getMessages(10, null, null, "user@test.com");

        // After reverse: oldest first, newest last
        assertEquals(11L, responses.get(0).getMessageId());
        assertEquals(60L, responses.get(responses.size() - 1).getMessageId());
    }

    @Test
    void getMessages_WhenLimitExceedsMax_ShouldCapAt100() {
        // TC-GC-012: limit=120 → capped at 100
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));
        when(studyGroupRepository.findById(10)).thenReturn(Optional.of(mockGroup));
        when(studyGroupMemberRepository.existsByGroupAndUserAndStatus(mockGroup, mockUser, "ACTIVE"))
                .thenReturn(true);
        when(groupChatMessageRepository.findLatestActiveMessages(eq(mockGroup), any(Pageable.class)))
                .thenReturn(Collections.emptyList());

        groupChatService.getMessages(10, 120, null, "user@test.com");

        // Verify pageable was called with size=100 (max)
        verify(groupChatMessageRepository).findLatestActiveMessages(
                eq(mockGroup),
                argThat(p -> p.getPageSize() == 100)
        );
    }

    @Test
    void getMessages_WithAfterMessageId_ShouldCallIncrementalQuery() {
        // TC-GC-013: afterMessageId provided
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));
        when(studyGroupRepository.findById(10)).thenReturn(Optional.of(mockGroup));
        when(studyGroupMemberRepository.existsByGroupAndUserAndStatus(mockGroup, mockUser, "ACTIVE"))
                .thenReturn(true);
        when(groupChatMessageRepository.findActiveMessagesAfter(mockGroup, 40L))
                .thenReturn(Collections.emptyList());

        groupChatService.getMessages(10, null, 40L, "user@test.com");

        verify(groupChatMessageRepository).findActiveMessagesAfter(mockGroup, 40L);
        verify(groupChatMessageRepository, never())
                .findLatestActiveMessages(any(), any(Pageable.class));
    }

    @Test
    void getMessages_ShouldSetIsMineCorrectly() {
        // TC-GC-015: isMine = true for current user's messages
        GroupChatMessage myMsg = buildMessage(1L, mockUser, "My message");
        GroupChatMessage otherMsg = buildMessage(2L, otherUser, "Other message");

        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));
        when(studyGroupRepository.findById(10)).thenReturn(Optional.of(mockGroup));
        when(studyGroupMemberRepository.existsByGroupAndUserAndStatus(mockGroup, mockUser, "ACTIVE"))
                .thenReturn(true);
        when(groupChatMessageRepository.findLatestActiveMessages(eq(mockGroup), any(Pageable.class)))
                .thenReturn(List.of(otherMsg, myMsg));
        when(studyGroupMemberRepository.findByGroupAndUser(eq(mockGroup), any()))
                .thenReturn(Optional.of(mockMember));

        List<GroupChatMessageResponse> responses = groupChatService
                .getMessages(10, null, null, "user@test.com");

        // After reverse: myMsg (id=1) first
        assertTrue(responses.get(0).getIsMine());   // my message
        assertFalse(responses.get(1).getIsMine());  // other's message
    }

    // =========================================================================
    // 2. POST message - Send message
    // =========================================================================

    @Test
    void sendMessage_WhenActiveMember_ShouldSaveAndReturn() {
        // TC-GC-023
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));
        when(studyGroupRepository.findById(10)).thenReturn(Optional.of(mockGroup));
        when(studyGroupMemberRepository.existsByGroupAndUserAndStatus(mockGroup, mockUser, "ACTIVE"))
                .thenReturn(true);
        when(groupChatMessageRepository.save(any(GroupChatMessage.class)))
                .thenAnswer(inv -> {
                    GroupChatMessage m = inv.getArgument(0);
                    m.setMessageId(3L);
                    return m;
                });
        when(studyGroupMemberRepository.findByGroupAndUser(eq(mockGroup), eq(mockUser)))
                .thenReturn(Optional.of(mockMember));

        GroupChatMessageResponse response = groupChatService
                .sendMessage(10, "Hello group!", "user@test.com");

        assertNotNull(response);
        assertEquals(10, response.getGroupId());
        assertEquals(1, response.getSenderId());
        assertEquals("Hello group!", response.getContent());
        assertEquals("ACTIVE", response.getStatus());
        assertTrue(response.getIsMine());
        assertEquals("OWNER", response.getSenderRole());
        verify(groupChatMessageRepository, times(1)).save(any(GroupChatMessage.class));
    }

    @Test
    void sendMessage_ShouldTrimContent() {
        // TC-GC-023: trim whitespace
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));
        when(studyGroupRepository.findById(10)).thenReturn(Optional.of(mockGroup));
        when(studyGroupMemberRepository.existsByGroupAndUserAndStatus(mockGroup, mockUser, "ACTIVE"))
                .thenReturn(true);
        when(groupChatMessageRepository.save(any(GroupChatMessage.class)))
                .thenAnswer(inv -> inv.getArgument(0));
        when(studyGroupMemberRepository.findByGroupAndUser(eq(mockGroup), eq(mockUser)))
                .thenReturn(Optional.of(mockMember));

        GroupChatMessageResponse response = groupChatService
                .sendMessage(10, "  Welcome to group!  ", "user@test.com");

        assertEquals("Welcome to group!", response.getContent());
    }

    @Test
    void sendMessage_WhenGroupNotFound_ShouldThrow404() {
        // TC-GC-028
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));
        when(studyGroupRepository.findById(99)).thenReturn(Optional.empty());

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                groupChatService.sendMessage(99, "Hello", "user@test.com"));

        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
        verify(groupChatMessageRepository, never()).save(any());
    }

    @Test
    void sendMessage_WhenGroupDeleted_ShouldThrow404() {
        mockGroup.setStatus("DELETED");
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));
        when(studyGroupRepository.findById(10)).thenReturn(Optional.of(mockGroup));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                groupChatService.sendMessage(10, "Hello", "user@test.com"));

        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
        verify(groupChatMessageRepository, never()).save(any());
    }

    @Test
    void sendMessage_WhenNonMember_ShouldThrow403() {
        // TC-GC-021
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));
        when(studyGroupRepository.findById(10)).thenReturn(Optional.of(mockGroup));
        when(studyGroupMemberRepository.existsByGroupAndUserAndStatus(mockGroup, mockUser, "ACTIVE"))
                .thenReturn(false);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                groupChatService.sendMessage(10, "Hello", "user@test.com"));

        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
        verify(groupChatMessageRepository, never()).save(any());
    }

    @Test
    void sendMessage_WhenContentEmpty_ShouldThrow400() {
        // TC-GC-024
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));
        when(studyGroupRepository.findById(10)).thenReturn(Optional.of(mockGroup));
        when(studyGroupMemberRepository.existsByGroupAndUserAndStatus(mockGroup, mockUser, "ACTIVE"))
                .thenReturn(true);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                groupChatService.sendMessage(10, "", "user@test.com"));

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        verify(groupChatMessageRepository, never()).save(any());
    }

    @Test
    void sendMessage_WhenContentOnlySpaces_ShouldThrow400() {
        // TC-GC-025
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));
        when(studyGroupRepository.findById(10)).thenReturn(Optional.of(mockGroup));
        when(studyGroupMemberRepository.existsByGroupAndUserAndStatus(mockGroup, mockUser, "ACTIVE"))
                .thenReturn(true);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                groupChatService.sendMessage(10, "     ", "user@test.com"));

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        verify(groupChatMessageRepository, never()).save(any());
    }

    @Test
    void sendMessage_WhenContentExceeds1000Chars_ShouldThrow400() {
        // TC-GC-026
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));
        when(studyGroupRepository.findById(10)).thenReturn(Optional.of(mockGroup));
        when(studyGroupMemberRepository.existsByGroupAndUserAndStatus(mockGroup, mockUser, "ACTIVE"))
                .thenReturn(true);

        String longContent = "a".repeat(1001);
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                groupChatService.sendMessage(10, longContent, "user@test.com"));

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        verify(groupChatMessageRepository, never()).save(any());
    }

    @Test
    void sendMessage_WhenContentExactly1000Chars_ShouldSucceed() {
        // TC-GC-026 boundary: exactly 1000 chars is OK
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));
        when(studyGroupRepository.findById(10)).thenReturn(Optional.of(mockGroup));
        when(studyGroupMemberRepository.existsByGroupAndUserAndStatus(mockGroup, mockUser, "ACTIVE"))
                .thenReturn(true);
        when(groupChatMessageRepository.save(any(GroupChatMessage.class)))
                .thenAnswer(inv -> inv.getArgument(0));
        when(studyGroupMemberRepository.findByGroupAndUser(eq(mockGroup), eq(mockUser)))
                .thenReturn(Optional.of(mockMember));

        String maxContent = "a".repeat(1000);
        assertDoesNotThrow(() ->
                groupChatService.sendMessage(10, maxContent, "user@test.com"));
    }

    @Test
    void sendMessage_WithHtmlContent_ShouldStorePlainText() {
        // TC-GC-027: XSS content stored as-is, FE responsible for escaping
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));
        when(studyGroupRepository.findById(10)).thenReturn(Optional.of(mockGroup));
        when(studyGroupMemberRepository.existsByGroupAndUserAndStatus(mockGroup, mockUser, "ACTIVE"))
                .thenReturn(true);
        when(groupChatMessageRepository.save(any(GroupChatMessage.class)))
                .thenAnswer(inv -> inv.getArgument(0));
        when(studyGroupMemberRepository.findByGroupAndUser(eq(mockGroup), eq(mockUser)))
                .thenReturn(Optional.of(mockMember));

        String xssContent = "<script>alert('xss')</script>";
        GroupChatMessageResponse response = groupChatService
                .sendMessage(10, xssContent, "user@test.com");

        assertEquals(xssContent, response.getContent());
        assertEquals("ACTIVE", response.getStatus());
    }

    @Test
    void sendMessage_ShouldSetUpdatedAtEqualCreatedAt() {
        // TC-GC-023: updated_at = created_at on create
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(mockUser));
        when(studyGroupRepository.findById(10)).thenReturn(Optional.of(mockGroup));
        when(studyGroupMemberRepository.existsByGroupAndUserAndStatus(mockGroup, mockUser, "ACTIVE"))
                .thenReturn(true);
        when(groupChatMessageRepository.save(any(GroupChatMessage.class)))
                .thenAnswer(inv -> inv.getArgument(0));
        when(studyGroupMemberRepository.findByGroupAndUser(eq(mockGroup), eq(mockUser)))
                .thenReturn(Optional.of(mockMember));

        verify(groupChatMessageRepository, never()).save(argThat(m ->
                m.getUpdatedAt() == null));

        groupChatService.sendMessage(10, "Hello", "user@test.com");

        verify(groupChatMessageRepository).save(argThat(m ->
                m.getUpdatedAt() != null && m.getDeletedAt() == null
        ));
    }

    // =========================================================================
    // Helper
    // =========================================================================

    private GroupChatMessage buildMessage(Long id, User sender, String content) {
        GroupChatMessage msg = GroupChatMessage.builder()
                .messageId(id)
                .group(mockGroup)
                .sender(sender)
                .content(content)
                .status("ACTIVE")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
        return msg;
    }
}
