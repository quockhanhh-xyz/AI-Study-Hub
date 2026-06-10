package com.demo.ai_study_hub.controller;

import com.demo.ai_study_hub.dto.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class HealthController {

    @GetMapping("/health")
    public ResponseEntity<ApiResponse<Map<String, String>>> checkHealth() {
        Map<String, String> data = new HashMap<>();
        data.put("status", "UP");

        ApiResponse<Map<String, String>> response = ApiResponse.<Map<String, String>>builder()
                .success(true)
                .message("AI Study Hub backend is running")
                .data(data)
                .build();

        return ResponseEntity.ok(response);
    }
}
