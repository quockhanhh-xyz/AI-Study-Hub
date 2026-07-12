package com.demo.ai_study_hub.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * Request body for POST /api/ai/documents/{documentId}/ask
 */
@Data
public class AiAskRequest {

    /**
     * The user's question about the document.
     * Must be non-blank. Character length limit is enforced in service
     * based on user tier (FREE: 500, PREMIUM: 2000, ULTRA: 5000).
     */
    @NotBlank(message = "Question must not be blank")
    private String question;
}
