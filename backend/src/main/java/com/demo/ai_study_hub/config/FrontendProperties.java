package com.demo.ai_study_hub.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "frontend")
@Getter
@Setter
public class FrontendProperties {
    /** VNPay return redirect page URL. */
    private String paymentResultUrl = "";

    /**
     * Frontend application base URL (e.g. https://your-domain.com).
     * Used to build joinUrl for group invite emails.
     * Configured via FRONTEND_BASE_URL env var.
     */
    private String baseUrl = "";
}