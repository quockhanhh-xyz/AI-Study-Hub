package com.demo.ai_study_hub.controller;

import com.demo.ai_study_hub.dto.*;
import com.demo.ai_study_hub.entity.User;
import com.demo.ai_study_hub.repository.UserRepository;
import com.demo.ai_study_hub.service.PaymentService;
import com.demo.ai_study_hub.service.PlanService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;
    private final PlanService planService;
    private final UserRepository userRepository;

    @GetMapping("/plans")
    public ResponseEntity<ApiResponse<List<PlanResponse>>> getPlans() {
        return ResponseEntity.ok(ApiResponse.success(
                planService.getAllPlans(), "Billing plans retrieved successfully"));
    }

    @PostMapping("/mock/create")
    public ResponseEntity<ApiResponse<PaymentResponse>> createPayment(
            @Valid @RequestBody CreatePaymentRequest request,
            Principal principal) {
        try {
            User user = getUser(principal);
            PaymentResponse response = paymentService.createMockPayment(user, request.getPlanCode());
            return ResponseEntity.ok(ApiResponse.success(response, "Mock payment order created successfully"));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(ApiResponse.error(e.getReason()));
        }
    }

    @PostMapping("/mock/{paymentId}/success")
    public ResponseEntity<ApiResponse<PaymentResponse>> confirmSuccess(
            @PathVariable Long paymentId,
            Principal principal) {
        try {
            User user = getUser(principal);
            PaymentResponse response = paymentService.markPaymentSuccess(user, paymentId);
            return ResponseEntity.ok(ApiResponse.success(response,
                    "Payment confirmed successfully"));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(ApiResponse.error(e.getReason()));
        }
    }

    @PostMapping("/mock/{paymentId}/fail")
    public ResponseEntity<ApiResponse<PaymentResponse>> confirmFail(
            @PathVariable Long paymentId,
            Principal principal) {
        try {
            User user = getUser(principal);
            PaymentResponse response = paymentService.markPaymentFailed(user, paymentId);
            return ResponseEntity.ok(ApiResponse.success(response,
                    "Payment marked as failed"));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(ApiResponse.error(e.getReason()));
        }
    }

    @PostMapping("/mock/{paymentId}/cancel")
    public ResponseEntity<ApiResponse<PaymentResponse>> cancelPayment(
            @PathVariable Long paymentId,
            Principal principal) {
        try {
            User user = getUser(principal);
            PaymentResponse response = paymentService.cancelPayment(user, paymentId);
            return ResponseEntity.ok(ApiResponse.success(response,
                    "Payment cancelled successfully"));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(ApiResponse.error(e.getReason()));
        }
    }

    @GetMapping("/my")
    public ResponseEntity<ApiResponse<List<PaymentResponse>>> getMyPayments(Principal principal) {
        try {
            User user = getUser(principal);
            List<PaymentResponse> response = paymentService.getMyPayments(user);
            return ResponseEntity.ok(ApiResponse.success(response, "Payment history retrieved successfully"));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(ApiResponse.error(e.getReason()));
        }
    }

    private User getUser(Principal principal) {
        return userRepository.findByEmail(principal.getName())
                .orElseThrow(() -> new ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "User not found"));
    }
}
