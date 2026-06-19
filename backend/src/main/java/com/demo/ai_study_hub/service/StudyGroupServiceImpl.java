package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.dto.*;
import com.demo.ai_study_hub.entity.StudyGroup;
import com.demo.ai_study_hub.entity.StudyGroupMember;
import com.demo.ai_study_hub.entity.User;
import com.demo.ai_study_hub.repository.StudyGroupMemberRepository;
import com.demo.ai_study_hub.repository.StudyGroupRepository;
import com.demo.ai_study_hub.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StudyGroupServiceImpl implements StudyGroupService {

    private final StudyGroupRepository studyGroupRepository;
    private final StudyGroupMemberRepository studyGroupMemberRepository;
    private final UserRepository userRepository;

    private static final String CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    private final SecureRandom random = new SecureRandom();

    @Override
    @Transactional
    public GroupResponse createGroup(CreateGroupRequest request, String email) {
        User owner = getUser(email);

        StudyGroup group = new StudyGroup();
        group.setGroupName(request.getGroupName());
        group.setDescription(request.getDescription());
        group.setInviteCode(generateUniqueInviteCode());
        group.setOwner(owner);
        group.setStatus("ACTIVE");
        StudyGroup savedGroup = studyGroupRepository.save(group);

        StudyGroupMember member = new StudyGroupMember();
        member.setGroup(savedGroup);
        member.setUser(owner);
        member.setRole("OWNER");
        member.setStatus("ACTIVE");
        studyGroupMemberRepository.save(member);

        return mapToGroupResponse(savedGroup, "OWNER");
    }

    @Override
    @Transactional(readOnly = true)
    public List<GroupResponse> getMyGroups(String email) {
        User user = getUser(email);

        List<StudyGroupMember> memberships = studyGroupMemberRepository.findByUserAndStatus(user, "ACTIVE");

        return memberships.stream()
                .filter(m -> "ACTIVE".equals(m.getGroup().getStatus()))
                .map(m -> mapToGroupResponse(m.getGroup(), m.getRole()))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public GroupDetailResponse getGroupDetail(Integer groupId, String email) {
        User user = getUser(email);
        StudyGroup group = getActiveGroup(groupId);

        StudyGroupMember currentMembership = studyGroupMemberRepository
                .findByGroupAndUserAndStatus(group, user, "ACTIVE")
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not a member of this group"));

        List<StudyGroupMember> activeMembers = studyGroupMemberRepository.findByGroupAndStatus(group, "ACTIVE");

        List<GroupDetailResponse.GroupMemberItem> memberItems = activeMembers.stream()
                .map(m -> GroupDetailResponse.GroupMemberItem.builder()
                        .userId(m.getUser().getUserId())
                        .fullName(m.getUser().getFullName())
                        .email(m.getUser().getEmail())
                        .role(m.getRole())
                        .joinedAt(m.getJoinedAt())
                        .build())
                .collect(Collectors.toList());

        return GroupDetailResponse.builder()
                .groupId(group.getGroupId())
                .groupName(group.getGroupName())
                .description(group.getDescription())
                .inviteCode(group.getInviteCode())
                .status(group.getStatus())
                .currentUserRole(currentMembership.getRole())
                .members(memberItems)
                .createdAt(group.getCreatedAt())
                .updatedAt(group.getUpdatedAt())
                .build();
    }

    @Override
    @Transactional
    public GroupResponse joinGroup(JoinGroupRequest request, String email) {
        User user = getUser(email);

        StudyGroup group = studyGroupRepository.findByInviteCode(request.getInviteCode())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Invalid invite code"));

        if (!"ACTIVE".equals(group.getStatus())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Group not found");
        }

        boolean alreadyActive = studyGroupMemberRepository.existsByGroupAndUserAndStatus(group, user, "ACTIVE");
        if (alreadyActive) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "You are already a member of this group");
        }

        StudyGroupMember existing = studyGroupMemberRepository.findByGroupAndUser(group, user).orElse(null);
        if (existing != null) {
            existing.setStatus("ACTIVE");
            existing.setRole("MEMBER");
            studyGroupMemberRepository.save(existing);
        } else {
            StudyGroupMember member = new StudyGroupMember();
            member.setGroup(group);
            member.setUser(user);
            member.setRole("MEMBER");
            member.setStatus("ACTIVE");
            studyGroupMemberRepository.save(member);
        }

        return mapToGroupResponse(group, "MEMBER");
    }

    @Override
    @Transactional
    public void leaveGroup(Integer groupId, String email) {
        User user = getUser(email);
        StudyGroup group = getActiveGroup(groupId);

        StudyGroupMember membership = studyGroupMemberRepository
                .findByGroupAndUserAndStatus(group, user, "ACTIVE")
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "You are not a member of this group"));

        if ("OWNER".equals(membership.getRole())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Group owner cannot leave the group. Delete the group instead.");
        }

        membership.setStatus("LEFT");
        studyGroupMemberRepository.save(membership);
    }

    @Override
    @Transactional
    public GroupResponse updateGroup(Integer groupId, UpdateGroupRequest request, String email) {
        User user = getUser(email);
        StudyGroup group = getActiveGroup(groupId);

        requireOwner(group, user);

        group.setGroupName(request.getGroupName());
        group.setDescription(request.getDescription());
        StudyGroup updated = studyGroupRepository.save(group);

        return mapToGroupResponse(updated, "OWNER");
    }

    @Override
    @Transactional
    public void deleteGroup(Integer groupId, String email) {
        User user = getUser(email);
        StudyGroup group = getActiveGroup(groupId);

        requireOwner(group, user);

        group.setStatus("DELETED");
        studyGroupRepository.save(group);

        List<StudyGroupMember> activeMembers = studyGroupMemberRepository.findByGroupAndStatus(group, "ACTIVE");
        activeMembers.forEach(m -> m.setStatus("LEFT"));
        studyGroupMemberRepository.saveAll(activeMembers);
    }

    @Override
    @Transactional
    public void removeMember(Integer groupId, Integer userId, String email) {
        User owner = getUser(email);
        StudyGroup group = getActiveGroup(groupId);

        requireOwner(group, owner);

        if (owner.getUserId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Owner cannot remove themselves");
        }

        User targetUser = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        StudyGroupMember membership = studyGroupMemberRepository
                .findByGroupAndUserAndStatus(group, targetUser, "ACTIVE")
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Member not found in this group"));

        membership.setStatus("REMOVED");
        studyGroupMemberRepository.save(membership);
    }

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }

    private StudyGroup getActiveGroup(Integer groupId) {
        StudyGroup group = studyGroupRepository.findById(groupId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Group not found"));
        if (!"ACTIVE".equals(group.getStatus())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Group not found");
        }
        return group;
    }

    private void requireOwner(StudyGroup group, User user) {
        StudyGroupMember membership = studyGroupMemberRepository
                .findByGroupAndUserAndStatus(group, user, "ACTIVE")
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not a member of this group"));

        if (!"OWNER".equals(membership.getRole())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the group owner can perform this action");
        }
    }

    private String generateUniqueInviteCode() {
        String code;
        do {
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < 8; i++) {
                sb.append(CHARS.charAt(random.nextInt(CHARS.length())));
            }
            code = sb.toString();
        } while (studyGroupRepository.existsByInviteCode(code));
        return code;
    }

    private GroupResponse mapToGroupResponse(StudyGroup group, String role) {
        return GroupResponse.builder()
                .groupId(group.getGroupId())
                .groupName(group.getGroupName())
                .description(group.getDescription())
                .inviteCode(group.getInviteCode())
                .role(role)
                .status(group.getStatus())
                .createdAt(group.getCreatedAt())
                .updatedAt(group.getUpdatedAt())
                .build();
    }
}
