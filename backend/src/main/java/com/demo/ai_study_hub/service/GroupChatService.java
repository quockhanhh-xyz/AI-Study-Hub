package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.dto.GroupChatMessageResponse;
import com.demo.ai_study_hub.entity.*;
import com.demo.ai_study_hub.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GroupChatService {

    private static final int DEFAULT_LIMIT = 50;
    private static final int MAX_LIMIT = 100;
    private static final int MAX_CONTENT_LENGTH = 1000;

    private final StudyGroupRepository studyGroupRepository;
    private final StudyGroupMemberRepository studyGroupMemberRepository;
    private final GroupChatMessageRepository groupChatMessageRepository;
    private final UserRepository userRepository;

    public List<GroupChatMessageResponse> getMessages(
            Integer groupId, Integer limit, Long afterMessageId, String userEmail) {

        User currentUser = getUser(userEmail);
        StudyGroup group = getActiveGroup(groupId);
        validateActiveMember(group, currentUser);

        int effectiveLimit = (limit == null || limit <= 0) ? DEFAULT_LIMIT
                : Math.min(limit, MAX_LIMIT);

        List<GroupChatMessage> messages;
        if (afterMessageId != null) {
            messages = groupChatMessageRepository.findActiveMessagesAfter(
                group, afterMessageId, PageRequest.of(0, effectiveLimit));
        } else {
            List<GroupChatMessage> latest = groupChatMessageRepository
                    .findLatestActiveMessages(group, PageRequest.of(0, effectiveLimit));
            messages = new ArrayList<>(latest);
            Collections.reverse(messages); // newest-first → ASC
        }

        return messages.stream()
                .map(m -> toResponse(m, currentUser.getUserId()))
                .collect(Collectors.toList());
    }

    @Transactional
    public GroupChatMessageResponse sendMessage(
            Integer groupId, String content, String userEmail) {

        User currentUser = getUser(userEmail);
        StudyGroup group = getActiveGroup(groupId);
        validateActiveMember(group, currentUser);

        // Validate content
        if (content == null || content.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Message content must not be empty");
        }
        String trimmedContent = content.trim();
        if (trimmedContent.length() > MAX_CONTENT_LENGTH) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Message content must not exceed 1000 characters");
        }

        LocalDateTime now = LocalDateTime.now();
        GroupChatMessage message = GroupChatMessage.builder()
            .group(group)
            .sender(currentUser)
            .content(trimmedContent)
            .status("ACTIVE")
            .createdAt(now)
            .updatedAt(now)
            .build();

        groupChatMessageRepository.save(message);
        return toResponse(message, currentUser.getUserId());
    }

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "User not found"));
    }

    private StudyGroup getActiveGroup(Integer groupId) {
        StudyGroup group = studyGroupRepository.findById(groupId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Group not found"));
        if (!"ACTIVE".equals(group.getStatus())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Group not found");
        }
        return group;
    }

    private void validateActiveMember(StudyGroup group, User user) {
        boolean isActiveMember = studyGroupMemberRepository
                .existsByGroupAndUserAndStatus(group, user, "ACTIVE");
        if (!isActiveMember) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "You must be an active member of this group to access chat");
        }
    }

    private GroupChatMessageResponse toResponse(GroupChatMessage message, Integer currentUserId) {
        StudyGroupMember membership = studyGroupMemberRepository
                .findByGroupAndUser(message.getGroup(), message.getSender())
                .orElse(null);
        String senderRole = membership != null ? membership.getRole() : "MEMBER";

        return GroupChatMessageResponse.builder()
                .messageId(message.getMessageId())
                .groupId(message.getGroup().getGroupId())
                .senderId(message.getSender().getUserId())
                .senderName(message.getSender().getFullName())
                .senderRole(senderRole)
                .content(message.getContent())
                .status(message.getStatus())
                .isMine(message.getSender().getUserId().equals(currentUserId))
                .createdAt(message.getCreatedAt())
                .build();
    }
}
