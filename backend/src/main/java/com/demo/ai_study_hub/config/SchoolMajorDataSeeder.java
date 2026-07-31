package com.demo.ai_study_hub.config;

import com.demo.ai_study_hub.entity.Major;
import com.demo.ai_study_hub.entity.School;
import com.demo.ai_study_hub.repository.MajorRepository;
import com.demo.ai_study_hub.repository.SchoolRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class SchoolMajorDataSeeder implements CommandLineRunner {

    private final SchoolRepository schoolRepository;
    private final MajorRepository majorRepository;
    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) {
        log.info("Running School and Major master data seeding...");

        // 1. Seed FPT University if not exists
        School fpt = schoolRepository.findBySchoolCodeIgnoreCase("FPT").orElse(null);
        if (fpt == null) {
            fpt = new School();
            fpt.setSchoolCode("FPT");
            fpt.setSchoolName("FPT University");
            fpt.setShortName("FPTU");
            fpt.setDescription("FPT University Vietnam");
            fpt.setStatus("ACTIVE");
            fpt = schoolRepository.save(fpt);
            log.info("Seeded School: FPT University");
        }

        // 2. Seed AI Major if not exists
        Major ai = majorRepository.findBySchool_SchoolIdAndMajorCodeIgnoreCase(fpt.getSchoolId(), "AI").orElse(null);
        if (ai == null) {
            ai = new Major();
            ai.setSchool(fpt);
            ai.setMajorCode("AI");
            ai.setMajorName("Artificial Intelligence");
            ai.setDescription("Artificial Intelligence Major");
            ai.setStatus("ACTIVE");
            majorRepository.save(ai);
            log.info("Seeded Major: Artificial Intelligence for FPT");
        }

        // 3. Seed SE Major if not exists
        Major se = majorRepository.findBySchool_SchoolIdAndMajorCodeIgnoreCase(fpt.getSchoolId(), "SE").orElse(null);
        if (se == null) {
            se = new Major();
            se.setSchool(fpt);
            se.setMajorCode("SE");
            se.setMajorName("Software Engineering");
            se.setDescription("Software Engineering Major");
            se.setStatus("ACTIVE");
            majorRepository.save(se);
            log.info("Seeded Major: Software Engineering for FPT");
        }

        // 4. Java-based migration seeder using JdbcTemplate - User Migration
        try {
            List<Map<String, Object>> usersToMigrate = jdbcTemplate.queryForList(
                "SELECT user_id, school_name, major FROM users WHERE school_id IS NULL OR major_id IS NULL"
            );

            if (!usersToMigrate.isEmpty()) {
                log.info("Found {} users to migrate to School & Major master data.", usersToMigrate.size());
                for (Map<String, Object> row : usersToMigrate) {
                    Number userId = (Number) row.get("user_id");
                    String oldSchoolName = (String) row.get("school_name");
                    String oldMajor = (String) row.get("major");

                    Integer targetSchoolId = null;
                    Integer targetMajorId = null;

                    if (oldSchoolName != null) {
                        String lowerSchool = oldSchoolName.toLowerCase();
                        if (lowerSchool.contains("fpt") || lowerSchool.contains("fptu")) {
                            targetSchoolId = fpt.getSchoolId();
                        }
                    }

                    if (oldMajor != null && targetSchoolId != null) {
                        String lowerMajor = oldMajor.toLowerCase().trim();
                        if (lowerMajor.equals("ai") || lowerMajor.equals("artificial intelligence") || lowerMajor.contains("trí tuệ nhân tạo")) {
                            targetMajorId = ai.getMajorId();
                        } else if (lowerMajor.equals("se") || lowerMajor.equals("software engineering") || lowerMajor.contains("kỹ thuật phần mềm") || lowerMajor.contains("công nghệ phần mềm")) {
                            targetMajorId = se.getMajorId();
                        }
                    }

                    if (targetSchoolId != null || targetMajorId != null) {
                        jdbcTemplate.update(
                            "UPDATE users SET school_id = ?, major_id = ? WHERE user_id = ?",
                            targetSchoolId, targetMajorId, userId
                        );
                    }
                }
                log.info("Completed migration of users to School & Major master data.");
            }
        } catch (Exception e) {
            log.warn("School/Major user migration warning: {}", e.getMessage());
        }

        // 5. Java-based migration seeder using JdbcTemplate - Document Migration
        try {
            int updatedDocs = jdbcTemplate.update(
                "UPDATE documents d SET " +
                "d.school_id = (SELECT u.school_id FROM users u WHERE u.user_id = d.owner_id), " +
                "d.major_id = (SELECT u.major_id FROM users u WHERE u.user_id = d.owner_id) " +
                "WHERE d.school_id IS NULL AND d.major_id IS NULL AND EXISTS " +
                "(SELECT 1 FROM users u WHERE u.user_id = d.owner_id AND u.school_id IS NOT NULL)"
            );
            if (updatedDocs > 0) {
                log.info("Backfilled school_id and major_id for {} legacy documents based on owner profile.", updatedDocs);
            }
        } catch (Exception e) {
            log.warn("School/Major document migration warning: {}", e.getMessage());
        }
    }
}
