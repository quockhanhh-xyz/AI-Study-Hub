package com.demo.ai_study_hub.exception;

import org.springframework.http.HttpStatusCode;
import org.springframework.web.server.ResponseStatusException;

/**
 * Payment-domain exception carrying a machine-readable error code
 * (e.g. PAYMENT_ALREADY_PENDING, DOWNGRADE_NOT_SUPPORTED, INVALID_BANK_CODE).
 *
 * The optional `data` map lets callers attach extra context fields for the
 * error response body (e.g. paymentId/paymentProvider/paymentUrl for
 * PAYMENT_ALREADY_PENDING per the Step 13B contract).
 */
public class PaymentException extends ResponseStatusException {

    private final String code;
    private final Object data;

    public PaymentException(HttpStatusCode status, String code, String message) {
        this(status, code, message, null);
    }

    public PaymentException(HttpStatusCode status, String code, String message, Object data) {
        super(status, message);
        this.code = code;
        this.data = data;
    }

    public String getCode() {
        return code;
    }

    public Object getData() {
        return data;
    }
}