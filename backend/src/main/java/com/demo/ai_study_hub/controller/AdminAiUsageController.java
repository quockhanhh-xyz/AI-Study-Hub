package com.demo.ai_study_hub.controller;

import com.demo.ai_study_hub.dto.ApiResponse;
import com.demo.ai_study_hub.dto.AdminAiUsageListResponse;
import com.demo.ai_study_hub.service.AdminAiUsageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/admin/ai-usage")
public class AdminAiUsageController {

    @Autowired
    private AdminAiUsageService adminAiUsageService;

    @GetMapping
    public ResponseEntity<ApiResponse<AdminAiUsageListResponse>> getAiUsages(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String tier,
            @RequestParam(required = false) String feature,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String direction
    ) {
        Sort sort = direction.equalsIgnoreCase(Sort.Direction.ASC.name()) ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(page, size, sort);
        AdminAiUsageListResponse response = adminAiUsageService.getAiUsages(search, tier, feature, startDate, endDate, pageable);
        return ResponseEntity.ok(ApiResponse.success(response, "AI usages retrieved successfully"));
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> exportAiUsages(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String tier,
            @RequestParam(required = false) String feature,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate
    ) {
        byte[] data = adminAiUsageService.exportAiUsage(search, tier, feature, startDate, endDate);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
        headers.setContentDispositionFormData("attachment", "ai_usages.xlsx");
        return ResponseEntity.ok().headers(headers).body(data);
    }
}
