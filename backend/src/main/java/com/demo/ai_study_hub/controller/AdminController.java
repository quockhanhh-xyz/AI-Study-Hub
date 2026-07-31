package com.demo.ai_study_hub.controller;

import com.demo.ai_study_hub.dto.AdminDashboardResponse;
import com.demo.ai_study_hub.dto.AdminPublicDocumentListResponse;
import com.demo.ai_study_hub.dto.ApiResponse;
import java.util.List;
import java.util.Map;
import com.demo.ai_study_hub.service.AdminService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@Slf4j
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;

    @GetMapping("/dashboard/summary")
    public ResponseEntity<ApiResponse<AdminDashboardResponse>> getDashboardSummary() {
        try {
            AdminDashboardResponse data = adminService.getDashboardSummary();
            return ResponseEntity.ok(new ApiResponse<>(true, "Admin dashboard summary retrieved successfully", data));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(new ApiResponse<>(false, e.getReason(), null));
        } catch (Exception e) {
            log.error("Error generating admin dashboard summary", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse<>(false, "An unexpected error occurred while generating dashboard summary.", null));
        }
    }

    @GetMapping("/dashboard/charts")
    public ResponseEntity<ApiResponse<com.demo.ai_study_hub.dto.AdminDashboardChartsResponse>> getDashboardCharts(
            @RequestParam(defaultValue = "30") Integer days) {
        try {
            com.demo.ai_study_hub.dto.AdminDashboardChartsResponse data = adminService.getDashboardCharts(days);
            return ResponseEntity.ok(new ApiResponse<>(true, "Admin dashboard charts retrieved successfully", data));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(new ApiResponse<>(false, e.getReason(), null));
        } catch (Exception e) {
            log.error("Error generating admin dashboard charts", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse<>(false, "An unexpected error occurred while generating dashboard charts.", null));
        }
    }

    @GetMapping("/documents/public")
    public ResponseEntity<ApiResponse<AdminPublicDocumentListResponse>> getPublicDocuments(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String approvalStatus,
            @RequestParam(required = false) String fileType,
            @RequestParam(required = false) Integer subjectId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        try {
            AdminPublicDocumentListResponse data = adminService.getPublicDocuments(search, approvalStatus, fileType, subjectId, page, size);
            return ResponseEntity.ok(new ApiResponse<>(true, "Public documents retrieved successfully", data));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(new ApiResponse<>(false, e.getReason(), null));
        } catch (Exception e) {
            log.error("Error retrieving public documents for moderation", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse<>(false, "An unexpected error occurred while retrieving public documents.", null));
        }
    }

    @PatchMapping("/documents/{id}/approve")
    public ResponseEntity<ApiResponse<Void>> approveDocument(@PathVariable Integer id) {
        try {
            adminService.approveDocument(id);
            return ResponseEntity.ok(new ApiResponse<>(true, "Document approved successfully", null));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(new ApiResponse<>(false, e.getReason(), null));
        } catch (Exception e) {
            log.error("Error approving document {}", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse<>(false, "An unexpected error occurred while approving document.", null));
        }
    }

    @PatchMapping("/documents/{id}/reject")
    public ResponseEntity<ApiResponse<Void>> rejectDocument(
            @PathVariable Integer id,
            @RequestBody(required = false) Map<String, String> body) {
        try {
            String reason = body != null ? body.get("rejectReason") : null;
            adminService.rejectDocument(id, reason);
            return ResponseEntity.ok(new ApiResponse<>(true, "Document rejected successfully", null));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(new ApiResponse<>(false, e.getReason(), null));
        } catch (Exception e) {
            log.error("Error rejecting document {}", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse<>(false, "An unexpected error occurred while rejecting document.", null));
        }
    }

    @PatchMapping("/documents/{id}/unpublish")
    public ResponseEntity<ApiResponse<Void>> unpublishDocument(@PathVariable Integer id) {
        try {
            adminService.unpublishDocument(id);
            return ResponseEntity.ok(new ApiResponse<>(true, "Document unpublished successfully", null));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(new ApiResponse<>(false, e.getReason(), null));
        } catch (Exception e) {
            log.error("Error unpublishing document {}", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse<>(false, "An unexpected error occurred while unpublishing document.", null));
        }
    }

    @PatchMapping("/documents/{id}/pending")
    public ResponseEntity<ApiResponse<Void>> makeDocumentPending(@PathVariable Integer id) {
        try {
            adminService.makeDocumentPending(id);
            return ResponseEntity.ok(new ApiResponse<>(true, "Document moved back to review successfully", null));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(new ApiResponse<>(false, e.getReason(), null));
        } catch (Exception e) {
            log.error("Error moving document {} back to pending", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse<>(false, "An unexpected error occurred while moving document back to pending.", null));
        }
    }

    @GetMapping("/documents/public/export")
    public ResponseEntity<byte[]> exportPublicDocuments(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String approvalStatus,
            @RequestParam(required = false) String fileType,
            @RequestParam(required = false) Integer subjectId) {
        try {
            byte[] data = adminService.exportPublicDocuments(search, approvalStatus, fileType, subjectId);
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"public_documents.xlsx\"")
                    .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .body(data);
        } catch (Exception e) {
            log.error("Error exporting public documents", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(null);
        }
    }

    @GetMapping("/plans")
    public ResponseEntity<ApiResponse<List<com.demo.ai_study_hub.entity.PlanConfig>>> getAllPlans() {
        try {
            List<com.demo.ai_study_hub.entity.PlanConfig> data = adminService.getAllPlanConfigs();
            return ResponseEntity.ok(new ApiResponse<>(true, "All plans retrieved successfully", data));
        } catch (Exception e) {
            log.error("Error retrieving plan configurations", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse<>(false, "An unexpected error occurred while retrieving plans.", null));
        }
    }

    @GetMapping("/plans/{planCode}")
    public ResponseEntity<ApiResponse<com.demo.ai_study_hub.entity.PlanConfig>> getPlanDetails(@PathVariable String planCode) {
        try {
            com.demo.ai_study_hub.entity.PlanConfig data = adminService.getPlanConfig(planCode);
            return ResponseEntity.ok(new ApiResponse<>(true, "Plan details retrieved successfully", data));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(new ApiResponse<>(false, e.getReason(), null));
        } catch (Exception e) {
            log.error("Error retrieving plan configuration {}", planCode, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse<>(false, "An unexpected error occurred while retrieving plan details.", null));
        }
    }

    @PutMapping("/plans/{planCode}")
    public ResponseEntity<ApiResponse<com.demo.ai_study_hub.entity.PlanConfig>> updatePlan(
            @PathVariable String planCode,
            @RequestBody com.demo.ai_study_hub.dto.PlanUpdateRequest request) {
        try {
            com.demo.ai_study_hub.entity.PlanConfig data = adminService.updatePlanConfig(planCode, request);
            return ResponseEntity.ok(new ApiResponse<>(true, "Plan configuration updated successfully", data));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(new ApiResponse<>(false, e.getReason(), null));
        } catch (Exception e) {
            log.error("Error updating plan configuration {}", planCode, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse<>(false, "An unexpected error occurred while updating plan.", null));
        }
    }

    @PatchMapping("/plans/{planCode}/status")
    public ResponseEntity<ApiResponse<com.demo.ai_study_hub.entity.PlanConfig>> patchPlanStatus(
            @PathVariable String planCode,
            @RequestParam String status) {
        try {
            com.demo.ai_study_hub.entity.PlanConfig data = adminService.patchPlanStatus(planCode, status);
            return ResponseEntity.ok(new ApiResponse<>(true, "Plan status patched successfully", data));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(new ApiResponse<>(false, e.getReason(), null));
        } catch (Exception e) {
            log.error("Error patching status of plan configuration {}", planCode, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse<>(false, "An unexpected error occurred while patching plan status.", null));
        }
    }

    @GetMapping("/plans/export")
    public ResponseEntity<byte[]> exportPlanConfigs() {
        try {
            byte[] data = adminService.exportPlanConfigs();
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"plans_configuration.xlsx\"")
                    .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .body(data);
        } catch (Exception e) {
            log.error("Error exporting plan configurations", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(null);
        }
    }

    @GetMapping("/plans/history")
    public ResponseEntity<ApiResponse<List<com.demo.ai_study_hub.entity.PlanChangeHistory>>> getPlanChangeHistory() {
        try {
            List<com.demo.ai_study_hub.entity.PlanChangeHistory> data = adminService.getPlanChangeHistory();
            return ResponseEntity.ok(new ApiResponse<>(true, "Plan change history retrieved successfully", data));
        } catch (Exception e) {
            log.error("Error retrieving plan change history", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse<>(false, "An unexpected error occurred while retrieving plan change history.", null));
        }
    }
}
