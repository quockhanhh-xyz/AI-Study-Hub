package com.demo.ai_study_hub.controller;

import com.demo.ai_study_hub.dto.AppealRequest;
import com.demo.ai_study_hub.dto.AppealResponse;
import com.demo.ai_study_hub.entity.Appeal;
import com.demo.ai_study_hub.repository.AppealRepository;
import com.demo.ai_study_hub.service.EmailService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
public class AppealController {

    @Autowired
    private AppealRepository appealRepository;

    @Autowired
    private EmailService emailService;

    // Public endpoint to submit appeal
    @PostMapping("/auth/appeal")
    public ResponseEntity<?> submitAppeal(@RequestBody AppealRequest request) {
        if (request.getEmail() == null || request.getEmail().trim().isEmpty() ||
            request.getFullName() == null || request.getFullName().trim().isEmpty() ||
            request.getMessage() == null || request.getMessage().trim().isEmpty()) {
            Map<String, String> err = new HashMap<>();
            err.put("error", "All fields (email, fullName, message) are required.");
            return ResponseEntity.badRequest().body(err);
        }

        Appeal appeal = new Appeal(request.getEmail().trim(), request.getFullName().trim(), request.getMessage().trim());
        appealRepository.save(appeal);

        Map<String, Object> resp = new HashMap<>();
        resp.put("success", true);
        resp.put("message", "Appeal submitted successfully. Admin will review and reply via email.");
        return ResponseEntity.ok(resp);
    }

    // Admin endpoint to list all appeals
    @GetMapping("/admin/appeals")
    public ResponseEntity<List<AppealResponse>> listAppeals() {
        List<Appeal> appeals = appealRepository.findAllByOrderByCreatedAtDesc();
        List<AppealResponse> responses = appeals.stream()
                .map(AppealResponse::new)
                .collect(Collectors.toList());
        return ResponseEntity.ok(responses);
    }

    // Admin endpoint to respond to an appeal and send email
    @PostMapping("/admin/appeals/{id}/respond")
    public ResponseEntity<?> respondToAppeal(@PathVariable Integer id, @RequestBody Map<String, String> body) {
        String adminReply = body.get("adminReply");
        if (adminReply == null || adminReply.trim().isEmpty()) {
            Map<String, String> err = new HashMap<>();
            err.put("error", "adminReply content is required.");
            return ResponseEntity.badRequest().body(err);
        }

        Appeal appeal = appealRepository.findById(id).orElse(null);
        if (appeal == null) {
            Map<String, String> err = new HashMap<>();
            err.put("error", "Appeal not found.");
            return ResponseEntity.status(404).body(err);
        }

        // Send email
        emailService.sendAppealResponseEmail(appeal.getEmail(), appeal.getFullName(), adminReply.trim());

        // Update status to RESOLVED
        appeal.setStatus("RESOLVED");
        appealRepository.save(appeal);

        Map<String, Object> resp = new HashMap<>();
        resp.put("success", true);
        resp.put("message", "Response email sent to " + appeal.getEmail() + " successfully.");
        return ResponseEntity.ok(resp);
    }
}
