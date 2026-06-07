package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.dto.SubjectResponse;
import com.demo.ai_study_hub.entity.Subject;
import com.demo.ai_study_hub.repository.SubjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SubjectService implements CommandLineRunner {

    private final SubjectRepository subjectRepository;

    @Override
    public void run(String... args) {
        seedSubjects();
    }

    private void seedSubjects() {
        String[][] subjects = {
                {"SWP391", "Software Project"},
                {"SWT301", "Software Testing"},
                {"PRJ301", "Java Web Application"},
                {"MAD101", "Mobile Application Development"},
                {"DBI202", "Database Systems"}
        };

        for (String[] s : subjects) {
            if (!subjectRepository.existsBySubjectCode(s[0])) {
                Subject subject = new Subject();
                subject.setSubjectCode(s[0]);
                subject.setSubjectName(s[1]);
                subject.setStatus("ACTIVE");
                subjectRepository.save(subject);
            }
        }
    }

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