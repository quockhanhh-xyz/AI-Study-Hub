package com.demo.ai_study_hub;

import com.demo.ai_study_hub.dto.AdminUserDetail;
import com.demo.ai_study_hub.dto.AdminUserListResponse;
import com.demo.ai_study_hub.dto.AdminAiUsageItem;
import com.demo.ai_study_hub.dto.AdminPaymentItem;
import com.demo.ai_study_hub.dto.AdminUserDetail;
import com.demo.ai_study_hub.dto.AdminUserListResponse;
import com.demo.ai_study_hub.entity.PaymentOrder;
import com.demo.ai_study_hub.entity.User;
import com.demo.ai_study_hub.repository.DocumentRepository;
import com.demo.ai_study_hub.repository.PaymentOrderRepository;
import com.demo.ai_study_hub.repository.UserRepository;
import com.demo.ai_study_hub.service.AdminAiUsageService;
import com.demo.ai_study_hub.service.AdminUserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminUserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private DocumentRepository documentRepository;

    @Mock
    private AdminAiUsageService adminAiUsageService;

    @Mock
    private com.demo.ai_study_hub.service.TierPolicyService tierPolicyService;

    @Mock
    private PaymentOrderRepository paymentOrderRepository;

    @Mock
    private com.demo.ai_study_hub.service.UsageService usageService;

    @InjectMocks
    private AdminUserService adminUserService;

    private User user;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setUserId(1);
        user.setEmail("test@test.com");
        user.setRole("USER");
        user.setStatus("ACTIVE");
    }

    @Test
    void mapToDetail_IncludesAiUsageAndPayments() {
        AdminAiUsageItem aiUsageItem = new AdminAiUsageItem();
        aiUsageItem.setTotalAiRequests(10);
        aiUsageItem.setAiQaUsed(30);

        PaymentOrder payment = new PaymentOrder();
        payment.setPaymentId(1L);
        payment.setPlanCode("PREMIUM");
        payment.setAmount(100000L);
        payment.setStatus("00");

        when(adminAiUsageService.mapUserToAiUsageItem(user))
                .thenReturn(aiUsageItem);

        when(paymentOrderRepository.findByUserOrderByCreatedAtDesc(user))
                .thenReturn(Collections.singletonList(payment));

        when(documentRepository.countByOwner(user)).thenReturn(5L);

        when(usageService.countAiQuestionsToday(user)).thenReturn(10L);

        com.demo.ai_study_hub.dto.TierLimits limits = new com.demo.ai_study_hub.dto.TierLimits(
            100L, 10, 10L, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, "mock", 10, 10, 10, 10, 10, 10
        );
        when(tierPolicyService.getLimitsForUser(user)).thenReturn(limits);

        when(userRepository.findById(1)).thenReturn(Optional.of(user));

        AdminUserDetail detail = adminUserService.getUserById(1);

        assertNotNull(detail);
        assertEquals("test@test.com", detail.getEmail());

        assertNotNull(detail.getAiUsage());
        assertEquals(30, detail.getAiUsage().getAiQaUsed());

        assertNotNull(detail.getPaymentHistory());
        assertEquals(1, detail.getPaymentHistory().size());
        assertEquals("PREMIUM", detail.getPaymentHistory().get(0).getPlanCode());
        assertEquals(100000L, detail.getPaymentHistory().get(0).getAmount());
    }
}
