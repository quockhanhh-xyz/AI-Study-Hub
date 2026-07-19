package com.demo.ai_study_hub.controller;

import com.demo.ai_study_hub.dto.ApiResponse;
import com.demo.ai_study_hub.entity.SubjectRequest;
import com.demo.ai_study_hub.service.SubjectRequestService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/subject-requests")
public class SubjectRequestController {

    @Autowired
    private SubjectRequestService subjectRequestService;

    @PostMapping
    public ResponseEntity<ApiResponse<SubjectRequest>> createRequest(
            @RequestBody Map<String, String> body,
            Principal principal) {
        String code = body.get("requestedCode");
        String name = body.get("requestedName");
        String description = body.get("description");

        if (code == null || name == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Requested code and name are required"));
        }

        SubjectRequest request = subjectRequestService.createSubjectRequest(code, name, description, principal.getName());
        return ResponseEntity.ok(ApiResponse.success(request, "Subject request created successfully"));
    }

    @GetMapping("/my")
    public ResponseEntity<ApiResponse<List<SubjectRequest>>> getMyRequests(Principal principal) {
        List<SubjectRequest> requests = subjectRequestService.getMySubjectRequests(principal.getName());
        return ResponseEntity.ok(ApiResponse.success(requests, "Retrieved your subject requests"));
    }
}
