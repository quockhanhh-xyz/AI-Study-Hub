package com.demo.ai_study_hub.config;

import com.demo.ai_study_hub.entity.Subject;
import com.demo.ai_study_hub.repository.SubjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class SubjectDataSeeder implements CommandLineRunner {

    private final SubjectRepository subjectRepository;

    @Override
    public void run(String... args) {
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
                subject.setScope("SYSTEM");
                subject.setOwner(null);
            }
        }
    }
}
