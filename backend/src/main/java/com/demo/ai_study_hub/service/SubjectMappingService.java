package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.dto.SubjectMappingResponse;
import com.demo.ai_study_hub.entity.Major;
import com.demo.ai_study_hub.entity.Subject;
import com.demo.ai_study_hub.entity.SubjectMajorMapping;
import com.demo.ai_study_hub.repository.MajorRepository;
import com.demo.ai_study_hub.repository.SubjectMajorMappingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SubjectMappingService {

    private final SubjectMajorMappingRepository mappingRepository;
    private final MajorRepository majorRepository;

    public List<SubjectMappingResponse> getMappings(Integer subjectId) {
        return mappingRepository
                .findBySubject_SubjectIdOrderByMajor_School_SchoolNameAscMajor_MajorNameAsc(subjectId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public List<SubjectMappingResponse> replaceMappings(Subject subject, List<Integer> majorIds) {
        if (!"SYSTEM".equalsIgnoreCase(subject.getScope())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Only system subjects can be mapped to majors");
        }

        List<Integer> uniqueIds = new ArrayList<>(new LinkedHashSet<>(
                majorIds == null ? List.of() : majorIds
        ));
        List<Major> majors = new ArrayList<>();

        for (Integer majorId : uniqueIds) {
            if (majorId == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Major ID cannot be null");
            }
            Major major = majorRepository.findById(majorId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                            "Major not found: " + majorId));
            validateActiveMajor(major);
            majors.add(major);
        }

        mappingRepository.deleteBySubject_SubjectId(subject.getSubjectId());
        for (Major major : majors) {
            SubjectMajorMapping mapping = new SubjectMajorMapping();
            mapping.setSubject(subject);
            mapping.setMajor(major);
            mappingRepository.save(mapping);
        }
        mappingRepository.flush();

        return getMappings(subject.getSubjectId());
    }

    @Transactional
    public void addMapping(Subject subject, Major major) {
        if (!"SYSTEM".equalsIgnoreCase(subject.getScope())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Only system subjects can be mapped to majors");
        }
        validateActiveMajor(major);
        if (mappingRepository.existsBySubject_SubjectIdAndMajor_MajorId(
                subject.getSubjectId(), major.getMajorId())) {
            return;
        }

        SubjectMajorMapping mapping = new SubjectMajorMapping();
        mapping.setSubject(subject);
        mapping.setMajor(major);
        mappingRepository.save(mapping);
    }

    public boolean isMapped(Integer subjectId, Integer majorId) {
        return mappingRepository.existsBySubject_SubjectIdAndMajor_MajorId(subjectId, majorId);
    }

    public void validateSystemSubjectMapping(Subject subject, Major major) {
        if (subject == null || major == null) {
            return;
        }
        if (!"SYSTEM".equalsIgnoreCase(subject.getScope())) {
            return;
        }
        if (!mappingRepository.existsBySubject_SubjectIdAndMajor_MajorId(
                subject.getSubjectId(), major.getMajorId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "The selected subject is not available for the selected major");
        }
    }

    public void validateActiveMajor(Major major) {
        if (!"ACTIVE".equalsIgnoreCase(major.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Major is inactive");
        }
        if (major.getSchool() == null || !"ACTIVE".equalsIgnoreCase(major.getSchool().getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "School is inactive");
        }
    }

    private SubjectMappingResponse toResponse(SubjectMajorMapping mapping) {
        Major major = mapping.getMajor();
        return SubjectMappingResponse.builder()
                .subjectId(mapping.getSubject().getSubjectId())
                .schoolId(major.getSchool().getSchoolId())
                .schoolCode(major.getSchool().getSchoolCode())
                .schoolName(major.getSchool().getSchoolName())
                .majorId(major.getMajorId())
                .majorCode(major.getMajorCode())
                .majorName(major.getMajorName())
                .build();
    }
}
