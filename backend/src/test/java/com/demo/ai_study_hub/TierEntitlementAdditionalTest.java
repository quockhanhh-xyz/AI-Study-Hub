package com.demo.ai_study_hub;

import com.demo.ai_study_hub.config.AiProperties;
import com.demo.ai_study_hub.dto.TierLimits;
import com.demo.ai_study_hub.enums.UserTier;
import com.demo.ai_study_hub.entity.User;
import com.demo.ai_study_hub.repository.AiUsageLogRepository;
import com.demo.ai_study_hub.service.TierPolicyService;
import com.demo.ai_study_hub.service.UsageService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class TierEntitlementAdditionalTest {

    @Mock
    private AiUsageLogRepository aiUsageLogRepository;

    @InjectMocks
    private UsageService usageService;

    @Test
    void testUltraTierLimits() {
        AiProperties properties = new AiProperties();
        properties.setProvider("gemini");
        properties.getGemini().setUltraModel("gemini-2.5-flash");

        TierPolicyService policyService = new TierPolicyService(properties);
        TierLimits limits = policyService.getLimits(UserTier.ULTRA);

        assertEquals(200, limits.aiQuestionsPerDay());
        assertEquals(15, limits.maxContextChunks());
        assertEquals(3000, limits.maxOutputTokens());
        assertEquals("gemini-2.5-flash", limits.aiModel());
        assertEquals(100L * 1024 * 1024, limits.maxFileBytes());
    }

    @Test
    void testAsiaHoChiMinhDailyQuotaResetBoundary() {
        User user = new User();
        user.setUserId(123);

        ArgumentCaptor<LocalDateTime> captor = ArgumentCaptor.forClass(LocalDateTime.class);
        when(aiUsageLogRepository.countSuccessfulQuestionsAfter(eq(123), captor.capture())).thenReturn(0L);

        // Run counting
        usageService.countAiQuestionsToday(user);

        LocalDateTime capturedValue = captor.getValue();
        assertNotNull(capturedValue);

        // Get expected time in local timezone of JVM:
        ZonedDateTime nowHcm = ZonedDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh"));
        ZonedDateTime startOfHcmDay = nowHcm.toLocalDate().atStartOfDay(ZoneId.of("Asia/Ho_Chi_Minh"));
        LocalDateTime expectedLocal = startOfHcmDay.withZoneSameInstant(ZoneId.systemDefault()).toLocalDateTime();

        // The captured value must be extremely close to the expected value (allow minor drift if date changed during execution, but normally they match exactly)
        long diffSeconds = Math.abs(Duration.between(capturedValue, expectedLocal).toSeconds());
        assertTrue(diffSeconds < 2, "Daily quota reset timestamp should match Asia/Ho_Chi_Minh start of day mapped to system timezone");
    }
}
