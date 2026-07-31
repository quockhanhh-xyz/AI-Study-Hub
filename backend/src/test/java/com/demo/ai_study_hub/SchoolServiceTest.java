package com.demo.ai_study_hub;

import com.demo.ai_study_hub.dto.MajorDto;
import com.demo.ai_study_hub.dto.SchoolDto;
import com.demo.ai_study_hub.entity.Major;
import com.demo.ai_study_hub.entity.School;
import com.demo.ai_study_hub.repository.DocumentRepository;
import com.demo.ai_study_hub.repository.MajorRepository;
import com.demo.ai_study_hub.repository.SchoolRepository;
import com.demo.ai_study_hub.repository.UserRepository;
import com.demo.ai_study_hub.service.SchoolService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SchoolServiceTest {

    @Mock
    private SchoolRepository schoolRepository;
    @Mock
    private MajorRepository majorRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private DocumentRepository documentRepository;

    @InjectMocks
    private SchoolService schoolService;

    private School fpt;
    private Major ai;

    @BeforeEach
    void setUp() {
        fpt = new School();
        fpt.setSchoolId(1);
        fpt.setSchoolCode("FPT");
        fpt.setSchoolName("FPT University");
        fpt.setShortName("FPTU");
        fpt.setStatus("ACTIVE");

        ai = new Major();
        ai.setMajorId(1);
        ai.setSchool(fpt);
        ai.setMajorCode("AI");
        ai.setMajorName("Artificial Intelligence");
        ai.setStatus("ACTIVE");
    }

    @Test
    void testGetAllSchools() {
        when(schoolRepository.findAll()).thenReturn(Collections.singletonList(fpt));
        List<SchoolDto> res = schoolService.getAllSchools(null, null);
        assertEquals(1, res.size());
        assertEquals("FPT", res.get(0).getSchoolCode());
    }

    @Test
    void testCreateSchool() {
        SchoolDto dto = SchoolDto.builder()
                .schoolCode("FPT")
                .schoolName("FPT University")
                .shortName("FPTU")
                .build();

        when(schoolRepository.existsBySchoolCodeIgnoreCase("FPT")).thenReturn(false);
        when(schoolRepository.save(any(School.class))).thenReturn(fpt);

        SchoolDto saved = schoolService.createSchool(dto);
        assertNotNull(saved);
        assertEquals("FPT", saved.getSchoolCode());
    }

    @Test
    void testCreateSchoolDuplicateCode() {
        SchoolDto dto = SchoolDto.builder()
                .schoolCode("FPT")
                .schoolName("FPT University")
                .shortName("FPTU")
                .build();

        when(schoolRepository.existsBySchoolCodeIgnoreCase("FPT")).thenReturn(true);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> schoolService.createSchool(dto));
        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
    }

    @Test
    void testGetMajorsBySchool() {
        when(schoolRepository.findById(1)).thenReturn(Optional.of(fpt));
        when(majorRepository.findBySchool_SchoolIdAndStatus(1, "ACTIVE")).thenReturn(Collections.singletonList(ai));
        List<MajorDto> majors = schoolService.getMajorsBySchool(1, "ACTIVE");
        assertEquals(1, majors.size());
        assertEquals("AI", majors.get(0).getMajorCode());
    }

    @Test
    void testGetMajorsBySchool_WhenSchoolNotFound_ShouldThrowNotFound() {
        when(schoolRepository.findById(999)).thenReturn(Optional.empty());
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> schoolService.getMajorsBySchool(999, "ACTIVE"));
        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
    }

    @Test
    void testGetMajorsBySchool_WhenSchoolInactive_ShouldThrowBadRequest() {
        fpt.setStatus("INACTIVE");
        when(schoolRepository.findById(1)).thenReturn(Optional.of(fpt));
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> schoolService.getMajorsBySchool(1, "ACTIVE"));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
    }

    @Test
    void testUpdateSchool_WithInvalidStatus_ShouldThrowBadRequest() {
        SchoolDto dto = SchoolDto.builder()
                .schoolCode("FPT")
                .schoolName("FPT University")
                .shortName("FPTU")
                .status("SUSPENDED")
                .build();

        when(schoolRepository.findById(1)).thenReturn(Optional.of(fpt));
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> schoolService.updateSchool(1, dto));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
    }

    @Test
    void testUpdateMajor_WithInvalidStatus_ShouldThrowBadRequest() {
        MajorDto dto = MajorDto.builder()
                .majorCode("AI")
                .majorName("Artificial Intelligence")
                .status("SUSPENDED")
                .build();

        when(majorRepository.findById(1)).thenReturn(Optional.of(ai));
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> schoolService.updateMajor(1, dto));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
    }
}
