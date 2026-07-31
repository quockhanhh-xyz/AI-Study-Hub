package com.demo.ai_study_hub.config;

import com.demo.ai_study_hub.entity.Major;
import com.demo.ai_study_hub.entity.Subject;
import com.demo.ai_study_hub.entity.SubjectMajorMapping;
import com.demo.ai_study_hub.repository.DocumentRepository;
import com.demo.ai_study_hub.repository.MajorRepository;
import com.demo.ai_study_hub.repository.SubjectMajorMappingRepository;
import com.demo.ai_study_hub.repository.SubjectRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
@RequiredArgsConstructor
public class SubjectMajorMappingBackfill implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(SubjectMajorMappingBackfill.class);

    private final DocumentRepository documentRepository;
    private final SubjectRepository subjectRepository;
    private final MajorRepository majorRepository;
    private final SubjectMajorMappingRepository mappingRepository;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        List<Object[]> pairs = documentRepository.findDistinctSystemSubjectMajorPairs();
        int created = 0;

        for (Object[] pair : pairs) {
            Integer subjectId = (Integer) pair[0];
            Integer majorId = (Integer) pair[1];
            if (mappingRepository.existsBySubject_SubjectIdAndMajor_MajorId(subjectId, majorId)) {
                continue;
            }

            Subject subject = subjectRepository.findById(subjectId).orElse(null);
            Major major = majorRepository.findById(majorId).orElse(null);
            if (subject == null || major == null) {
                continue;
            }

            SubjectMajorMapping mapping = new SubjectMajorMapping();
            mapping.setSubject(subject);
            mapping.setMajor(major);
            mappingRepository.save(mapping);
            created++;
        }

        if (created > 0) {
            log.info("Backfilled {} subject-major mappings from existing documents", created);
        }
    }
}
