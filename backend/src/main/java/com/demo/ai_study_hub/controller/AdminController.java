package com.demo.ai_study_hub.controller;

import com.demo.ai_study_hub.dto.AdminDashboardResponse;
import com.demo.ai_study_hub.dto.AdminPublicDocumentListResponse;
import com.demo.ai_study_hub.dto.ApiResponse;
import com.demo.ai_study_hub.service.AdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

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
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse<>(false, "An error occurred while generating dashboard summary: " + e.getMessage(), null));
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
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse<>(false, "Failed to retrieve public documents: " + e.getMessage(), null));
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
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse<>(false, "Failed to approve document: " + e.getMessage(), null));
        }
    }

    @PatchMapping("/documents/{id}/reject")
    public ResponseEntity<ApiResponse<Void>> rejectDocument(@PathVariable Integer id) {
        try {
            adminService.rejectDocument(id);
            return ResponseEntity.ok(new ApiResponse<>(true, "Document rejected successfully", null));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(new ApiResponse<>(false, e.getReason(), null));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse<>(false, "Failed to reject document: " + e.getMessage(), null));
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
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse<>(false, "Failed to unpublish document: " + e.getMessage(), null));
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
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(null);
        }
    }
}
