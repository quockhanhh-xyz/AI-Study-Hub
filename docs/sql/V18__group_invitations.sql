CREATE TABLE group_invitations (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    group_id INT NOT NULL,
    email VARCHAR(255) NOT NULL,
    invited_at DATETIME NOT NULL,
    CONSTRAINT fk_group_invitations_group FOREIGN KEY (group_id) REFERENCES study_groups(group_id),
    UNIQUE KEY uq_group_invite (group_id, email)
);
