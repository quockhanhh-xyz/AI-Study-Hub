-- Migration: explicit Subject -> Major mapping.
-- School is derived through majors.school_id, so the mapping table does not
-- duplicate school_id.

CREATE TABLE IF NOT EXISTS subject_major_mappings (
    mapping_id INT AUTO_INCREMENT PRIMARY KEY,
    subject_id INT NOT NULL,
    major_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_subject_major UNIQUE (subject_id, major_id),
    CONSTRAINT fk_subject_major_subject
        FOREIGN KEY (subject_id) REFERENCES subjects(subject_id) ON DELETE CASCADE,
    CONSTRAINT fk_subject_major_major
        FOREIGN KEY (major_id) REFERENCES majors(major_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE subject_requests ADD COLUMN IF NOT EXISTS school_id INT NULL;
ALTER TABLE subject_requests ADD COLUMN IF NOT EXISTS major_id INT NULL;

ALTER TABLE subject_requests
    ADD CONSTRAINT fk_subject_request_school
    FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE RESTRICT;

ALTER TABLE subject_requests
    ADD CONSTRAINT fk_subject_request_major
    FOREIGN KEY (major_id) REFERENCES majors(major_id) ON DELETE RESTRICT;

-- Preserve valid classifications already used by existing documents.
INSERT IGNORE INTO subject_major_mappings (subject_id, major_id)
SELECT DISTINCT d.subject_id, d.major_id
FROM documents d
JOIN subjects s ON s.subject_id = d.subject_id
WHERE d.subject_id IS NOT NULL
  AND d.major_id IS NOT NULL
  AND UPPER(s.scope) = 'SYSTEM';
