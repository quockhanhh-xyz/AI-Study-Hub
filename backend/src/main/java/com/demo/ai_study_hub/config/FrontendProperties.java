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
    private String paymentResultUrl = "";
}