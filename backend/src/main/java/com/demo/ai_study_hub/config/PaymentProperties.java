package com.demo.ai_study_hub.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "payment")
@Getter
@Setter
public class PaymentProperties {
    /** When false, ALL mock endpoints (create/success/fail/cancel) are blocked. */
    private boolean mockEnabled = true;
}