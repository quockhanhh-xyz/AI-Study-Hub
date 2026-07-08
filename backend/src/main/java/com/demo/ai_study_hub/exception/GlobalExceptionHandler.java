package com.demo.ai_study_hub.exception;

import com.demo.ai_study_hub.dto.ApiResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidationException(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(error -> error.getDefaultMessage())
                .orElse("Validation failed");

        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.error(message));
    }

    @ExceptionHandler(PaymentException.class)
    @SuppressWarnings("unchecked")
    public ResponseEntity<ApiResponse<Object>> handlePaymentException(PaymentException ex) {
        return ResponseEntity.status(ex.getStatusCode())
                .body(ApiResponse.builder()
                        .success(false)
                        .code(ex.getCode())
                        .message(ex.getReason())
                        .data(ex.getData())
                        .build());
    }

    @ExceptionHandler(org.springframework.web.server.ResponseStatusException.class)
    public ResponseEntity<ApiResponse<Void>> handleResponseStatusException(
            org.springframework.web.server.ResponseStatusException ex) {
        String code = null;
        if (ex instanceof QuotaExceededException qe) {
            code = qe.getCode();
        } else {
            int status = ex.getStatusCode().value();
            if (status == 429) {
                code = "AI_PROVIDER_RATE_LIMITED";
            } else if (status == 401 || status == 403) {
                code = "AI_PROVIDER_AUTH_FAILED";
            } else if (status == 504 || status == 408) {
                code = "AI_PROVIDER_TIMEOUT";
            } else if (status == 400) {
                code = "AI_PROVIDER_BAD_REQUEST";
            } else if (status == 503 || status == 502) {
                code = "AI_PROVIDER_UNAVAILABLE";
            }
        }
        return ResponseEntity.status(ex.getStatusCode())
                .body(ApiResponse.<Void>builder()
                        .success(false)
                        .code(code)
                        .message(ex.getReason())
                        .data(null)
                        .build());
    }
}