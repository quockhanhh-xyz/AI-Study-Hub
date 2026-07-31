package com.demo.ai_study_hub;

import com.demo.ai_study_hub.dto.AdminSubjectRequest;
import com.demo.ai_study_hub.dto.CreateSubjectRequest;
import com.demo.ai_study_hub.entity.Major;
import com.demo.ai_study_hub.entity.School;
import com.demo.ai_study_hub.entity.Subject;
import com.demo.ai_study_hub.entity.SubjectRequest;
import com.demo.ai_study_hub.dto.SubjectRequestResponse;
import com.demo.ai_study_hub.entity.User;
import com.demo.ai_study_hub.repository.SubjectRepository;
import com.demo.ai_study_hub.repository.SubjectRequestRepository;
import com.demo.ai_study_hub.repository.UserRepository;
import com.demo.ai_study_hub.service.AdminSubjectService;
import com.demo.ai_study_hub.service.SubjectMappingService;
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

    @Mock
    private com.demo.ai_study_hub.service.NotificationService notificationService;

    @Mock
    private com.demo.ai_study_hub.repository.DocumentRepository documentRepository;

    @Mock
    private com.demo.ai_study_hub.repository.SchoolRepository schoolRepository;

    @Mock
    private com.demo.ai_study_hub.repository.MajorRepository majorRepository;

    @Mock
    private SubjectMappingService subjectMappingService;

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
        when(subjectRepository.findSystemSubjectByNameIgnoreCase("Computer Science")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(testUser));
        when(subjectRequestRepository.save(any(SubjectRequest.class))).thenAnswer(i -> {
            SubjectRequest req = i.getArgument(0);
            req.setRequestId(100);
            return req;
        });

        SubjectRequestResponse request = subjectRequestService.createSubjectRequest("CS101", "Computer Science", "Intro", "user@test.com");

        assertNotNull(request);
        assertEquals("CS101", request.getRequestedCode());
        assertEquals("Computer Science", request.getRequestedName());
        assertEquals("Intro", request.getDescription());
        assertEquals("user@test.com", request.getRequestedByEmail());
        assertEquals("PENDING", request.getStatus());
    }

    @Test
    void createSubjectRequest_ThrowsConflictIfPendingExists() {
        when(subjectRequestRepository.existsByRequestedCodeAndStatus("CS101", "PENDING")).thenReturn(true);

        assertThrows(ResponseStatusException.class, () ->
                subjectRequestService.createSubjectRequest("CS101", "Computer Science", "Intro", "user@test.com"));
    }

    @Test
    void createSubjectRequest_AllowsExistingSystemSubjectForNewMajor() {
        School school = new School();
        school.setSchoolId(10);
        school.setStatus("ACTIVE");

        Major major = new Major();
        major.setMajorId(20);
        major.setSchool(school);
        major.setStatus("ACTIVE");

        Subject existing = new Subject();
        existing.setSubjectId(30);
        existing.setSubjectCode("CS101");
        existing.setSubjectName("Computer Science");
        existing.setScope("SYSTEM");
        existing.setStatus("ACTIVE");

        CreateSubjectRequest body = new CreateSubjectRequest();
        body.setRequestedCode("CS101");
        body.setRequestedName("Computer Science");
        body.setDescription("Add CS101 to this major");
        body.setSchoolId(10);
        body.setMajorId(20);

        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(testUser));
        when(schoolRepository.findById(10)).thenReturn(Optional.of(school));
        when(majorRepository.findById(20)).thenReturn(Optional.of(major));
        when(subjectRequestRepository.existsPendingForMajor("CS101", "Computer Science", 20, "PENDING"))
                .thenReturn(false);
        when(subjectRepository.findSystemSubjectByCodeIgnoreCase("CS101")).thenReturn(Optional.of(existing));
        when(subjectRepository.findSystemSubjectByNameIgnoreCase("Computer Science")).thenReturn(Optional.of(existing));
        when(subjectMappingService.isMapped(30, 20)).thenReturn(false);
        when(subjectRequestRepository.save(any(SubjectRequest.class))).thenAnswer(invocation -> {
            SubjectRequest request = invocation.getArgument(0);
            request.setRequestId(101);
            return request;
        });

        SubjectRequestResponse response = subjectRequestService.createSubjectRequest(body, "user@test.com");

        assertEquals("PENDING", response.getStatus());
        assertEquals(10, response.getSchoolId());
        assertEquals(20, response.getMajorId());
    }

    @Test
    void createSubjectRequest_RejectsExistingMappingForSelectedMajor() {
        School school = new School();
        school.setSchoolId(10);
        school.setStatus("ACTIVE");

        Major major = new Major();
        major.setMajorId(20);
        major.setSchool(school);
        major.setStatus("ACTIVE");

        Subject existing = new Subject();
        existing.setSubjectId(30);
        existing.setSubjectCode("CS101");
        existing.setSubjectName("Computer Science");
        existing.setScope("SYSTEM");
        existing.setStatus("ACTIVE");

        CreateSubjectRequest body = new CreateSubjectRequest();
        body.setRequestedCode("CS101");
        body.setRequestedName("Computer Science");
        body.setSchoolId(10);
        body.setMajorId(20);

        when(schoolRepository.findById(10)).thenReturn(Optional.of(school));
        when(majorRepository.findById(20)).thenReturn(Optional.of(major));
        when(subjectRequestRepository.existsPendingForMajor("CS101", "Computer Science", 20, "PENDING"))
                .thenReturn(false);
        when(subjectRepository.findSystemSubjectByCodeIgnoreCase("CS101")).thenReturn(Optional.of(existing));
        when(subjectRepository.findSystemSubjectByNameIgnoreCase("Computer Science")).thenReturn(Optional.of(existing));
        when(subjectMappingService.isMapped(30, 20)).thenReturn(true);

        ResponseStatusException error = assertThrows(
                ResponseStatusException.class,
                () -> subjectRequestService.createSubjectRequest(body, "user@test.com")
        );

        assertEquals(409, error.getStatusCode().value());
        verify(subjectRequestRepository, never()).save(any());
    }

    @Test
    void approveRequest_CreatesNewSubjectIfNotExist() {
        SubjectRequest pendingReq = new SubjectRequest();
        pendingReq.setRequestId(1);
        pendingReq.setRequestedCode("CS101");
        pendingReq.setRequestedName("Comp Sci");
        pendingReq.setStatus("PENDING");
        pendingReq.setRequestedByUser(testUser);

        Subject createdSubject = new Subject();
        createdSubject.setSubjectCode("CS101");
        createdSubject.setSubjectName("Comp Sci");
        createdSubject.setScope("SYSTEM");

        when(subjectRequestRepository.findById(1)).thenReturn(Optional.of(pendingReq));
        when(userRepository.findByEmail("admin@test.com")).thenReturn(Optional.of(adminUser));
        when(subjectRepository.findSystemSubjectByCodeIgnoreCase("CS101"))
                .thenReturn(Optional.empty())
                .thenReturn(Optional.of(createdSubject));
        when(subjectRepository.findSystemSubjectByNameIgnoreCase("Comp Sci")).thenReturn(Optional.empty());
        when(subjectRequestRepository.save(any(SubjectRequest.class))).thenAnswer(i -> i.getArgument(0));

        SubjectRequestResponse approved = subjectRequestService.approveRequest(1, "admin@test.com");

        assertEquals("APPROVED", approved.getStatus());
        assertEquals("admin@test.com", approved.getReviewedByEmail());

        ArgumentCaptor<AdminSubjectRequest> adminReqCaptor = ArgumentCaptor.forClass(AdminSubjectRequest.class);
        verify(adminSubjectService, times(1)).createSubject(adminReqCaptor.capture());
        AdminSubjectRequest captured = adminReqCaptor.getValue();
        assertEquals("CS101", captured.getSubjectCode());
        assertEquals("Comp Sci", captured.getSubjectName());

        verify(documentRepository, times(1)).migratePersonalDocumentsToSystemSubject(
                testUser,
                "CS101",
                createdSubject
        );
    }

    @Test
    void approveRequest_ActivatesExistingInactiveSubject() {
        SubjectRequest pendingReq = new SubjectRequest();
        pendingReq.setRequestId(1);
        pendingReq.setRequestedCode("CS101");
        pendingReq.setStatus("PENDING");
        pendingReq.setRequestedByUser(testUser);

        Subject existingSubject = new Subject();
        existingSubject.setSubjectCode("CS101");
        existingSubject.setStatus("INACTIVE");

        when(subjectRequestRepository.findById(1)).thenReturn(Optional.of(pendingReq));
        when(userRepository.findByEmail("admin@test.com")).thenReturn(Optional.of(adminUser));
        when(subjectRepository.findSystemSubjectByCodeIgnoreCase("CS101")).thenReturn(Optional.of(existingSubject));
        when(subjectRepository.save(any(Subject.class))).thenAnswer(i -> i.getArgument(0));
        when(subjectRequestRepository.save(any(SubjectRequest.class))).thenAnswer(i -> i.getArgument(0));

        SubjectRequestResponse approved = subjectRequestService.approveRequest(1, "admin@test.com");

        assertEquals("APPROVED", approved.getStatus());
        assertEquals("ACTIVE", existingSubject.getStatus());
        verify(subjectRepository, times(1)).save(existingSubject);
        verify(adminSubjectService, never()).createSubject(any());

        verify(documentRepository, times(1)).migratePersonalDocumentsToSystemSubject(
                testUser,
                "CS101",
                existingSubject
        );
    }

    @Test
    void approveRequest_IgnoresUserCustomSubject() {
        SubjectRequest pendingReq = new SubjectRequest();
        pendingReq.setRequestId(1);
        pendingReq.setRequestedCode("WDU20C");
        pendingReq.setRequestedName("Design Pattern");
        pendingReq.setStatus("PENDING");
        pendingReq.setRequestedByUser(testUser);

        Subject createdSubject = new Subject();
        createdSubject.setSubjectCode("WDU20C");
        createdSubject.setSubjectName("Design Pattern");
        createdSubject.setScope("SYSTEM");

        when(subjectRequestRepository.findById(1)).thenReturn(Optional.of(pendingReq));
        when(userRepository.findByEmail("admin@test.com")).thenReturn(Optional.of(adminUser));
        
        when(subjectRepository.findSystemSubjectByCodeIgnoreCase("WDU20C"))
                .thenReturn(Optional.empty())
                .thenReturn(Optional.of(createdSubject));
        when(subjectRepository.findSystemSubjectByNameIgnoreCase("Design Pattern")).thenReturn(Optional.empty());
        when(subjectRequestRepository.save(any(SubjectRequest.class))).thenAnswer(i -> i.getArgument(0));

        SubjectRequestResponse approved = subjectRequestService.approveRequest(1, "admin@test.com");

        assertEquals("APPROVED", approved.getStatus());
        ArgumentCaptor<AdminSubjectRequest> adminReqCaptor = ArgumentCaptor.forClass(AdminSubjectRequest.class);
        verify(adminSubjectService, times(1)).createSubject(adminReqCaptor.capture());
        assertEquals("WDU20C", adminReqCaptor.getValue().getSubjectCode());
        assertEquals("Design Pattern", adminReqCaptor.getValue().getSubjectName());

        verify(documentRepository, times(1)).migratePersonalDocumentsToSystemSubject(
                testUser,
                "WDU20C",
                createdSubject
        );
    }

    @Test
    void rejectRequest_Success() {
        SubjectRequest pendingReq = new SubjectRequest();
        pendingReq.setRequestId(1);
        pendingReq.setStatus("PENDING");

        when(subjectRequestRepository.findById(1)).thenReturn(Optional.of(pendingReq));
        when(userRepository.findByEmail("admin@test.com")).thenReturn(Optional.of(adminUser));
        when(subjectRequestRepository.save(any(SubjectRequest.class))).thenAnswer(i -> i.getArgument(0));

        SubjectRequestResponse rejected = subjectRequestService.rejectRequest(1, "Bad name", "admin@test.com");

        assertEquals("REJECTED", rejected.getStatus());
        assertEquals("Bad name", rejected.getRejectReason());
        assertEquals("admin@test.com", rejected.getReviewedByEmail());
    }
}
