package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.dto.StudyGroupRequest;
import com.demo.ai_study_hub.dto.StudyGroupResponse;

import java.util.List;

public interface StudyGroupService {
    StudyGroupResponse createGroup(StudyGroupRequest request, String email);
    List<StudyGroupResponse> getMyGroups(String email);
    StudyGroupResponse getGroupDetail(Integer groupId, String email);
    StudyGroupResponse joinGroup(String inviteCode, String email);
    void leaveGroup(Integer groupId, String email);
    StudyGroupResponse updateGroup(Integer groupId, StudyGroupRequest request, String email);
    void deleteGroup(Integer groupId, String email);
    void removeMember(Integer groupId, Integer userIdToRemove, String email);
}
