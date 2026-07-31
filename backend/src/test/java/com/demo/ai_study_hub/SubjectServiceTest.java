package com.demo.ai_study_hub;

import com.demo.ai_study_hub.dto.CreateCustomSubjectRequest;
import com.demo.ai_study_hub.dto.SubjectResponse;
import com.demo.ai_study_hub.entity.Subject;
import com.demo.ai_study_hub.entity.User;
import com.demo.ai_study_hub.repository.SubjectRepository;
import com.demo.ai_study_hub.repository.UserRepository;
import com.demo.ai_study_hub.service.SubjectService;
import com.demo.ai_study_hub.service.SubjectMappingService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SubjectServiceTest {

    @Mock
    private SubjectRepository subjectRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private SubjectMappingService subjectMappingService;

    @InjectMocks
    private SubjectService subjectService;

    private User userA;
    private User userB;
    private Subject systemSubject;
    private Subject customSubjectOfA;

    @BeforeEach
    void setUp() {
        userA = new User();
        userA.setUserId(1);
        userA.setEmail("usera@gmail.com");

        userB = new User();
        userB.setUserId(2);
        userB.setEmail("userb@gmail.com");

        systemSubject = new Subject();
        systemSubject.setSubjectId(1);
        systemSubject.setSubjectCode("SWP391");
        systemSubject.setSubjectName("Software Project");
        systemSubject.setStatus("ACTIVE");
        systemSubject.setScope("SYSTEM");
        systemSubject.setOwner(null);

        customSubjectOfA = new Subject();
        customSubjectOfA.setSubjectId(2);
        customSubjectOfA.setSubjectCode("MYSUB");
        customSubjectOfA.setSubjectName("My Custom Subject");
        customSubjectOfA.setStatus("ACTIVE");
        customSubjectOfA.setScope("USER_CUSTOM");
        customSubjectOfA.setOwner(userA);
    }

    @Test
    void createCustomSubject_WhenValid_ShouldSucceed() {
        CreateCustomSubjectRequest request = new CreateCustomSubjectRequest();
        request.setSubjectCode(" mysub ");
        request.setSubjectName(" My Custom Subject ");

        when(userRepository.findByEmail("usera@gmail.com")).thenReturn(Optional.of(userA));
        when(subjectRepository.existsDuplicateForUser("MYSUB", "My Custom Subject", userA)).thenReturn(false);
        when(subjectRepository.save(any(Subject.class))).thenReturn(customSubjectOfA);

        SubjectResponse response = subjectService.createCustomSubject(request, "usera@gmail.com");

        assertNotNull(response);
        assertEquals("MYSUB", response.getSubjectCode());
        assertEquals("USER_CUSTOM", response.getScope());
        assertEquals(1, response.getOwnerId());
    }

    @Test
    void createCustomSubject_WhenDuplicateWithSystemSubject_ShouldThrow409() {
        CreateCustomSubjectRequest request = new CreateCustomSubjectRequest();
        request.setSubjectCode("SWP391");
        request.setSubjectName("Duplicate Name");

        when(userRepository.findByEmail("usera@gmail.com")).thenReturn(Optional.of(userA));
        when(subjectRepository.existsDuplicateForUser("SWP391", "Duplicate Name", userA)).thenReturn(true);

        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> {
            subjectService.createCustomSubject(request, "usera@gmail.com");
        });

        assertEquals(HttpStatus.CONFLICT, exception.getStatusCode());
    }

    @Test
    void createCustomSubject_WhenDuplicateWithOwnCustomSubject_ShouldThrow409() {
        CreateCustomSubjectRequest request = new CreateCustomSubjectRequest();
        request.setSubjectCode("MYSUB");
        request.setSubjectName("My Custom Subject");

        when(userRepository.findByEmail("usera@gmail.com")).thenReturn(Optional.of(userA));
        when(subjectRepository.existsDuplicateForUser("MYSUB", "My Custom Subject", userA)).thenReturn(true);

        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> {
            subjectService.createCustomSubject(request, "usera@gmail.com");
        });

        assertEquals(HttpStatus.CONFLICT, exception.getStatusCode());
    }

    @Test
    void getActiveSubjects_ShouldReturnOnlySystemAndOwnCustomSubjects() {
        when(userRepository.findByEmail("usera@gmail.com")).thenReturn(Optional.of(userA));
        when(subjectRepository.findVisibleSubjects(userA)).thenReturn(List.of(systemSubject, customSubjectOfA));

        List<SubjectResponse> result = subjectService.getActiveSubjects("usera@gmail.com");

        assertEquals(2, result.size());
    }

    @Test
    void getActiveSubjects_UserB_ShouldNotSeeUserACustomSubject() {
        when(userRepository.findByEmail("userb@gmail.com")).thenReturn(Optional.of(userB));
        when(subjectRepository.findVisibleSubjects(userB)).thenReturn(List.of(systemSubject));

        List<SubjectResponse> result = subjectService.getActiveSubjects("userb@gmail.com");

        assertEquals(1, result.size());
        assertEquals("SYSTEM", result.get(0).getScope());
    }
}
