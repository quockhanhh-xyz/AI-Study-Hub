package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.dto.SubjectResponse;
import com.demo.ai_study_hub.repository.SubjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SubjectService {

    private final SubjectRepository subjectRepository;

    public List<SubjectResponse> getActiveSubjects() {
        return subjectRepository.findByStatus("ACTIVE")
                .stream()
                .map(s -> SubjectResponse.builder()
                        .subjectId(s.getSubjectId())
                        .subjectCode(s.getSubjectCode())
                        .subjectName(s.getSubjectName())
                        .description(s.getDescription())
                        .build())
                .collect(Collectors.toList());
    }
}