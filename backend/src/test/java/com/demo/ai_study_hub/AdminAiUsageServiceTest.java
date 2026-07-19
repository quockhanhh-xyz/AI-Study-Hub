package com.demo.ai_study_hub;

import com.demo.ai_study_hub.dto.AdminAiUsageListResponse;
import com.demo.ai_study_hub.entity.User;
import com.demo.ai_study_hub.repository.AiUsageLogRepository;
import com.demo.ai_study_hub.repository.UserRepository;
import com.demo.ai_study_hub.service.AdminAiUsageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminAiUsageServiceTest {

    @Mock
    private AiUsageLogRepository aiUsageLogRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private AdminAiUsageService adminAiUsageService;

    @Test
    void getAiUsages_Success() {
        User u = new User();
        u.setUserId(1);
        u.setEmail("test@test.com");

        Page<User> page = new PageImpl<>(Collections.singletonList(u));

        when(userRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(page);

        // When mapping to item, it might call aiUsageLogRepository, but if the user has no logs, it just returns 0
        // We can just mock the count/find methods if they are called inside mapToItem.
        // Wait, mapToItem uses aiUsageLogRepository.countSuccessfulLogsByTypeAfter, but the test might fail if it's not mocked?
        // Actually, they will just return 0 (default for primitive long/int mock).

        AdminAiUsageListResponse res = adminAiUsageService.getAiUsages(null, null, "AI_QA", null, null, PageRequest.of(0, 10));

        assertNotNull(res);
        assertNotNull(res.getUsages());
    }
}
