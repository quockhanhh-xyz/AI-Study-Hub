package com.demo.ai_study_hub.controller;

import com.demo.ai_study_hub.dto.ApiResponse;
import com.demo.ai_study_hub.dto.CreateCustomSubjectRequest;
import com.demo.ai_study_hub.dto.SubjectResponse;
import com.demo.ai_study_hub.service.SubjectService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/subjects")
@RequiredArgsConstructor
public class SubjectController {

    private final SubjectService subjectService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<SubjectResponse>>> getSubjects(Principal principal) {
        List<SubjectResponse> subjects = subjectService.getActiveSubjects(principal.getName());
        return ResponseEntity.ok(ApiResponse.<List<SubjectResponse>>builder()
                .success(true)
                .message("Subjects retrieved successfully")
                .data(subjects)
                .build());
    }

    @GetMapping("/public")
    public ResponseEntity<ApiResponse<List<SubjectResponse>>> getPublicSubjects() {
        List<SubjectResponse> subjects = subjectService.getPublicSubjects();
        return ResponseEntity.ok(ApiResponse.<List<SubjectResponse>>builder()
                .success(true)
                .message("Public subjects retrieved successfully")
                .data(subjects)
                .build());
    }

    @PostMapping("/custom")
    public ResponseEntity<ApiResponse<SubjectResponse>> createCustomSubject(
            @Valid @RequestBody CreateCustomSubjectRequest request,
            Principal principal) {
        try {
            SubjectResponse data = subjectService.createCustomSubject(request, principal.getName());
            return ResponseEntity.ok(ApiResponse.success(data, "Custom subject created successfully"));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(ApiResponse.error(e.getReason()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.error(e.getMessage()));
        }
    }
}
