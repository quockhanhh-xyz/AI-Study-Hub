package com.demo.ai_study_hub.config;

import com.demo.ai_study_hub.entity.Major;
import com.demo.ai_study_hub.entity.School;
import com.demo.ai_study_hub.entity.Subject;
import com.demo.ai_study_hub.entity.SubjectMajorMapping;
import com.demo.ai_study_hub.repository.MajorRepository;
import com.demo.ai_study_hub.repository.SchoolRepository;
import com.demo.ai_study_hub.repository.SubjectMajorMappingRepository;
import com.demo.ai_study_hub.repository.SubjectRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
@Slf4j
@Order(10) // Run after basic seeders
public class UITDataSeeder implements CommandLineRunner {

    private final SchoolRepository schoolRepository;
    private final MajorRepository majorRepository;
    private final SubjectRepository subjectRepository;
    private final SubjectMajorMappingRepository mappingRepository;

    @Override
    @Transactional
    public void run(String... args) {
        log.info("Running UIT master data seeding...");

        // 1. Seed UIT School
        School uit = schoolRepository.findBySchoolCodeIgnoreCase("UIT").orElse(null);
        if (uit == null) {
            uit = new School();
            uit.setSchoolCode("UIT");
            uit.setSchoolName("University of Information Technology");
            uit.setShortName("UIT");
            uit.setDescription("VNUHCM - University of Information Technology");
            uit.setStatus("ACTIVE");
            uit = schoolRepository.save(uit);
            log.info("Seeded School: UIT");
        }

        // 2. Seed Majors
        Major khmt = seedMajor(uit, "CS", "Computer Science");
        Major ktmt = seedMajor(uit, "CE", "Computer Engineering");

        // 3. Subjects - KHMT
        String[][] khmtSubjects = {
                {"CS005", "Introduction to Computer Science"},
                {"CS105", "Computer Graphics"},
                {"CS106", "Artificial Intelligence"},
                {"CS110", "Introduction to Knowledge Engineering and Machine Learning"},
                {"CS111", "Principles and Techniques of Programming"},
                {"CS112", "Design and Analysis of Algorithms"},
                {"CS113", "Computer Graphics and Digital Image Processing"},
                {"CS114", "Machine Learning"},
                {"CS115", "Mathematics for Computer Science"},
                {"CS116", "Python for Machine Learning"},
                {"CS117", "Computational Thinking"},
                {"CS211", "Advanced Artificial Intelligence"},
                {"CS214", "Knowledge Representation and Reasoning"},
                {"CS217", "Knowledge-Based Systems"},
                {"CS221", "Natural Language Processing"},
                {"CS222", "Advanced Natural Language Processing"},
                {"CS226", "Computational Linguistics"},
                {"CS229", "Computational Semantics"},
                {"CS231", "Introduction to Computer Vision"},
                {"CS232", "Introduction to Multimedia Computing"},
                {"CS302", "Seminar"},
                {"CS311", "Artificial Intelligence Programming Techniques"},
                {"CS312", "Multi-Agent Systems"},
                {"CS313", "Data Mining and Applications"},
                {"CS314", "Symbolic Programming in Artificial Intelligence"},
                {"CS315", "Advanced Machine Learning"},
                {"CS316", "Intelligent Problem-Solving Systems"},
                {"CS317", "Machine Learning Operations"},
                {"CS321", "Corpus Linguistics"},
                {"CS323", "Question-Answering Systems"}
        };
        seedSubjectsAndMapping(khmtSubjects, khmt);

        // 4. Subjects - KTMT
        String[][] ktmtSubjects = {
                {"CE005", "Introduction to Computer Engineering"},
                {"CE006", "Introduction to Integrated Circuit Design"},
                {"CE103", "Microprocessors and Microcontrollers"},
                {"CE105", "Digital Signal Processing"},
                {"CE118", "Digital Logic Design"},
                {"CE119", "Computer Architecture Laboratory"},
                {"CE121", "Theory of Electrical Circuits"},
                {"CE122", "Engineering Circuit Analysis"},
                {"CE124", "Electronic Devices and Circuits"},
                {"CE125", "Introduction to Circuit Analysis"},
                {"CE126", "Semiconductor Physics and Applications"},
                {"CE201", "Project 1"},
                {"CE206", "Project 2"},
                {"CE207", "Project on Integrated Circuit Design 1"},
                {"CE208", "Project on Integrated Circuit Design 2"},
                {"CE212", "Automatic Control"},
                {"CE213", "Digital System Design with HDL"},
                {"CE222", "Digital Integrated Circuit Design"},
                {"CE224", "Embedded Systems Design"},
                {"CE226", "VLSI Design"},
                {"CE232", "Wireless Embedded Systems Design"},
                {"CE233", "Robot Principles and Design"},
                {"CE3031", "Sensor Technologies"},
                {"CE304", "Industrial Robotics"},
                {"CE313", "Parallel Processing and Distributed Systems"},
                {"CE315", "System Programming with Java"},
                {"CE317", "Advanced Automatic Control"},
                {"CE318", "Compiler"},
                {"CE320", "Fuzzy Logic for Embedded Systems Applications"},
                {"CE323", "Printed Circuit Board Design"}
        };
        seedSubjectsAndMapping(ktmtSubjects, ktmt);

        log.info("Completed UIT master data seeding.");
    }

    private Major seedMajor(School school, String code, String name) {
        // First try to find by Code
        Major major = majorRepository.findBySchool_SchoolIdAndMajorCodeIgnoreCase(school.getSchoolId(), code).orElse(null);
        
        // If not found by Code, try to find by Name (to handle our KHMT -> CS transition where name remained "Computer Science")
        if (major == null) {
            major = majorRepository.findBySchool_SchoolIdAndMajorNameIgnoreCase(school.getSchoolId(), name).orElse(null);
        }

        if (major == null) {
            major = new Major();
            major.setSchool(school);
            major.setMajorCode(code);
            major.setMajorName(name);
            major.setDescription(name);
            major.setStatus("ACTIVE");
            major = majorRepository.save(major);
            log.info("Seeded Major: {} for {}", code, school.getSchoolCode());
        } else {
            boolean updated = false;
            if (!code.equals(major.getMajorCode())) {
                major.setMajorCode(code);
                updated = true;
            }
            if (!name.equals(major.getMajorName())) {
                major.setMajorName(name);
                major.setDescription(name);
                updated = true;
            }
            if (updated) {
                major = majorRepository.save(major);
                log.info("Updated Major: {} - {} for {}", code, name, school.getSchoolCode());
            }
        }
        return major;
    }

    private void seedSubjectsAndMapping(String[][] subjects, Major major) {
        for (String[] s : subjects) {
            String code = s[0];
            String name = s[1];

            // 1. Create/Update Subject
            Subject subject = subjectRepository.findBySubjectCode(code).orElse(null);
            if (subject == null) {
                subject = new Subject();
                subject.setSubjectCode(code);
            }
            subject.setSubjectName(name);
            subject.setStatus("ACTIVE");
            subject.setScope("SYSTEM");
            subject.setOwner(null);
            subject = subjectRepository.save(subject);

            // 2. Create Mapping if not exists
            boolean mappingExists = mappingRepository.existsBySubject_SubjectIdAndMajor_MajorId(
                    subject.getSubjectId(), major.getMajorId());
            
            if (!mappingExists) {
                SubjectMajorMapping mapping = new SubjectMajorMapping();
                mapping.setSubject(subject);
                mapping.setMajor(major);
                mappingRepository.save(mapping);
            }
        }
    }
}
