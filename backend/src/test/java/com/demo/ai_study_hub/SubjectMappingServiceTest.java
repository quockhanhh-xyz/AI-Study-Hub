package com.demo.ai_study_hub;

import com.demo.ai_study_hub.entity.Major;
import com.demo.ai_study_hub.entity.School;
import com.demo.ai_study_hub.entity.Subject;
import com.demo.ai_study_hub.repository.MajorRepository;
import com.demo.ai_study_hub.repository.SubjectMajorMappingRepository;
import com.demo.ai_study_hub.service.SubjectMappingService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SubjectMappingServiceTest {

    @Mock
    private SubjectMajorMappingRepository mappingRepository;
    @Mock
    private MajorRepository majorRepository;

    private SubjectMappingService service;
    private Subject systemSubject;
    private Major activeMajor;

    @BeforeEach
    void setUp() {
        service = new SubjectMappingService(mappingRepository, majorRepository);

        School school = new School();
        school.setSchoolId(1);
        school.setStatus("ACTIVE");

        activeMajor = new Major();
        activeMajor.setMajorId(2);
        activeMajor.setStatus("ACTIVE");
        activeMajor.setSchool(school);

        systemSubject = new Subject();
        systemSubject.setSubjectId(3);
        systemSubject.setScope("SYSTEM");
    }

    @Test
    void validateSystemSubjectMapping_WhenMappingExists_AllowsSelection() {
        when(mappingRepository.existsBySubject_SubjectIdAndMajor_MajorId(3, 2)).thenReturn(true);

        assertDoesNotThrow(() -> service.validateSystemSubjectMapping(systemSubject, activeMajor));
    }

    @Test
    void validateSystemSubjectMapping_WhenMappingMissing_RejectsSelection() {
        when(mappingRepository.existsBySubject_SubjectIdAndMajor_MajorId(3, 2)).thenReturn(false);

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> service.validateSystemSubjectMapping(systemSubject, activeMajor));

        assertEquals(HttpStatus.BAD_REQUEST, error.getStatusCode());
    }

    @Test
    void replaceMappings_WhenMajorSchoolInactive_DoesNotDeleteExistingMappings() {
        activeMajor.getSchool().setStatus("INACTIVE");
        when(majorRepository.findById(2)).thenReturn(Optional.of(activeMajor));

        assertThrows(ResponseStatusException.class,
                () -> service.replaceMappings(systemSubject, List.of(2)));

        verify(mappingRepository, never()).deleteBySubject_SubjectId(anyInt());
        verify(mappingRepository, never()).save(any());
    }
}
