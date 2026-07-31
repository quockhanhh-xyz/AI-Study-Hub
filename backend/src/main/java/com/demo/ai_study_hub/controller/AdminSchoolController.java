package com.demo.ai_study_hub.controller;

import com.demo.ai_study_hub.dto.ApiResponse;
import com.demo.ai_study_hub.dto.MajorDto;
import com.demo.ai_study_hub.dto.SchoolDto;
import com.demo.ai_study_hub.service.SchoolService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminSchoolController {

    private final SchoolService schoolService;

    // --- Admin School Endpoints ---

    @GetMapping("/schools")
    public ResponseEntity<ApiResponse<List<SchoolDto>>> getAllSchools(
            @RequestParam(value = "keyword", required = false) String keyword,
            @RequestParam(value = "status", required = false) String status
    ) {
        List<SchoolDto> list = schoolService.getAllSchools(keyword, status);
        return ResponseEntity.ok(ApiResponse.success(list, "Schools retrieved successfully"));
    }

    @PostMapping("/schools")
    public ResponseEntity<ApiResponse<SchoolDto>> createSchool(@Valid @RequestBody SchoolDto dto) {
        SchoolDto created = schoolService.createSchool(dto);
        return ResponseEntity.ok(ApiResponse.success(created, "School created successfully"));
    }

    @PutMapping("/schools/{id}")
    public ResponseEntity<ApiResponse<SchoolDto>> updateSchool(
            @PathVariable Integer id,
            @Valid @RequestBody SchoolDto dto
    ) {
        SchoolDto updated = schoolService.updateSchool(id, dto);
        return ResponseEntity.ok(ApiResponse.success(updated, "School updated successfully"));
    }

    @PatchMapping("/schools/{id}/status")
    public ResponseEntity<ApiResponse<SchoolDto>> patchSchoolStatus(
            @PathVariable Integer id,
            @RequestParam("status") String status
    ) {
        SchoolDto updated = schoolService.patchSchoolStatus(id, status);
        return ResponseEntity.ok(ApiResponse.success(updated, "School status updated successfully"));
    }

    // --- Admin Major Endpoints ---

    @GetMapping("/schools/{schoolId}/majors")
    public ResponseEntity<ApiResponse<List<MajorDto>>> getMajorsBySchool(
            @PathVariable Integer schoolId,
            @RequestParam(value = "status", required = false) String status
    ) {
        List<MajorDto> list = schoolService.getMajorsBySchool(schoolId, status);
        return ResponseEntity.ok(ApiResponse.success(list, "Majors retrieved successfully"));
    }

    @PostMapping("/schools/{schoolId}/majors")
    public ResponseEntity<ApiResponse<MajorDto>> createMajor(
            @PathVariable Integer schoolId,
            @Valid @RequestBody MajorDto dto
    ) {
        MajorDto created = schoolService.createMajor(schoolId, dto);
        return ResponseEntity.ok(ApiResponse.success(created, "Major created successfully"));
    }

    @PutMapping("/schools/{schoolId}/majors/{majorId}")
    public ResponseEntity<ApiResponse<MajorDto>> updateMajor(
            @PathVariable Integer schoolId,
            @PathVariable Integer majorId,
            @Valid @RequestBody MajorDto dto
    ) {
        MajorDto updated = schoolService.updateMajor(schoolId, majorId, dto);
        return ResponseEntity.ok(ApiResponse.success(updated, "Major updated successfully"));
    }

    @PatchMapping("/schools/{schoolId}/majors/{majorId}/status")
    public ResponseEntity<ApiResponse<MajorDto>> patchMajorStatus(
            @PathVariable Integer schoolId,
            @PathVariable Integer majorId,
            @RequestParam("status") String status
    ) {
        MajorDto updated = schoolService.patchMajorStatus(schoolId, majorId, status);
        return ResponseEntity.ok(ApiResponse.success(updated, "Major status updated successfully"));
    }
}
