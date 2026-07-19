package com.demo.ai_study_hub.controller;

import com.demo.ai_study_hub.dto.ApiResponse;
import com.demo.ai_study_hub.entity.SubjectRequest;
import com.demo.ai_study_hub.service.SubjectRequestService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/subject-requests")
public class AdminSubjectRequestController {

    @Autowired
    private SubjectRequestService subjectRequestService;

    @GetMapping
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<ApiResponse<List<SubjectRequest>>> getAllRequests() {
        List<SubjectRequest> requests = subjectRequestService.getAllSubjectRequests();
        return ResponseEntity.ok(ApiResponse.success(requests, "Retrieved all subject requests"));
    }

    @PatchMapping("/{id}/approve")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<ApiResponse<SubjectRequest>> approveRequest(@PathVariable Integer id, Principal principal) {
        SubjectRequest request = subjectRequestService.approveRequest(id, principal.getName());
        return ResponseEntity.ok(ApiResponse.success(request, "Subject request approved and subject created/activated"));
    }

    @PatchMapping("/{id}/reject")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<ApiResponse<SubjectRequest>> rejectRequest(
            @PathVariable Integer id,
            @RequestBody(required = false) Map<String, String> body,
            Principal principal) {
        String rejectReason = body != null ? body.get("rejectReason") : null;
        SubjectRequest request = subjectRequestService.rejectRequest(id, rejectReason, principal.getName());
        return ResponseEntity.ok(ApiResponse.success(request, "Subject request rejected"));
    }

    @GetMapping("/export")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<byte[]> exportSubjectRequests() {
        byte[] data = subjectRequestService.exportSubjectRequests();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
        headers.setContentDispositionFormData("attachment", "subject_requests.xlsx");
        return ResponseEntity.ok().headers(headers).body(data);
    }
}
