package com.demo.ai_study_hub.controller;

import com.demo.ai_study_hub.dto.ApiResponse;
import com.demo.ai_study_hub.dto.StudyGroupRequest;
import com.demo.ai_study_hub.dto.StudyGroupResponse;
import com.demo.ai_study_hub.service.StudyGroupService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.security.Principal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/groups")
@RequiredArgsConstructor
public class StudyGroupController {

    private final StudyGroupService studyGroupService;

    @PostMapping
    public ResponseEntity<ApiResponse<StudyGroupResponse>> createGroup(
            @RequestBody StudyGroupRequest request,
            Principal principal
    ) {
        try {
            StudyGroupResponse data = studyGroupService.createGroup(request, principal.getName());
            return ResponseEntity.ok(ApiResponse.success(data, "Study group created successfully"));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(ApiResponse.error(e.getReason()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/my")
    public ResponseEntity<ApiResponse<List<StudyGroupResponse>>> getMyGroups(Principal principal) {
        try {
            List<StudyGroupResponse> data = studyGroupService.getMyGroups(principal.getName());
            return ResponseEntity.ok(ApiResponse.success(data, "Groups retrieved successfully"));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(ApiResponse.error(e.getReason()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<StudyGroupResponse>> getGroupDetail(
            @PathVariable Integer id,
            Principal principal
    ) {
        try {
            StudyGroupResponse data = studyGroupService.getGroupDetail(id, principal.getName());
            return ResponseEntity.ok(ApiResponse.success(data, "Group details retrieved successfully"));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(ApiResponse.error(e.getReason()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.error(e.getMessage()));
        }
    }

    @PostMapping("/join")
    public ResponseEntity<ApiResponse<StudyGroupResponse>> joinGroup(
            @RequestBody Map<String, String> body,
            Principal principal
    ) {
        try {
            String inviteCode = body.get("inviteCode");
            StudyGroupResponse data = studyGroupService.joinGroup(inviteCode, principal.getName());
            return ResponseEntity.ok(ApiResponse.success(data, "Joined group successfully"));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(ApiResponse.error(e.getReason()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.error(e.getMessage()));
        }
    }

    @PostMapping("/{id}/leave")
    public ResponseEntity<ApiResponse<Void>> leaveGroup(
            @PathVariable Integer id,
            Principal principal
    ) {
        try {
            studyGroupService.leaveGroup(id, principal.getName());
            return ResponseEntity.ok(ApiResponse.success(null, "Left group successfully"));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(ApiResponse.error(e.getReason()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.error(e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<StudyGroupResponse>> updateGroup(
            @PathVariable Integer id,
            @RequestBody StudyGroupRequest request,
            Principal principal
    ) {
        try {
            StudyGroupResponse data = studyGroupService.updateGroup(id, request, principal.getName());
            return ResponseEntity.ok(ApiResponse.success(data, "Group updated successfully"));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(ApiResponse.error(e.getReason()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.error(e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteGroup(
            @PathVariable Integer id,
            Principal principal
    ) {
        try {
            studyGroupService.deleteGroup(id, principal.getName());
            return ResponseEntity.ok(ApiResponse.success(null, "Group deleted successfully"));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(ApiResponse.error(e.getReason()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.error(e.getMessage()));
        }
    }

    @DeleteMapping("/{id}/members/{userId}")
    public ResponseEntity<ApiResponse<Void>> removeMember(
            @PathVariable Integer id,
            @PathVariable Integer userId,
            Principal principal
    ) {
        try {
            studyGroupService.removeMember(id, userId, principal.getName());
            return ResponseEntity.ok(ApiResponse.success(null, "Member removed successfully"));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(ApiResponse.error(e.getReason()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.error(e.getMessage()));
        }
    }
}
