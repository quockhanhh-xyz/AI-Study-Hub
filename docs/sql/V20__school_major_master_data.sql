-- Migration: School and Major Master Data
-- Please execute this script manually to initialize the schema and seed initial data.

-- 1. Create schools table
CREATE TABLE IF NOT EXISTS schools (
    school_id INT AUTO_INCREMENT PRIMARY KEY,
    school_code VARCHAR(50) NOT NULL UNIQUE,
    school_name VARCHAR(255) NOT NULL,
    short_name VARCHAR(50) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'ACTIVE' NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Create majors table
CREATE TABLE IF NOT EXISTS majors (
    major_id INT AUTO_INCREMENT PRIMARY KEY,
    school_id INT NOT NULL,
    major_code VARCHAR(50) NOT NULL,
    major_name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'ACTIVE' NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_major_school FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE RESTRICT,
    CONSTRAINT uq_school_major_code UNIQUE (school_id, major_code),
    CONSTRAINT uq_school_major_name UNIQUE (school_id, major_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Seed FPT University
INSERT INTO schools (school_code, school_name, short_name, description, status)
VALUES ('FPT', 'FPT University', 'FPTU', 'FPT University Vietnam', 'ACTIVE')
ON DUPLICATE KEY UPDATE school_name = VALUES(school_name);

-- 4. Seed FPT Majors (SE & AI)
INSERT INTO majors (school_id, major_code, major_name, description, status)
SELECT school_id, 'AI', 'Artificial Intelligence', 'Artificial Intelligence program', 'ACTIVE'
FROM schools WHERE school_code = 'FPT'
ON DUPLICATE KEY UPDATE major_name = VALUES(major_name);

INSERT INTO majors (school_id, major_code, major_name, description, status)
SELECT school_id, 'SE', 'Software Engineering', 'Software Engineering program', 'ACTIVE'
FROM schools WHERE school_code = 'FPT'
ON DUPLICATE KEY UPDATE major_name = VALUES(major_name);

-- 5. Add school_id and major_id to users and documents tables
ALTER TABLE users ADD COLUMN IF NOT EXISTS school_id INT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS major_id INT NULL;

ALTER TABLE documents ADD COLUMN IF NOT EXISTS school_id INT NULL;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS major_id INT NULL;

-- 6. Migrate existing string-based school_name and major values in users to foreign keys
UPDATE users u
JOIN schools s ON s.school_code = 'FPT'
SET u.school_id = s.school_id
WHERE u.school_id IS NULL AND (LOWER(u.school_name) LIKE '%fpt%' OR LOWER(u.school_name) = 'fpt university');

UPDATE users u
JOIN majors m ON m.major_code = 'SE' AND m.school_id = u.school_id
SET u.major_id = m.major_id
WHERE u.major_id IS NULL AND (LOWER(u.major) LIKE '%software%' OR LOWER(u.major) = 'se');

UPDATE users u
JOIN majors m ON m.major_code = 'AI' AND m.school_id = u.school_id
SET u.major_id = m.major_id
WHERE u.major_id IS NULL AND (LOWER(u.major) LIKE '%artificial%' OR LOWER(u.major) = 'ai');

-- 7. Add foreign key constraints
ALTER TABLE users ADD CONSTRAINT fk_user_school FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE RESTRICT;
ALTER TABLE users ADD CONSTRAINT fk_user_major FOREIGN KEY (major_id) REFERENCES majors(major_id) ON DELETE RESTRICT;

ALTER TABLE documents ADD CONSTRAINT fk_document_school FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE RESTRICT;
ALTER TABLE documents ADD CONSTRAINT fk_document_major FOREIGN KEY (major_id) REFERENCES majors(major_id) ON DELETE RESTRICT;
