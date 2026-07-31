package com.demo.ai_study_hub.exception;

import org.springframework.http.HttpStatusCode;
import org.springframework.web.server.ResponseStatusException;

public class AiProviderException extends ResponseStatusException {
    private final String code;

    public AiProviderException(HttpStatusCode status, String reason, String code) {
        super(status, reason);
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}
