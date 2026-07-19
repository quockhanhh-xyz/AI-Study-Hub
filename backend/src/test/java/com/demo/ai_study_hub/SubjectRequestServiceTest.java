package com.demo.ai_study_hub;

import com.demo.ai_study_hub.dto.AdminSubjectRequest;
import com.demo.ai_study_hub.entity.Subject;
import com.demo.ai_study_hub.entity.SubjectRequest;
import com.demo.ai_study_hub.entity.User;
import com.demo.ai_study_hub.repository.SubjectRepository;
import com.demo.ai_study_hub.repository.SubjectRequestRepository;
import com.demo.ai_study_hub.repository.UserRepository;
import com.demo.ai_study_hub.service.AdminSubjectService;
import com.demo.ai_study_hub.service.SubjectRequestService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SubjectRequestServiceTest {

    @Mock
    private SubjectRequestRepository subjectRequestRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private SubjectRepository subjectRepository;

    @Mock
    private AdminSubjectService adminSubjectService;

    @InjectMocks
    private SubjectRequestService subjectRequestService;

    private User testUser;
    private User adminUser;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setUserId(1);
        testUser.setEmail("user@test.com");

        adminUser = new User();
        adminUser.setUserId(2);
        adminUser.setEmail("admin@test.com");
    }

    @Test
    void createSubjectRequest_Success() {
        when(subjectRequestRepository.existsByRequestedCodeAndStatus("CS101", "PENDING")).thenReturn(false);
        when(subjectRequestRepository.existsByRequestedNameAndStatus("Computer Science", "PENDING")).thenReturn(false);
        when(subjectRepository.existsBySubjectCodeAndStatus("CS101", "ACTIVE")).thenReturn(false);
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(testUser));
        when(subjectRequestRepository.save(any(SubjectRequest.class))).thenAnswer(i -> i.getArgument(0));

        SubjectRequest request = subjectRequestService.createSubjectRequest("CS101", "Computer Science", "Intro", "user@test.com");

        assertNotNull(request);
        assertEquals("CS101", request.getRequestedCode());
        assertEquals("Computer Science", request.getRequestedName());
        assertEquals("Intro", request.getDescription());
        assertEquals(testUser, request.getRequestedByUser());
        assertEquals("PENDING", request.getStatus());
    }

    @Test
    void createSubjectRequest_ThrowsConflictIfPendingExists() {
        when(subjectRequestRepository.existsByRequestedCodeAndStatus("CS101", "PENDING")).thenReturn(true);

        assertThrows(ResponseStatusException.class, () ->
                subjectRequestService.createSubjectRequest("CS101", "Computer Science", "Intro", "user@test.com"));
    }

    @Test
    void approveRequest_CreatesNewSubjectIfNotExist() {
        SubjectRequest pendingReq = new SubjectRequest();
        pendingReq.setRequestId(1);
        pendingReq.setRequestedCode("CS101");
        pendingReq.setRequestedName("Comp Sci");
        pendingReq.setStatus("PENDING");

        when(subjectRequestRepository.findById(1)).thenReturn(Optional.of(pendingReq));
        when(userRepository.findByEmail("admin@test.com")).thenReturn(Optional.of(adminUser));
        when(subjectRepository.findBySubjectCode("CS101")).thenReturn(Optional.empty());
        when(subjectRequestRepository.save(any(SubjectRequest.class))).thenAnswer(i -> i.getArgument(0));

        SubjectRequest approved = subjectRequestService.approveRequest(1, "admin@test.com");

        assertEquals("APPROVED", approved.getStatus());
        assertEquals(adminUser, approved.getReviewedBy());

        ArgumentCaptor<AdminSubjectRequest> adminReqCaptor = ArgumentCaptor.forClass(AdminSubjectRequest.class);
        verify(adminSubjectService, times(1)).createSubject(adminReqCaptor.capture());
        AdminSubjectRequest captured = adminReqCaptor.getValue();
        assertEquals("CS101", captured.getSubjectCode());
        assertEquals("Comp Sci", captured.getSubjectName());
    }

    @Test
    void approveRequest_ActivatesExistingInactiveSubject() {
        SubjectRequest pendingReq = new SubjectRequest();
        pendingReq.setRequestId(1);
        pendingReq.setRequestedCode("CS101");
        pendingReq.setStatus("PENDING");

        Subject existingSubject = new Subject();
        existingSubject.setSubjectCode("CS101");
        existingSubject.setStatus("INACTIVE");

        when(subjectRequestRepository.findById(1)).thenReturn(Optional.of(pendingReq));
        when(userRepository.findByEmail("admin@test.com")).thenReturn(Optional.of(adminUser));
        when(subjectRepository.findBySubjectCode("CS101")).thenReturn(Optional.of(existingSubject));
        when(subjectRequestRepository.save(any(SubjectRequest.class))).thenAnswer(i -> i.getArgument(0));

        SubjectRequest approved = subjectRequestService.approveRequest(1, "admin@test.com");

        assertEquals("APPROVED", approved.getStatus());
        assertEquals("ACTIVE", existingSubject.getStatus());
        verify(subjectRepository, times(1)).save(existingSubject);
        verify(adminSubjectService, never()).createSubject(any());
    }

    @Test
    void rejectRequest_Success() {
        SubjectRequest pendingReq = new SubjectRequest();
        pendingReq.setRequestId(1);
        pendingReq.setStatus("PENDING");

        when(subjectRequestRepository.findById(1)).thenReturn(Optional.of(pendingReq));
        when(userRepository.findByEmail("admin@test.com")).thenReturn(Optional.of(adminUser));
        when(subjectRequestRepository.save(any(SubjectRequest.class))).thenAnswer(i -> i.getArgument(0));

        SubjectRequest rejected = subjectRequestService.rejectRequest(1, "Bad name", "admin@test.com");

        assertEquals("REJECTED", rejected.getStatus());
        assertEquals("Bad name", rejected.getRejectReason());
        assertEquals(adminUser, rejected.getReviewedBy());
    }
}
