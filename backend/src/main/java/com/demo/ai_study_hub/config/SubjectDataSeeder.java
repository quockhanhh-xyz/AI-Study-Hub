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
                {"SE_COM*4_ELE", "Học phần 4 của combo SE"},
                {"HCM202", "Ho Chi Minh Ideology"},
                {"MLN131", "Scientific socialism"},
                {"SE_GRA_ELE", "Graduation Elective - Software Engineering"},
                {"VNR202", "History of Communist Party of Vietnam"}
        };

        for (String[] s : subjects) {
            Subject subject = subjectRepository.findBySubjectCode(s[0]).orElse(null);
            if (subject == null) {
                subject = new Subject();
                subject.setSubjectCode(s[0]);
                subject.setSubjectName(s[1]);
            }
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
    }
}
