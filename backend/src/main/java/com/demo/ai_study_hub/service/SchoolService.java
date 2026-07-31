package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.dto.MajorDto;
import com.demo.ai_study_hub.dto.SchoolDto;
import com.demo.ai_study_hub.entity.Major;
import com.demo.ai_study_hub.entity.School;
import com.demo.ai_study_hub.repository.MajorRepository;
import com.demo.ai_study_hub.repository.SchoolRepository;
import com.demo.ai_study_hub.repository.UserRepository;
import com.demo.ai_study_hub.repository.DocumentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SchoolService {

    private final SchoolRepository schoolRepository;
    private final MajorRepository majorRepository;
    private final UserRepository userRepository;
    private final DocumentRepository documentRepository;

    // --- Schools CRUD ---

    public List<SchoolDto> getAllSchools(String keyword, String status) {
        // Simple search logic
        List<School> schools;
        if (status != null && !status.trim().isEmpty()) {
            schools = schoolRepository.findByStatus(status);
        } else {
            schools = schoolRepository.findAll();
        }

        if (keyword != null && !keyword.trim().isEmpty()) {
            String lowerKeyword = keyword.toLowerCase();
            schools = schools.stream()
                    .filter(s -> s.getSchoolName().toLowerCase().contains(lowerKeyword) ||
                                 s.getSchoolCode().toLowerCase().contains(lowerKeyword) ||
                                 s.getShortName().toLowerCase().contains(lowerKeyword))
                    .collect(Collectors.toList());
        }

        return schools.stream().map(this::mapToSchoolDto).collect(Collectors.toList());
    }

    public SchoolDto getSchoolById(Integer id) {
        School school = schoolRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "School not found"));
        return mapToSchoolDto(school);
    }

    @Transactional
    public SchoolDto createSchool(SchoolDto dto) {
        if (dto.getSchoolCode() == null || dto.getSchoolCode().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "School code is required");
        }
        if (dto.getSchoolName() == null || dto.getSchoolName().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "School name is required");
        }
        if (dto.getShortName() == null || dto.getShortName().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Short name is required");
        }

        if (schoolRepository.existsBySchoolCodeIgnoreCase(dto.getSchoolCode())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "School code already exists");
        }

        School school = new School();
        school.setSchoolCode(dto.getSchoolCode().trim().toUpperCase());
        school.setSchoolName(dto.getSchoolName().trim());
        school.setShortName(dto.getShortName().trim());
        school.setDescription(dto.getDescription());
        school.setStatus("ACTIVE");

        School saved = schoolRepository.save(school);
        return mapToSchoolDto(saved);
    }

    @Transactional
    public SchoolDto updateSchool(Integer id, SchoolDto dto) {
        School school = schoolRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "School not found"));

        if (dto.getSchoolCode() == null || dto.getSchoolCode().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "School code is required");
        }
        if (dto.getSchoolName() == null || dto.getSchoolName().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "School name is required");
        }
        if (dto.getShortName() == null || dto.getShortName().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Short name is required");
        }

        if (schoolRepository.existsBySchoolCodeIgnoreCaseAndSchoolIdNot(dto.getSchoolCode(), id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "School code already exists");
        }

        school.setSchoolCode(dto.getSchoolCode().trim().toUpperCase());
        school.setSchoolName(dto.getSchoolName().trim());
        school.setShortName(dto.getShortName().trim());
        school.setDescription(dto.getDescription());
        if (dto.getStatus() != null) {
            if (!"ACTIVE".equals(dto.getStatus()) && !"INACTIVE".equals(dto.getStatus())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid status. Use ACTIVE or INACTIVE");
            }
            school.setStatus(dto.getStatus());
        }

        School saved = schoolRepository.save(school);
        return mapToSchoolDto(saved);
    }

    @Transactional
    public SchoolDto patchSchoolStatus(Integer id, String status) {
        School school = schoolRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "School not found"));

        if (!"ACTIVE".equals(status) && !"INACTIVE".equals(status)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid status. Use ACTIVE or INACTIVE");
        }

        school.setStatus(status);
        School saved = schoolRepository.save(school);
        return mapToSchoolDto(saved);
    }

    // --- Majors CRUD ---

    public List<MajorDto> getMajorsBySchool(Integer schoolId, String status) {
        School school = schoolRepository.findById(schoolId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "School not found"));

        if ("ACTIVE".equals(status) && !"ACTIVE".equals(school.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "School is inactive");
        }

        List<Major> majors;
        if (status != null && !status.trim().isEmpty()) {
            majors = majorRepository.findBySchool_SchoolIdAndStatus(schoolId, status);
        } else {
            majors = majorRepository.findBySchool_SchoolId(schoolId);
        }
        return majors.stream().map(this::mapToMajorDto).collect(Collectors.toList());
    }

    public List<MajorDto> searchMajors(Integer schoolId, String keyword) {
        List<Major> majors = majorRepository.findBySchool_SchoolId(schoolId);
        if (keyword != null && !keyword.trim().isEmpty()) {
            String lowerKeyword = keyword.toLowerCase();
            majors = majors.stream()
                    .filter(m -> m.getMajorCode().toLowerCase().contains(lowerKeyword) ||
                                 m.getMajorName().toLowerCase().contains(lowerKeyword))
                    .collect(Collectors.toList());
        }
        return majors.stream().map(this::mapToMajorDto).collect(Collectors.toList());
    }

    @Transactional
    public MajorDto createMajor(Integer schoolId, MajorDto dto) {
        School school = schoolRepository.findById(schoolId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "School not found"));

        if (!"ACTIVE".equals(school.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot create major for inactive school");
        }

        if (dto.getMajorCode() == null || dto.getMajorCode().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Major code is required");
        }
        if (dto.getMajorName() == null || dto.getMajorName().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Major name is required");
        }

        if (majorRepository.existsBySchoolAndMajorCodeIgnoreCase(school, dto.getMajorCode())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Major code already exists in this school");
        }
        if (majorRepository.existsBySchoolAndMajorNameIgnoreCase(school, dto.getMajorName())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Major name already exists in this school");
        }

        Major major = new Major();
        major.setSchool(school);
        major.setMajorCode(dto.getMajorCode().trim().toUpperCase());
        major.setMajorName(dto.getMajorName().trim());
        major.setDescription(dto.getDescription());
        major.setStatus("ACTIVE");

        Major saved = majorRepository.save(major);
        return mapToMajorDto(saved);
    }

    @Transactional
    public MajorDto updateMajor(Integer schoolId, Integer id, MajorDto dto) {
        Major major = majorRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Major not found"));

        if (!major.getSchool().getSchoolId().equals(schoolId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Major does not belong to this school");
        }

        if (dto.getMajorCode() == null || dto.getMajorCode().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Major code is required");
        }
        if (dto.getMajorName() == null || dto.getMajorName().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Major name is required");
        }

        if (majorRepository.existsBySchoolAndMajorCodeIgnoreCaseAndMajorIdNot(major.getSchool(), dto.getMajorCode(), id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Major code already exists in this school");
        }
        if (majorRepository.existsBySchoolAndMajorNameIgnoreCaseAndMajorIdNot(major.getSchool(), dto.getMajorName(), id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Major name already exists in this school");
        }

        major.setMajorCode(dto.getMajorCode().trim().toUpperCase());
        major.setMajorName(dto.getMajorName().trim());
        major.setDescription(dto.getDescription());

        if (dto.getStatus() != null) {
            if (!"ACTIVE".equals(dto.getStatus()) && !"INACTIVE".equals(dto.getStatus())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid status. Use ACTIVE or INACTIVE");
            }
            if ("ACTIVE".equals(dto.getStatus()) && !"ACTIVE".equals(major.getSchool().getStatus())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot activate major when its school is inactive");
            }
            major.setStatus(dto.getStatus());
        }

        Major saved = majorRepository.save(major);
        return mapToMajorDto(saved);
    }

    @Transactional
    public MajorDto patchMajorStatus(Integer schoolId, Integer id, String status) {
        Major major = majorRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Major not found"));

        if (!major.getSchool().getSchoolId().equals(schoolId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Major does not belong to this school");
        }

        if (!"ACTIVE".equals(status) && !"INACTIVE".equals(status)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid status. Use ACTIVE or INACTIVE");
        }

        if ("ACTIVE".equals(status) && !"ACTIVE".equals(major.getSchool().getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot activate major when its school is inactive");
        }

        major.setStatus(status);
        Major saved = majorRepository.save(major);
        return mapToMajorDto(saved);
    }

    // --- Helper Mappings ---

    private SchoolDto mapToSchoolDto(School school) {
        return SchoolDto.builder()
                .schoolId(school.getSchoolId())
                .schoolCode(school.getSchoolCode())
                .schoolName(school.getSchoolName())
                .shortName(school.getShortName())
                .description(school.getDescription())
                .status(school.getStatus())
                .createdAt(school.getCreatedAt())
                .updatedAt(school.getUpdatedAt())
                .build();
    }

    @Transactional
    public void deleteSchool(Integer schoolId) {
        School school = schoolRepository.findById(schoolId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "School not found"));

        if (userRepository.existsBySchoolSchoolId(schoolId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot delete school as there are users associated with it");
        }

        if (documentRepository.existsBySchoolSchoolId(schoolId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot delete school as there are documents associated with it");
        }

        if (majorRepository.existsBySchoolSchoolId(schoolId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot delete school as there are majors associated with it");
        }

        schoolRepository.delete(school);
    }

    @Transactional
    public void deleteMajor(Integer schoolId, Integer majorId) {
        School school = schoolRepository.findById(schoolId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "School not found"));

        Major major = majorRepository.findById(majorId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Major not found"));

        if (!major.getSchool().getSchoolId().equals(schoolId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Major does not belong to the specified school");
        }

        if (userRepository.existsByMajorMajorId(majorId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot delete major as there are users associated with it");
        }

        if (documentRepository.existsByMajorMajorId(majorId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot delete major as there are documents associated with it");
        }

        majorRepository.delete(major);
    }

    private MajorDto mapToMajorDto(Major major) {
        return MajorDto.builder()
                .majorId(major.getMajorId())
                .schoolId(major.getSchool().getSchoolId())
                .schoolName(major.getSchool().getSchoolName())
                .majorCode(major.getMajorCode())
                .majorName(major.getMajorName())
                .description(major.getDescription())
                .status(major.getStatus())
                .createdAt(major.getCreatedAt())
                .updatedAt(major.getUpdatedAt())
                .build();
    }
}
