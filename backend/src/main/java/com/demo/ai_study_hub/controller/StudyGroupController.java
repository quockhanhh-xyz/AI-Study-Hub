package com.demo.ai_study_hub.controller;

import com.demo.ai_study_hub.dto.*;
import com.demo.ai_study_hub.exception.QuotaExceededException;
import com.demo.ai_study_hub.service.StudyGroupService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/groups")
@RequiredArgsConstructor
public class StudyGroupController {

    private final StudyGroupService studyGroupService;

    @PostMapping
    public ResponseEntity<ApiResponse<GroupResponse>> createGroup(
            @Valid @RequestBody CreateGroupRequest request,
            Principal principal) {
        try {
            GroupResponse data = studyGroupService.createGroup(request, principal.getName());
            return ResponseEntity.ok(ApiResponse.success(data, "Study group created successfully"));
        } catch (ResponseStatusException e) {
            if (e instanceof com.demo.ai_study_hub.exception.QuotaExceededException qe) {
                return ResponseEntity.status(qe.getStatusCode()).body(ApiResponse.error(qe.getReason(), qe.getCode()));
            }
            return ResponseEntity.status(e.getStatusCode()).body(ApiResponse.error(e.getReason()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/my")
    public ResponseEntity<ApiResponse<List<GroupResponse>>> getMyGroups(Principal principal) {
        try {
            List<GroupResponse> data = studyGroupService.getMyGroups(principal.getName());
            return ResponseEntity.ok(ApiResponse.success(data, "Groups retrieved successfully"));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(ApiResponse.error(e.getReason()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<GroupDetailResponse>> getGroupDetail(
            @PathVariable Integer id,
            Principal principal) {
        try {
            GroupDetailResponse data = studyGroupService.getGroupDetail(id, principal.getName());
            return ResponseEntity.ok(ApiResponse.success(data, "Group details retrieved successfully"));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(ApiResponse.error(e.getReason()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.error(e.getMessage()));
        }
    }

    @PostMapping("/join")
    public ResponseEntity<ApiResponse<GroupResponse>> joinGroup(
            @Valid @RequestBody JoinGroupRequest request,
            Principal principal) {
        try {
            GroupResponse data = studyGroupService.joinGroup(request, principal.getName());
            String msg = "ACTIVE".equals(data.getMembershipStatus())
                    ? "Joined group successfully"
                    : "Join request sent. Waiting for owner approval.";
            return ResponseEntity.ok(ApiResponse.success(data, msg));
        } catch (ResponseStatusException e) {
            if (e instanceof com.demo.ai_study_hub.exception.QuotaExceededException qe) {
                return ResponseEntity.status(qe.getStatusCode()).body(ApiResponse.error(qe.getReason(), qe.getCode()));
            }
            return ResponseEntity.status(e.getStatusCode()).body(ApiResponse.error(e.getReason()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.error(e.getMessage()));
        }
    }

    @PostMapping("/{id}/leave")
    public ResponseEntity<ApiResponse<Void>> leaveGroup(
            @PathVariable Integer id,
            Principal principal) {
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
    public ResponseEntity<ApiResponse<GroupResponse>> updateGroup(
            @PathVariable Integer id,
            @Valid @RequestBody UpdateGroupRequest request,
            Principal principal) {
        try {
            GroupResponse data = studyGroupService.updateGroup(id, request, principal.getName());
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
            Principal principal) {
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
            Principal principal) {
        try {
            studyGroupService.removeMember(id, userId, principal.getName());
            return ResponseEntity.ok(ApiResponse.success(null, "Member removed successfully"));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(ApiResponse.error(e.getReason()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.error(e.getMessage()));
        }
    }

    @PostMapping("/{id}/invites/email")
    public ResponseEntity<ApiResponse<GroupEmailInviteResponse>> sendEmailInvite(
            @PathVariable Integer id,
            @Valid @RequestBody GroupEmailInviteRequest request,
            Principal principal) {
        try {
            GroupEmailInviteResponse data = studyGroupService.sendEmailInvite(id, request, principal.getName());
            return ResponseEntity.ok(ApiResponse.success(data, "Invitation email sent successfully"));
        } catch (QuotaExceededException e) {
            return ResponseEntity.status(e.getStatusCode()).body(ApiResponse.error(e.getReason(), e.getCode()));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(ApiResponse.error(e.getReason()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/{id}/pending-members")
    public ResponseEntity<ApiResponse<List<PendingMemberResponse>>> listPendingMembers(
            @PathVariable Integer id,
            Principal principal) {
        try {
            List<PendingMemberResponse> data = studyGroupService.listPendingMembers(id, principal.getName());
            return ResponseEntity.ok(ApiResponse.success(data, "Pending members retrieved successfully"));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(ApiResponse.error(e.getReason()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.error(e.getMessage()));
        }
    }

    @PostMapping("/{id}/members/{userId}/approve")
    public ResponseEntity<ApiResponse<Void>> approveJoinRequest(
            @PathVariable Integer id,
            @PathVariable Integer userId,
            Principal principal) {
        try {
            studyGroupService.approveJoinRequest(id, userId, principal.getName());
            return ResponseEntity.ok(ApiResponse.success(null, "Join request approved successfully"));
        } catch (QuotaExceededException e) {
            return ResponseEntity.status(e.getStatusCode()).body(ApiResponse.error(e.getReason(), e.getCode()));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(ApiResponse.error(e.getReason()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.error(e.getMessage()));
        }
    }

    @PostMapping("/{id}/members/{userId}/reject")
    public ResponseEntity<ApiResponse<Void>> rejectJoinRequest(
            @PathVariable Integer id,
            @PathVariable Integer userId,
            Principal principal) {
        try {
            studyGroupService.rejectJoinRequest(id, userId, principal.getName());
            return ResponseEntity.ok(ApiResponse.success(null, "Join request rejected successfully"));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(ApiResponse.error(e.getReason()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.error(e.getMessage()));
        }
    }
}
