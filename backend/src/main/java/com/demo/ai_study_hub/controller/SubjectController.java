package com.demo.ai_study_hub.controller;

import com.demo.ai_study_hub.dto.ApiResponse;
import com.demo.ai_study_hub.dto.CreateCustomSubjectRequest;
import com.demo.ai_study_hub.dto.DocumentResponse;
import com.demo.ai_study_hub.dto.SubjectMyLibraryResponse;
import com.demo.ai_study_hub.dto.SubjectResponse;
import com.demo.ai_study_hub.service.SubjectService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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
    public ResponseEntity<ApiResponse<List<SubjectResponse>>> getSubjects(
            @RequestParam(required = false) Integer majorId,
            Principal principal) {
        List<SubjectResponse> subjects = subjectService.getActiveSubjects(principal.getName(), majorId);
        return ResponseEntity.ok(ApiResponse.<List<SubjectResponse>>builder()
                .success(true)
                .message("Subjects retrieved successfully")
                .data(subjects)
                .build());
    }

    @GetMapping("/public")
    public ResponseEntity<ApiResponse<List<SubjectResponse>>> getPublicSubjects(
            @RequestParam(required = false) Integer majorId) {
        List<SubjectResponse> subjects = subjectService.getPublicSubjects(majorId);
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

    @GetMapping("/my-library")
    public ResponseEntity<ApiResponse<List<SubjectMyLibraryResponse>>> getMyLibrarySubjects(Principal principal) {
        List<SubjectMyLibraryResponse> data = subjectService.getMyLibrarySubjects(principal.getName());
        return ResponseEntity.ok(ApiResponse.success(data, "My Library subjects retrieved successfully"));
    }

    @GetMapping("/{subjectId}/documents")
    public ResponseEntity<ApiResponse<Page<DocumentResponse>>> getSubjectDocuments(
            @PathVariable Integer subjectId,
            Principal principal,
            Pageable pageable) {
        Page<DocumentResponse> data = subjectService.getSubjectDocuments(subjectId, principal.getName(), pageable);
        return ResponseEntity.ok(ApiResponse.success(data, "Subject documents retrieved successfully"));
    }

    @PutMapping("/{subjectId}")
    public ResponseEntity<ApiResponse<SubjectMyLibraryResponse>> updateCustomSubject(
            @PathVariable Integer subjectId,
            @Valid @RequestBody CreateCustomSubjectRequest request,
            Principal principal) {
        try {
            SubjectMyLibraryResponse data = subjectService.updateCustomSubject(subjectId, request, principal.getName());
            return ResponseEntity.ok(ApiResponse.success(data, "Subject updated successfully"));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(ApiResponse.error(e.getReason()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.error(e.getMessage()));
        }
    }

    @DeleteMapping("/{subjectId}")
    public ResponseEntity<ApiResponse<Void>> deleteCustomSubject(
            @PathVariable Integer subjectId,
            Principal principal) {
        try {
            subjectService.deleteCustomSubject(subjectId, principal.getName());
            return ResponseEntity.ok(ApiResponse.success(null, "Subject deleted successfully"));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(ApiResponse.error(e.getReason()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.error(e.getMessage()));
        }
    }
}
