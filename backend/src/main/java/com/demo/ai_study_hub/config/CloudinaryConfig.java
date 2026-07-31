package com.demo.ai_study_hub.config;

import com.cloudinary.Cloudinary;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Map;

@Configuration
public class CloudinaryConfig {

    @Value("${cloudinary.cloud-name:}")
    private String cloudName;

    @Value("${cloudinary.api-key:}")
    private String apiKey;

    @Value("${cloudinary.api-secret:}")
    private String apiSecret;

    @Value("${cloudinary.enabled:false}")
    private boolean enabled;

    @Bean
    public Cloudinary cloudinary() {
        if (!enabled || cloudName.isEmpty() || apiKey.isEmpty() || apiSecret.isEmpty()) {
            // Return a placeholder client so the app can start without Cloudinary credentials.
            return new Cloudinary(Map.of(
                    "cloud_name", "placeholder",
                    "api_key", "placeholder",
                    "api_secret", "placeholder"
            ));
        }
        return new Cloudinary(Map.of(
                "cloud_name", cloudName,
                "api_key", apiKey,
                "api_secret", apiSecret,
                "secure", true
        ));
    }
}
