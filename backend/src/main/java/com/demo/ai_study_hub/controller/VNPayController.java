package com.demo.ai_study_hub.controller;

import com.demo.ai_study_hub.config.VNPayProperties;
import com.demo.ai_study_hub.dto.ApiResponse;
import com.demo.ai_study_hub.dto.CreateVNPayPaymentRequest;
import com.demo.ai_study_hub.dto.PaymentResponse;
import com.demo.ai_study_hub.entity.PaymentOrder;
import com.demo.ai_study_hub.entity.User;
import com.demo.ai_study_hub.exception.PaymentException;
import com.demo.ai_study_hub.repository.UserRepository;
import com.demo.ai_study_hub.service.PaymentService;
import com.demo.ai_study_hub.service.VNPayIpnService;
import com.demo.ai_study_hub.service.VNPayService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.security.Principal;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/payments/vnpay")
@RequiredArgsConstructor
public class VNPayController {

    private final VNPayService vnPayService;
    private final VNPayIpnService vnPayIpnService;
    private final PaymentService paymentService;
    private final VNPayProperties vnPayProperties;
    private final UserRepository userRepository;

    @PostMapping("/create")
    public ResponseEntity<ApiResponse<PaymentResponse>> createVNPayPayment(
            @Valid @RequestBody CreateVNPayPaymentRequest request,
            HttpServletRequest httpRequest,
            Principal principal) {

        if (!vnPayProperties.isEnabled()) {
            throw new PaymentException(HttpStatus.BAD_REQUEST, "PAYMENT_PROVIDER_DISABLED",
                    "VNPay payment provider is disabled.", Map.of("provider", "VNPAY_SANDBOX"));
        }
        if (!vnPayService.isValidBankCode(request.getBankCode())) {
            throw new PaymentException(HttpStatus.BAD_REQUEST, "INVALID_BANK_CODE",
                    "The provided bank code is not supported.");
        }

        User user = getUser(principal);
        PaymentOrder order = paymentService.createVNPayOrder(user, request.getPlanCode());

        String paymentUrl;
        String txnRef;
        PaymentResponse response;
        try {
            txnRef = vnPayService.generateTxnRef(order.getPaymentId());
            String ip = extractClientIp(httpRequest);
            String orderInfo = "Payment for order " + order.getPaymentId();

            paymentUrl = vnPayService.buildPaymentUrl(
                    txnRef, order.getAmount(), orderInfo, ip,
                    request.getBankCode(), "vn", order.getExpiredAt());

            response = paymentService.attachPaymentUrl(order.getPaymentId(), paymentUrl, txnRef);
        } catch (Exception e) {
            // The order row already exists (PENDING) at this point. If URL/
            // signature generation blows up, it must NOT be left dangling —
            // that would silently block the user from creating a new order
            // for 15 minutes with no way to pay. Mark it FAILED immediately
            // and surface a clean error instead.
            paymentService.markOrderFailed(order.getPaymentId());
            throw new PaymentException(HttpStatus.INTERNAL_SERVER_ERROR, "VNPAY_URL_GENERATION_FAILED",
                    "Failed to create VNPay payment URL. Please try again.");
        }

        return ResponseEntity.ok(ApiResponse.success(response, "Payment order created successfully"));
    }

    /** Public — browser redirect. Verifies checksum and processes payment callback (may update DB). */
    @GetMapping("/return")
    public ResponseEntity<Void> handleReturn(@RequestParam Map<String, String> allParams) {
        String redirectUrl = vnPayIpnService.handleReturn(allParams);
        return ResponseEntity.status(HttpStatus.FOUND)
                .header("Location", redirectUrl)
                .build();
    }

    /** Public — server-to-server. This is the source of truth for finalizing payments. */
    @GetMapping("/ipn")
    public ResponseEntity<Map<String, String>> handleIpn(@RequestParam Map<String, String> allParams) {
        try {
            Map<String, String> result = vnPayIpnService.handleIpn(allParams);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            Map<String, String> body = new HashMap<>();
            body.put("RspCode", "99");
            body.put("Message", "Unknown error");
            return ResponseEntity.ok(body);
        }
    }

    @PostMapping("/confirm-return")
    public ResponseEntity<ApiResponse<PaymentResponse>> confirmReturn(@RequestBody Map<String, String> allParams) {
        PaymentOrder order = vnPayIpnService.processVnpayCallback(allParams, "RETURN_CONFIRM");
        PaymentResponse response = paymentService.mapToResponse(order);
        return ResponseEntity.ok(ApiResponse.success(response, "VNPay payment confirm-return processed successfully"));
    }

    private String extractClientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            return xff.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private User getUser(Principal principal) {
        return userRepository.findByEmail(principal.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }
}