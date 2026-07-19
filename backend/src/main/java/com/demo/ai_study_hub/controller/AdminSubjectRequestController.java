package com.demo.ai_study_hub.controller;

import com.demo.ai_study_hub.dto.ApiResponse;
import com.demo.ai_study_hub.dto.SubjectRequestResponse;
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
import java.util.HashMap;

@RestController
@RequestMapping("/api/admin/subject-requests")
public class AdminSubjectRequestController {

    @Autowired
    private SubjectRequestService subjectRequestService;

    @GetMapping
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAllRequests(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String direction) {
            
        org.springframework.data.domain.Sort sort = direction.equalsIgnoreCase("asc") ? 
            org.springframework.data.domain.Sort.by(sortBy).ascending() : 
            org.springframework.data.domain.Sort.by(sortBy).descending();
            
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(page, size, sort);
        
        org.springframework.data.domain.Page<SubjectRequestResponse> requests = subjectRequestService.getAllSubjectRequests(search, status, pageable);
        
        Map<String, Object> responseData = new HashMap<>();
        responseData.put("content", requests.getContent());
        responseData.put("totalPages", requests.getTotalPages());
        responseData.put("totalElements", requests.getTotalElements());
        responseData.put("currentPage", requests.getNumber());
        
        return ResponseEntity.ok(ApiResponse.success(responseData, "Retrieved subject requests"));
    }

    @PatchMapping("/{id}/approve")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<ApiResponse<SubjectRequestResponse>> approveRequest(@PathVariable Integer id, Principal principal) {
        SubjectRequestResponse request = subjectRequestService.approveRequest(id, principal.getName());
        return ResponseEntity.ok(ApiResponse.success(request, "Subject request approved and subject created/activated"));
    }

    @PatchMapping("/{id}/reject")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<ApiResponse<SubjectRequestResponse>> rejectRequest(
            @PathVariable Integer id,
            @RequestBody(required = false) Map<String, String> body,
            Principal principal) {
        String rejectReason = body != null ? body.get("rejectReason") : null;
        SubjectRequestResponse request = subjectRequestService.rejectRequest(id, rejectReason, principal.getName());
        return ResponseEntity.ok(ApiResponse.success(request, "Subject request rejected"));
    }

    @GetMapping("/export")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<byte[]> exportSubjectRequests(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status) {
        byte[] data = subjectRequestService.exportSubjectRequests(search, status);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
        headers.setContentDispositionFormData("attachment", "subject_requests.xlsx");
        return ResponseEntity.ok().headers(headers).body(data);
    }
}
