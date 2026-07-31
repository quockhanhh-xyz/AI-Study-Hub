package com.demo.ai_study_hub.controller;

import com.demo.ai_study_hub.dto.ApiResponse;
import com.demo.ai_study_hub.dto.SubjectRequestResponse;
import com.demo.ai_study_hub.dto.CreateSubjectRequest;
import jakarta.validation.Valid;
import com.demo.ai_study_hub.service.SubjectRequestService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/subject-requests")
public class SubjectRequestController {

    @Autowired
    private SubjectRequestService subjectRequestService;

    @PostMapping
    public ResponseEntity<ApiResponse<SubjectRequestResponse>> createRequest(
            @Valid @RequestBody CreateSubjectRequest body,
            Principal principal) {
        SubjectRequestResponse request = subjectRequestService.createSubjectRequest(body, principal.getName());
        return ResponseEntity.ok(ApiResponse.success(request, "Subject request created successfully"));
    }

    @GetMapping("/my")
    public ResponseEntity<ApiResponse<List<SubjectRequestResponse>>> getMyRequests(Principal principal) {
        List<SubjectRequestResponse> requests = subjectRequestService.getMySubjectRequests(principal.getName());
        return ResponseEntity.ok(ApiResponse.success(requests, "Retrieved your subject requests"));
    }
}
