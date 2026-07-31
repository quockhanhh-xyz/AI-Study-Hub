package com.demo.ai_study_hub.controller;

import com.demo.ai_study_hub.dto.ApiResponse;
import com.demo.ai_study_hub.dto.MajorDto;
import com.demo.ai_study_hub.dto.SchoolDto;
import com.demo.ai_study_hub.service.SchoolService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/schools")
@RequiredArgsConstructor
public class SchoolController {

    private final SchoolService schoolService;

    @GetMapping("")
    public ResponseEntity<ApiResponse<List<SchoolDto>>> getActiveSchools(
            @RequestParam(value = "keyword", required = false) String keyword
    ) {
        List<SchoolDto> list = schoolService.getAllSchools(keyword, "ACTIVE");
        return ResponseEntity.ok(ApiResponse.success(list, "Active schools retrieved successfully"));
    }

    @GetMapping("/{schoolId}/majors")
    public ResponseEntity<ApiResponse<List<MajorDto>>> getActiveMajors(
            @PathVariable Integer schoolId
    ) {
        List<MajorDto> list = schoolService.getMajorsBySchool(schoolId, "ACTIVE");
        return ResponseEntity.ok(ApiResponse.success(list, "Active majors retrieved successfully"));
    }
}
