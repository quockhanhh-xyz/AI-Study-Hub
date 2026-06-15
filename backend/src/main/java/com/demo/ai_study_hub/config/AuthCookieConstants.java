package com.demo.ai_study_hub.config;

public final class AuthCookieConstants {

    private AuthCookieConstants() {}

    public static final String COOKIE_NAME = "accessToken";
    public static final boolean COOKIE_SECURE = Boolean.parseBoolean(
            System.getenv().getOrDefault("COOKIE_SECURE", "false")
    );
}
