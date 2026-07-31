package com.demo.ai_study_hub.config;

import com.demo.ai_study_hub.entity.Subject;
import com.demo.ai_study_hub.entity.Major;
import com.demo.ai_study_hub.entity.SubjectMajorMapping;
import com.demo.ai_study_hub.repository.SubjectRepository;
import com.demo.ai_study_hub.repository.MajorRepository;
import com.demo.ai_study_hub.repository.SubjectMajorMappingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.core.annotation.Order;

import java.util.Arrays;
import java.util.List;

@Component
@RequiredArgsConstructor
@Order(2)
public class SubjectDataSeeder implements CommandLineRunner {

    private final SubjectRepository subjectRepository;
    private final MajorRepository majorRepository;
    private final SubjectMajorMappingRepository mappingRepository;

    @Override
    public void run(String... args) {
        String[][] subjects = {
                {"OTP101", "Orientation and General Training Program"},
                {"PEN", "Preparation English"},
                {"PHE_COM*1", "Physical Education 1"},
                {"TMI_ELE", "Traditional musical instrument"},
                {"CEA201", "Computer Organization and Architecture"},
                {"CSI106", "Introduction to Computer Science"},
                {"MAE101", "Mathematics for Engineering"},
                {"PHE_COM*2", "Physical Education 2"},
                {"PRF192", "Programming Fundamentals"},
                {"SSL101c", "Academic Skills for University Success"},
                {"MAD101", "Discrete mathematics"},
                {"NWC204", "Computer Networking"},
                {"OSG202", "Operating Systems"},
                {"PHE_COM*3", "Physical Education 3"},
                {"PRO192", "Object-Oriented Programming"},
                {"WED201c", "Web Design"},
                {"CSD201", "Data Structures and Algorithms"},
                {"DBI202", "Introduction to Databases"},
                {"JPD113", "Elementary Japanese 1- A1.1"},
                {"LAB211", "OOP with Java Lab"},
                {"MAS291", "Statistics & Probability"},
                {"IOT102", "Internet of Things"},
                {"JPD123", "Elementary Japanese 1-A1.2"},
                {"PRJ301", "Java Web Application Development"},
                {"SSG104", "Communication and In-Group Working Skills"},
                {"SWE202c", "Introduction to Software Engineering"},
                {"SE_COM*1", "Subject 1 of Combo*"},
                {"SWP391", "Software development project"},
                {"SWR302", "Software Requirement"},
                {"SWT301", "Software Testing"},
                {"WDU203c", "UI/UX Design"},
                {"ENW493c", "Research Methods & Academic Writing Skills"},
                {"OJT202", "On-The-Job Training"},
                {"EXE101", "Experiential Entrepreneurship 1"},
                {"PMG201c", "Project Management"},
                {"SE_COM*2", "Subject 2 of Combo*"},
                {"SE_COM*3", "Subject 3 of Combo*"},
                {"SWD392", "Software Architecture and Design"},
                {"EXE201", "Experiential Entrepreneurship 2"},
                {"ITE302c", "Ethics in IT"},
                {"MLN111", "Philosophy of Marxism - Leninism"},
                {"MLN122", "Political economics of Marxism - Leninism"},
                {"PRM393", "Mobile Programming"},
                {"SE_COM*4_ELE", "Elective Subject 4 of SE Combo"},
                {"HCM202", "Ho Chi Minh Ideology"},
                {"MLN131", "Scientific socialism"},
                {"SE_GRA_ELE", "Graduation Elective - Software Engineering"},
                {"VNR202", "History of Communist Party of Vietnam"},
                {"PFP191", "Programming Fundamentals with Python"},
                {"SSA101", "Academic Skills"},
                {"AIG202c", "Artificial Intelligence"},
                {"CSD203", "Data Structures and Algorithm with Python"},
                {"ADY201m", "AI, DS with Python & SQL"},
                {"ITE303c", "Ethics in IT"},
                {"MAI391", "Mathematics for Machine Learning"},
                {"AIL303m", "Machine Learning"},
                {"CPV301", "Computer Vision"},
                {"DAP391m", "AI-DS Project"},
                {"SSG105", "Communication and Collaboration Skills"},
                {"SWE201c", "Introduction to Software Engineering"},
                {"AIT7_COM+1", "Subject 1 of Combo*"},
                {"AIT7_COM+2", "Subject 2 of Combo*"},
                {"DPL302m", "Deep Learning"},
                {"DWP301c", "Web Development with Python"},
                {"NLP301c", "Natural Language Processing"},
                {"AIT7_COM+3", "Subject 3 of Combo*"},
                {"DAT301m", "AI Development with TensorFlow"},
                {"AIT7_COM+4", "Subject 4 of Combo*"},
                {"AIT301c", "AI in Production"},
                {"REL301m", "Reinforcement Learning"},
                {"AIT7_GRA_ELE", "Graduation Elective - Artificial Intelligence"},
                {"CSI101", "CHuctureaion"},
                {"SCX112", "SCX112"}
        };

        for (String[] s : subjects) {
            Subject subject = subjectRepository.findBySubjectCode(s[0]).orElse(null);
            if (subject == null) {
                subject = new Subject();
                subject.setSubjectCode(s[0]);
            }
            subject.setSubjectName(s[1]);
            subject.setStatus("ACTIVE");
            subject.setScope("SYSTEM");
            subject.setOwner(null);
            subjectRepository.save(subject);
        }

        // Data cleanup/migration for all system subjects where owner is null
        for (Subject subject : subjectRepository.findAll()) {
            if (subject.getOwner() == null) {
                boolean updated = false;
                if (!"SYSTEM".equals(subject.getScope())) {
                    subject.setScope("SYSTEM");
                    updated = true;
                }
                if (!"ACTIVE".equals(subject.getStatus())) {
                    subject.setStatus("ACTIVE");
                    updated = true;
                }
                if (updated) {
                    subjectRepository.save(subject);
                }
            }
        }

        // Map Subjects to Majors (SE and AI)
        List<String> seSubjects = Arrays.asList(
                "OTP101", "PEN", "PHE_COM*1", "TMI_ELE", "CEA201", "CSI106", "MAE101", "PHE_COM*2", "PRF192", "SSL101c",
                "MAD101", "NWC204", "OSG202", "PHE_COM*3", "PRO192", "WED201c", "CSD201", "DBI202", "JPD113", "LAB211",
                "MAS291", "IOT102", "JPD123", "PRJ301", "SSG104", "SWE202c", "SE_COM*1", "SWP391", "SWR302", "SWT301",
                "WDU203c", "ENW493c", "OJT202", "EXE101", "PMG201c", "SE_COM*2", "SE_COM*3", "SWD392", "EXE201", "ITE302c",
                "MLN111", "MLN122", "PRM393", "SE_COM*4_ELE", "HCM202", "MLN131", "SE_GRA_ELE", "VNR202"
        );

        List<String> aiSubjects = Arrays.asList(
                "OTP101", "PEN", "PHE_COM*1", "TMI_ELE", "CSI106", "MAD101", "MAE101", "PFP191", "PHE_COM*2", "SSA101",
                "AIG202c", "CEA201", "CSD203", "DBI202", "JPD113", "PHE_COM*3", "ADY201m", "ITE303c", "JPD123", "MAI391",
                "MAS291", "AIL303m", "CPV301", "DAP391m", "SSG105", "SWE201c", "AIT7_COM+1", "AIT7_COM+2", "DPL302m", "DWP301c",
                "NLP301c", "OJT202", "AIT7_COM+3", "DAT301m", "ENW493c", "EXE101", "PMG201c", "AIT7_COM+4", "AIT301c", "EXE201",
                "MLN111", "MLN122", "REL301m", "AIT7_GRA_ELE", "HCM202", "MLN131", "VNR202", "CSI101", "SCX112"
        );

        Major seMajor = majorRepository.findBySchool_SchoolIdAndMajorCodeIgnoreCase(1, "SE").orElse(null);
        if (seMajor == null) {
            // Find by code globally if schoolId=1 is not guaranteed
            seMajor = majorRepository.findAll().stream().filter(m -> "SE".equalsIgnoreCase(m.getMajorCode())).findFirst().orElse(null);
        }

        Major aiMajor = majorRepository.findBySchool_SchoolIdAndMajorCodeIgnoreCase(1, "AI").orElse(null);
        if (aiMajor == null) {
            aiMajor = majorRepository.findAll().stream().filter(m -> "AI".equalsIgnoreCase(m.getMajorCode())).findFirst().orElse(null);
        }

        if (seMajor != null) {
            for (String code : seSubjects) {
                mapSubjectToMajor(code, seMajor);
            }
        }
        
        if (aiMajor != null) {
            for (String code : aiSubjects) {
                mapSubjectToMajor(code, aiMajor);
            }
        }
    }

    private void mapSubjectToMajor(String subjectCode, Major major) {
        Subject subject = subjectRepository.findBySubjectCode(subjectCode).orElse(null);
        if (subject != null) {
            if (!mappingRepository.existsBySubject_SubjectIdAndMajor_MajorId(subject.getSubjectId(), major.getMajorId())) {
                SubjectMajorMapping mapping = new SubjectMajorMapping();
                mapping.setSubject(subject);
                mapping.setMajor(major);
                mappingRepository.save(mapping);
            }
        }
    }
}
