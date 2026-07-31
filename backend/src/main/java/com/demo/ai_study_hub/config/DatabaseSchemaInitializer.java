package com.demo.ai_study_hub.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.sql.Connection;
import java.sql.DatabaseMetaData;

@Component
@RequiredArgsConstructor
@Slf4j
public class DatabaseSchemaInitializer implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) throws Exception {
        try {
            jdbcTemplate.execute((Connection conn) -> {
                DatabaseMetaData metaData = conn.getMetaData();
                String databaseName = metaData.getDatabaseProductName();
                log.info("DatabaseSchemaInitializer checking schema for database: {}", databaseName);

                try {
                    if (databaseName.toLowerCase().contains("mysql")) {
                        log.info("Applying MySQL schema fix: making ai_chat_sessions.document_id nullable...");
                        jdbcTemplate.execute("ALTER TABLE ai_chat_sessions MODIFY COLUMN document_id INT NULL");
                        log.info("MySQL schema fix applied successfully.");
                    } else if (databaseName.toLowerCase().contains("h2")) {
                        log.info("Applying H2 schema fix: making ai_chat_sessions.document_id nullable...");
                        jdbcTemplate.execute("ALTER TABLE ai_chat_sessions ALTER COLUMN document_id INT NULL");
                        log.info("H2 schema fix applied successfully.");
                    }
                } catch (Exception ex) {
                    log.warn("DatabaseSchemaInitializer could not apply column nullability patch (it might be already nullable): {}", ex.getMessage());
                }
                return null;
            });
        } catch (Exception e) {
            log.error("DatabaseSchemaInitializer failed: {}", e.getMessage());
        }
    }
}
