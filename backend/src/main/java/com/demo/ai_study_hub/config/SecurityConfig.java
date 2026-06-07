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
    private final JwtAuthenticationEntryPoint jwtAuthenticationEntryPoint; // Chốt chặn lỗi 401 (JSON)
    private final CustomAccessDeniedHandler customAccessDeniedHandler;     // CHÍNH XÁC: Khai báo thêm chốt chặn lỗi 403 (JSON) Vào đây

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfig.corsConfigurationSource()))
                .csrf(csrf -> csrf.disable())
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/auth/me", "/api/auth/logout").authenticated() // Yeu cau token cho me & logout
                        .requestMatchers("/api/auth/**").permitAll() // Cho phep Dang nhap/Dang ky
                        .requestMatchers("/api/health").permitAll()  // Cho phep kiem tra trang thai server
                        .anyRequest().authenticated() // Cac duong dan khac bat buoc phai co Token
                )
                // Phân đoạn cấu hình kích hoạt bẫy lỗi bảo mật toàn cục (Cả 401 và 403)
                .exceptionHandling(exception -> exception
                        .authenticationEntryPoint(jwtAuthenticationEntryPoint) // Bắt lỗi 401 (Chưa đăng nhập)
                        .accessDeniedHandler(customAccessDeniedHandler)       // CHÍNH XÁC: Bắt thêm lỗi 403 (Sai quyền/Role) vào đây
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