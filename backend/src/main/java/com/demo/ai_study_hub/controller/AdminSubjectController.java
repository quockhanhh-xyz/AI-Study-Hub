package com.demo.ai_study_hub.controller;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import com.demo.ai_study_hub.dto.ApiResponse;
import com.demo.ai_study_hub.dto.AdminSubjectListResponse;
import com.demo.ai_study_hub.dto.AdminSubjectItem;
import com.demo.ai_study_hub.dto.AdminSubjectRequest;
import com.demo.ai_study_hub.dto.SubjectMappingResponse;
import com.demo.ai_study_hub.dto.SubjectMappingUpdateRequest;
import com.demo.ai_study_hub.service.AdminSubjectService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.List;

@RestController
@RequestMapping("/api/admin/subjects")
public class AdminSubjectController {

    @Autowired
    private AdminSubjectService adminSubjectService;

    @GetMapping
    public ResponseEntity<ApiResponse<AdminSubjectListResponse>> getSubjects(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Integer schoolId,
            @RequestParam(required = false) Integer majorId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "subjectCode") String sortBy,
            @RequestParam(defaultValue = "asc") String direction
    ) {
        page = Math.max(0, page);
        size = Math.min(Math.max(1, size), 100);
        java.util.List<String> validSorts = java.util.Arrays.asList("subjectId", "subjectCode", "subjectName", "status", "createdAt");
        if (!validSorts.contains(sortBy)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid sort field");
        }
        Sort sort = direction.equalsIgnoreCase(Sort.Direction.ASC.name()) ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(page, size, sort);
        AdminSubjectListResponse response = adminSubjectService.getSystemSubjects(
                search, status, schoolId, majorId, pageable);
        return ResponseEntity.ok(ApiResponse.success(response, "Subjects retrieved successfully"));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<AdminSubjectItem>> createSubject(@Valid @RequestBody AdminSubjectRequest request) {
        AdminSubjectItem created = adminSubjectService.createSubject(request);
        return ResponseEntity.ok(ApiResponse.success(created, "Subject created successfully"));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<AdminSubjectItem>> updateSubject(
            @PathVariable Integer id,
            @Valid @RequestBody AdminSubjectRequest request) {
        AdminSubjectItem updated = adminSubjectService.updateSubject(id, request);
        return ResponseEntity.ok(ApiResponse.success(updated, "Subject updated successfully"));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<AdminSubjectItem>> updateSubjectStatus(
            @PathVariable Integer id,
            @RequestBody Map<String, String> body) {
        String newStatus = body.get("status");
        if (newStatus == null || newStatus.isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Status is required"));
        }
        AdminSubjectItem updated = adminSubjectService.updateSubjectStatus(id, newStatus);
        return ResponseEntity.ok(ApiResponse.success(updated, "Subject status updated successfully"));
    }

    @GetMapping("/{id}/mappings")
    public ResponseEntity<ApiResponse<List<SubjectMappingResponse>>> getMappings(@PathVariable Integer id) {
        return ResponseEntity.ok(ApiResponse.success(
                adminSubjectService.getMappings(id),
                "Subject mappings retrieved successfully"
        ));
    }

    @PutMapping("/{id}/mappings")
    public ResponseEntity<ApiResponse<List<SubjectMappingResponse>>> replaceMappings(
            @PathVariable Integer id,
            @Valid @RequestBody SubjectMappingUpdateRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                adminSubjectService.replaceMappings(id, request.getMajorIds()),
                "Subject mappings updated successfully"
        ));
    }

    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getSubjectStats(
            @RequestParam(required = false) String search
    ) {
        Map<String, Long> stats = adminSubjectService.getSubjectStats(search);
        return ResponseEntity.ok(ApiResponse.success(stats, "Subject stats retrieved successfully"));
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> exportSubjects(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Integer schoolId,
            @RequestParam(required = false) Integer majorId
    ) {
        byte[] data = adminSubjectService.exportSubjects(search, status, schoolId, majorId);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
        headers.setContentDispositionFormData("attachment", "subjects.xlsx");
        return ResponseEntity.ok().headers(headers).body(data);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteSubject(@PathVariable Integer id) {
        try {
            adminSubjectService.deleteSubject(id);
            return ResponseEntity.ok(ApiResponse.success(null, "Subject deleted successfully"));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(ApiResponse.error(e.getReason()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.error(e.getMessage()));
        }
    }
}
