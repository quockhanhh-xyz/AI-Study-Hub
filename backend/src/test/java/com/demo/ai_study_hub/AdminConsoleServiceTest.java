package com.demo.ai_study_hub;

import com.demo.ai_study_hub.service.*;
import com.demo.ai_study_hub.dto.*;
import com.demo.ai_study_hub.entity.*;
import com.demo.ai_study_hub.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminConsoleServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private DocumentRepository documentRepository;

    @Mock
    private PaymentOrderRepository paymentOrderRepository;

    @Mock
    private AiUsageLogRepository aiUsageLogRepository;

    @Mock
    private SubjectRepository subjectRepository;

    @InjectMocks
    private AdminUserService adminUserService;

    @InjectMocks
    private AdminPaymentService adminPaymentService;

    @InjectMocks
    private AdminAiUsageService adminAiUsageService;

    @InjectMocks
    private AdminSubjectService adminSubjectService;

    private User sampleUser;

    @BeforeEach
    void setUp() {
        sampleUser = new User();
        sampleUser.setUserId(1);
        sampleUser.setEmail("test@domain.com");
        sampleUser.setFullName("Test User");
        sampleUser.setRole("USER");
        sampleUser.setTier(com.demo.ai_study_hub.enums.UserTier.FREE);
        sampleUser.setStatus("ACTIVE");
    }

    // =========================================================================================
    // AdminUserService Tests
    // =========================================================================================

    @Test
    void testGetUsers_ReturnsPage() {
        Page<User> userPage = new PageImpl<>(List.of(sampleUser));
        when(userRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(userPage);
        when(documentRepository.countByOwner(sampleUser)).thenReturn(5L);

        AdminUserListResponse response = adminUserService.getUsers("test", "USER", "FREE", "ACTIVE", PageRequest.of(0, 10));

        assertNotNull(response);
        assertEquals(1, response.getUsers().size());
        assertEquals("test@domain.com", response.getUsers().get(0).getEmail());
        assertEquals(5, response.getUsers().get(0).getDocumentCount());
    }

    @Test
    void testUpdateUserStatus_Success() {
        when(userRepository.findById(1)).thenReturn(Optional.of(sampleUser));
        when(userRepository.save(any(User.class))).thenReturn(sampleUser);

        AdminUserItem result = adminUserService.updateUserStatus(1, "BLOCKED", 999);

        assertNotNull(result);
        assertEquals("BLOCKED", result.getStatus());
        verify(userRepository).save(sampleUser);
    }

    @Test
    void testUpdateUserStatus_SelfBlock_ThrowsException() {
        RuntimeException exception = assertThrows(RuntimeException.class, () -> {
            adminUserService.updateUserStatus(1, "BLOCKED", 1);
        });
        assertEquals("Cannot block/unblock yourself", exception.getMessage());
    }

    @Test
    void testExportUsers() {
        when(userRepository.findAll(any(Specification.class))).thenReturn(List.of(sampleUser));
        when(documentRepository.countByOwner(sampleUser)).thenReturn(5L);

        byte[] excelBytes = adminUserService.exportUsers(null, null, null, null);

        assertNotNull(excelBytes);
        assertTrue(excelBytes.length > 0);
    }

    // =========================================================================================
    // AdminPaymentService Tests
    // =========================================================================================

    @Test
    void testGetPayments_ReturnsPage() {
        PaymentOrder payment = new PaymentOrder();
        payment.setPaymentId(100L);
        payment.setUser(sampleUser);
        payment.setPlanCode("PRO");
        payment.setStatus("COMPLETED");

        Page<PaymentOrder> paymentPage = new PageImpl<>(List.of(payment));
        when(paymentOrderRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(paymentPage);

        AdminPaymentListResponse response = adminPaymentService.getPayments(null, null, null, null, null, null, PageRequest.of(0, 10));

        assertNotNull(response);
        assertEquals(1, response.getPayments().size());
        assertEquals(100L, response.getPayments().get(0).getPaymentId());
        assertEquals("PRO", response.getPayments().get(0).getPlanCode());
    }

    // =========================================================================================
    // AdminAiUsageService Tests
    // =========================================================================================

    @Test
    void testGetAiUsages_ReturnsPage() {
        AiUsageLog usageLog = new AiUsageLog();
        usageLog.setUsageId(200L);
        usageLog.setUser(sampleUser);
        usageLog.setRequestType("AI_QA");
        usageLog.setInputTokens(10);
        usageLog.setOutputTokens(20);
        usageLog.setTotalTokens(30);

        Page<User> userPage = new PageImpl<>(List.of(sampleUser));
        when(userRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(userPage);
        when(aiUsageLogRepository.findAll(any(Specification.class))).thenReturn(List.of(usageLog));

        AdminAiUsageListResponse response = adminAiUsageService.getAiUsages(null, null, null, null, null, PageRequest.of(0, 10));

        assertNotNull(response);
        assertEquals(1, response.getUsages().size());
        assertEquals("test@domain.com", response.getUsages().get(0).getUserEmail());
    }

    // =========================================================================================
    // AdminSubjectService Tests
    // =========================================================================================

    @Test
    void testGetSystemSubjects_ReturnsPage() {
        Subject subject = new Subject();
        subject.setSubjectId(50);
        subject.setSubjectName("System Subject");
        subject.setStatus("ACTIVE");

        Page<Subject> subjectPage = new PageImpl<>(List.of(subject));
        when(subjectRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(subjectPage);

        AdminSubjectListResponse response = adminSubjectService.getSystemSubjects(null, null, PageRequest.of(0, 10));

        assertNotNull(response);
        assertEquals(1, response.getSubjects().size());
        assertEquals("System Subject", response.getSubjects().get(0).getSubjectName());
    }

    @Test
    void testCreateSubject_Success() {
        AdminSubjectRequest request = new AdminSubjectRequest();
        request.setSubjectName("New Subject");
        request.setDescription("Desc");

        Subject savedSubject = new Subject();
        savedSubject.setSubjectId(10);
        savedSubject.setSubjectName("New Subject");

        when(subjectRepository.save(any(Subject.class))).thenReturn(savedSubject);

        AdminSubjectItem item = adminSubjectService.createSubject(request);

        assertNotNull(item);
        assertEquals(10, item.getSubjectId());
        assertEquals("New Subject", item.getSubjectName());
    }

    @Test
    void testUpdateSubjectStatus_Success() {
        Subject subject = new Subject();
        subject.setSubjectId(10);
        subject.setStatus("ACTIVE");

        when(subjectRepository.findById(10)).thenReturn(Optional.of(subject));
        when(subjectRepository.save(any(Subject.class))).thenReturn(subject);

        AdminSubjectItem item = adminSubjectService.updateSubjectStatus(10, "INACTIVE");

        assertNotNull(item);
        assertEquals("INACTIVE", item.getStatus());
        verify(subjectRepository).save(subject);
    }
}
