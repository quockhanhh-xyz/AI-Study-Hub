package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.*;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserDetailsServiceImpl implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        return userRepository.findByEmail(email)
                .map(user -> {
                    String role = user.getRole();
                    if (role != null) {
                        role = role.toUpperCase();
                        if (role.startsWith("ROLE_")) {
                            role = role.substring(5);
                        }
                    } else {
                        role = "USER";
                    }
                    return org.springframework.security.core.userdetails.User
                            .withUsername(user.getEmail())
                            .password(user.getPasswordHash())
                            .roles(role)
                            .build();
                })
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + email));
    }
}
