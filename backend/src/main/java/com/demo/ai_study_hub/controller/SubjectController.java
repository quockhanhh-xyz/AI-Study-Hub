package com.demo.ai_study_hub.controller;

import com.demo.ai_study_hub.dto.ApiResponse;
import com.demo.ai_study_hub.dto.SubjectResponse;
import com.demo.ai_study_hub.service.SubjectService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/subjects")
@RequiredArgsConstructor
public class SubjectController {

    private final SubjectService subjectService;

    @GetMapping
    public ResponseEntity<?> getSubjects() {
        List<SubjectResponse> subjects = subjectService.getActiveSubjects();
        return ResponseEntity.ok(ApiResponse.builder()
                .success(true)
                .message("Subjects retrieved successfully")
                .data(subjects)
                .build());
    }
}