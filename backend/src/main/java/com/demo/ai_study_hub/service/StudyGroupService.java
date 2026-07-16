package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.dto.CreateGroupRequest;
import com.demo.ai_study_hub.dto.GroupDetailResponse;
import com.demo.ai_study_hub.dto.GroupEmailInviteRequest;
import com.demo.ai_study_hub.dto.GroupEmailInviteResponse;
import com.demo.ai_study_hub.dto.GroupResponse;
import com.demo.ai_study_hub.dto.JoinGroupRequest;
import com.demo.ai_study_hub.dto.PendingMemberResponse;
import com.demo.ai_study_hub.dto.UpdateGroupRequest;
import com.demo.ai_study_hub.dto.PendingMemberResponse;

import java.util.List;

public interface StudyGroupService {

    GroupResponse createGroup(CreateGroupRequest request, String email);

    List<GroupResponse> getMyGroups(String email);

    GroupDetailResponse getGroupDetail(Integer groupId, String email);

    GroupResponse joinGroup(JoinGroupRequest request, String email);

    void leaveGroup(Integer groupId, String email);

    GroupResponse updateGroup(Integer groupId, UpdateGroupRequest request, String email);

    void deleteGroup(Integer groupId, String email);

    void removeMember(Integer groupId, Integer userId, String email);

    GroupEmailInviteResponse sendEmailInvite(Integer groupId, GroupEmailInviteRequest request, String senderEmail);

    void approveJoinRequest(Integer groupId, Integer userId, String ownerEmail);

    void rejectJoinRequest(Integer groupId, Integer userId, String ownerEmail);

    List<PendingMemberResponse> listPendingMembers(Integer groupId, String ownerEmail);
}
