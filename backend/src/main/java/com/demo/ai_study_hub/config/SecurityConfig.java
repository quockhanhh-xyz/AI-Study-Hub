package com.demo.ai_study_hub.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;
    private final CorsConfig corsConfig;
    private final JwtAuthenticationEntryPoint jwtAuthenticationEntryPoint;
    private final CustomAccessDeniedHandler customAccessDeniedHandler;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfig.corsConfigurationSource()))
                .csrf(csrf -> csrf.disable())
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(org.springframework.http.HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        .requestMatchers("/swagger-ui/**", "/v3/api-docs/**").permitAll()
                        .requestMatchers("/api/auth/me").authenticated()
                        .requestMatchers("/api/auth/**").permitAll()
                        .requestMatchers("/api/documents/public", "/api/documents/public/**").permitAll()
                        .requestMatchers("/api/subjects/public").permitAll()
                        .requestMatchers("/api/payments/plans/**").permitAll()
                        // Step 13B: only these VNPay endpoints are public — never /vnpay/** wholesale.
                        .requestMatchers("/api/payments/vnpay/return").permitAll()
                        .requestMatchers("/api/payments/vnpay/ipn").permitAll()
                        .requestMatchers("/api/payments/vnpay/confirm-return").permitAll()
                        .requestMatchers("/api/health").permitAll()
                        .requestMatchers("/error").permitAll()
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/public/documents/*/ratings/summary").permitAll()
                        .requestMatchers("/api/public/documents/*/ratings/**").authenticated()
                        .requestMatchers("/api/public/documents/*/reports/**").authenticated()
                        // User Workspace restrictions
                        .requestMatchers("/api/documents", "/api/documents/**").hasRole("USER")
                        .requestMatchers("/api/folders", "/api/folders/**").hasRole("USER")
                        .requestMatchers("/api/ai", "/api/ai/**").hasRole("USER")
                        .requestMatchers("/api/groups", "/api/groups/**").hasRole("USER")
                        .requestMatchers("/api/trash", "/api/trash/**").hasRole("USER")
                        // Account-level self settings (profile, avatar, password) accessible to both USER and ADMIN
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/account/profile").authenticated()
                        .requestMatchers(org.springframework.http.HttpMethod.PUT, "/api/account/profile").authenticated()
                        .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/account/avatar").authenticated()
                        .requestMatchers(org.springframework.http.HttpMethod.PUT, "/api/account/password").authenticated()
                        .requestMatchers("/api/account/entitlements", "/api/account/usage").hasRole("USER")
                        .requestMatchers("/api/account", "/api/account/**").hasRole("USER")
                        // Notifications (account-level personal data for authenticated principal)
                        .requestMatchers("/api/notifications", "/api/notifications/**").authenticated()
                        .requestMatchers("/api/payments", "/api/payments/**").hasRole("USER")
                        .requestMatchers("/api/subject-requests", "/api/subject-requests/**").hasRole("USER")
                        .anyRequest().authenticated()
                )
                .exceptionHandling(exception -> exception
                        .authenticationEntryPoint(jwtAuthenticationEntryPoint)
                        .accessDeniedHandler(customAccessDeniedHandler)
                )
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config)
            throws Exception {
        return config.getAuthenticationManager();
    }
}
