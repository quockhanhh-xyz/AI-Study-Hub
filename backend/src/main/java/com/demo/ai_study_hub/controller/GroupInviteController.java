package com.demo.ai_study_hub.controller;

import com.demo.ai_study_hub.dto.ApiResponse;
import com.demo.ai_study_hub.dto.GroupInviteResponse;
import com.demo.ai_study_hub.service.StudyGroupService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/group-invites")
public class GroupInviteController {

    @Autowired
    private StudyGroupService studyGroupService;

    @GetMapping("/groups/{groupId}/invites")
    public ResponseEntity<ApiResponse<List<GroupInviteResponse>>> listPendingInvites(
            @PathVariable Integer groupId,
            Principal principal) {
        try {
            List<GroupInviteResponse> data = studyGroupService.listPendingInvites(groupId, principal.getName());
            return ResponseEntity.ok(ApiResponse.success(data, "Invites retrieved successfully"));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(ApiResponse.error(e.getReason()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/group-invites/my")
    public ResponseEntity<ApiResponse<List<GroupInviteResponse>>> getMyInvites(Principal principal) {
        try {
            List<GroupInviteResponse> data = studyGroupService.getMyInvites(principal.getName());
            return ResponseEntity.ok(ApiResponse.success(data, "Invites retrieved successfully"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.error(e.getMessage()));
        }
    }

    @PostMapping("/{id}/accept")
    public ResponseEntity<ApiResponse<Integer>> acceptInvite(
            @PathVariable Long id,
            Principal principal) {
        try {
            Integer groupId = studyGroupService.acceptInvite(id, principal.getName());
            return ResponseEntity.ok(ApiResponse.success(groupId, "Invite accepted successfully"));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(ApiResponse.error(e.getReason()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.error(e.getMessage()));
        }
    }

    @PostMapping("/{id}/decline")
    public ResponseEntity<ApiResponse<Void>> declineInvite(
            @PathVariable Long id,
            Principal principal) {
        try {
            studyGroupService.declineInvite(id, principal.getName());
            return ResponseEntity.ok(ApiResponse.success(null, "Invite declined successfully"));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(ApiResponse.error(e.getReason()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.error(e.getMessage()));
        }
    }
}
