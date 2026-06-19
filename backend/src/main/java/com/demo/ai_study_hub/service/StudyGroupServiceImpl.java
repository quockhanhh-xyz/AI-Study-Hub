package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.dto.GroupMemberResponse;
import com.demo.ai_study_hub.dto.StudyGroupRequest;
import com.demo.ai_study_hub.dto.StudyGroupResponse;
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

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StudyGroupServiceImpl implements StudyGroupService {

    private final StudyGroupRepository studyGroupRepository;
    private final StudyGroupMemberRepository studyGroupMemberRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional
    public StudyGroupResponse createGroup(StudyGroupRequest request, String email) {
        if (request.getGroupName() == null || request.getGroupName().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Group name is required");
        }

        User creator = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        String inviteCode = generateUniqueInviteCode();

        StudyGroup group = StudyGroup.builder()
                .groupName(request.getGroupName().trim())
                .description(request.getDescription() != null ? request.getDescription().trim() : null)
                .inviteCode(inviteCode)
                .owner(creator)
                .status("ACTIVE")
                .build();

        group = studyGroupRepository.save(group);

        StudyGroupMember membership = StudyGroupMember.builder()
                .group(group)
                .user(creator)
                .role("OWNER")
                .status("ACTIVE")
                .build();

        studyGroupMemberRepository.save(membership);

        return mapToResponse(group, "OWNER");
    }

    @Override
    public List<StudyGroupResponse> getMyGroups(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        List<StudyGroupMember> memberships = studyGroupMemberRepository.findActiveMembershipsByUser(user, "ACTIVE");

        return memberships.stream()
                .map(m -> mapToResponse(m.getGroup(), m.getRole()))
                .collect(Collectors.toList());
    }

    @Override
    public StudyGroupResponse getGroupDetail(Integer groupId, String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        StudyGroup group = studyGroupRepository.findByGroupIdAndStatus(groupId, "ACTIVE")
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Study group not found"));

        StudyGroupMember membership = studyGroupMemberRepository.findByGroupAndUserAndStatus(group, user, "ACTIVE")
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not a member of this group"));

        StudyGroupResponse response = mapToResponse(group, membership.getRole());

        List<StudyGroupMember> activeMembers = studyGroupMemberRepository.findByGroupAndStatus(group, "ACTIVE");
        List<GroupMemberResponse> memberResponses = activeMembers.stream()
                .map(this::mapToMemberResponse)
                .collect(Collectors.toList());

        response.setMembers(memberResponses);
        return response;
    }

    @Override
    @Transactional
    public StudyGroupResponse joinGroup(String inviteCode, String email) {
        if (inviteCode == null || inviteCode.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invite code is required");
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        StudyGroup group = studyGroupRepository.findByInviteCodeAndStatus(inviteCode.trim(), "ACTIVE")
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Invalid invite code or group deleted"));

        // Check if already active member
        boolean isAlreadyActive = studyGroupMemberRepository.existsByGroupAndUserAndStatus(group, user, "ACTIVE");
        if (isAlreadyActive) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "You are already a member of this group");
        }

        // Check if user has left or been removed in the past
        StudyGroupMember membership = studyGroupMemberRepository.findByGroupAndUserAndStatus(group, user, "LEFT")
                .orElse(studyGroupMemberRepository.findByGroupAndUserAndStatus(group, user, "REMOVED").orElse(null));

        if (membership != null) {
            membership.setStatus("ACTIVE");
            membership.setRole("MEMBER");
            studyGroupMemberRepository.save(membership);
        } else {
            membership = StudyGroupMember.builder()
                    .group(group)
                    .user(user)
                    .role("MEMBER")
                    .status("ACTIVE")
                    .build();
            studyGroupMemberRepository.save(membership);
        }

        return StudyGroupResponse.builder()
                .groupId(group.getGroupId())
                .groupName(group.getGroupName())
                .role("MEMBER")
                .build();
    }

    @Override
    @Transactional
    public void leaveGroup(Integer groupId, String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        StudyGroup group = studyGroupRepository.findByGroupIdAndStatus(groupId, "ACTIVE")
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Study group not found"));

        StudyGroupMember membership = studyGroupMemberRepository.findByGroupAndUserAndStatus(group, user, "ACTIVE")
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "You are not an active member of this group"));

        if ("OWNER".equals(membership.getRole())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Group owner cannot leave the group. Please delete the group instead.");
        }

        membership.setStatus("LEFT");
        studyGroupMemberRepository.save(membership);
    }

    @Override
    @Transactional
    public StudyGroupResponse updateGroup(Integer groupId, StudyGroupRequest request, String email) {
        if (request.getGroupName() == null || request.getGroupName().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Group name is required");
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        StudyGroup group = studyGroupRepository.findByGroupIdAndStatus(groupId, "ACTIVE")
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Study group not found"));

        // Only OWNER can update
        if (!group.getOwner().getUserId().equals(user.getUserId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the group owner can update group details");
        }

        group.setGroupName(request.getGroupName().trim());
        group.setDescription(request.getDescription() != null ? request.getDescription().trim() : null);
        group = studyGroupRepository.save(group);

        return mapToResponse(group, "OWNER");
    }

    @Override
    @Transactional
    public void deleteGroup(Integer groupId, String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        StudyGroup group = studyGroupRepository.findByGroupIdAndStatus(groupId, "ACTIVE")
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Study group not found"));

        // Only OWNER can delete
        if (!group.getOwner().getUserId().equals(user.getUserId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the group owner can delete the group");
        }

        // Soft delete the group
        group.setStatus("DELETED");
        studyGroupRepository.save(group);

        // Soft delete all active member memberships as well
        List<StudyGroupMember> activeMemberships = studyGroupMemberRepository.findByGroupAndStatus(group, "ACTIVE");
        for (StudyGroupMember m : activeMemberships) {
            m.setStatus("LEFT");
            studyGroupMemberRepository.save(m);
        }
    }

    @Override
    @Transactional
    public void removeMember(Integer groupId, Integer userIdToRemove, String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        StudyGroup group = studyGroupRepository.findByGroupIdAndStatus(groupId, "ACTIVE")
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Study group not found"));

        // Only OWNER can remove members
        if (!group.getOwner().getUserId().equals(user.getUserId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the group owner can remove members");
        }

        if (group.getOwner().getUserId().equals(userIdToRemove)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot remove yourself from the group");
        }

        User targetUser = userRepository.findById(userIdToRemove)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Member to remove not found"));

        StudyGroupMember membership = studyGroupMemberRepository.findByGroupAndUserAndStatus(group, targetUser, "ACTIVE")
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "User is not an active member of this group"));

        membership.setStatus("REMOVED");
        studyGroupMemberRepository.save(membership);
    }

    private String generateUniqueInviteCode() {
        String code;
        do {
            code = UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase();
        } while (studyGroupRepository.existsByInviteCode(code));
        return code;
    }

    private StudyGroupResponse mapToResponse(StudyGroup group, String role) {
        return StudyGroupResponse.builder()
                .groupId(group.getGroupId())
                .groupName(group.getGroupName())
                .description(group.getDescription())
                .inviteCode(group.getInviteCode())
                .ownerId(group.getOwner().getUserId())
                .status(group.getStatus())
                .role(role)
                .createdAt(group.getCreatedAt())
                .updatedAt(group.getUpdatedAt())
                .build();
    }

    private GroupMemberResponse mapToMemberResponse(StudyGroupMember m) {
        return GroupMemberResponse.builder()
                .memberId(m.getMemberId())
                .userId(m.getUser().getUserId())
                .email(m.getUser().getEmail())
                .fullName(m.getUser().getFullName())
                .role(m.getRole())
                .status(m.getStatus())
                .joinedAt(m.getJoinedAt())
                .build();
    }
}
