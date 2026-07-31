-- V15__document_favorites.sql
-- Mini Step: Document Favorites / Saved Documents

CREATE TABLE document_favorites (
                                    favorite_id   BIGINT AUTO_INCREMENT PRIMARY KEY,
                                    user_id       INT NOT NULL,
                                    document_id   INT NOT NULL,
                                    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

                                    CONSTRAINT fk_favorite_user
                                        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
                                    CONSTRAINT fk_favorite_document
                                        FOREIGN KEY (document_id) REFERENCES documents(document_id) ON DELETE CASCADE,

    -- Prevents duplicate favorites at the DB level, not just at the
    -- service layer (defense in depth, same convention as folder_shares).
                                    CONSTRAINT uq_favorite_user_document UNIQUE (user_id, document_id)
);

CREATE INDEX idx_favorite_user_created_at ON document_favorites (user_id, created_at);
