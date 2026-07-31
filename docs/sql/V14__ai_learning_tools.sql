-- Migration SQL for Step 14: AI Learning Tools (Summary, Flashcard, Quiz)

-- Table: ai_summaries
CREATE TABLE ai_summaries (
    summary_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    document_id INT NOT NULL,
    user_id INT NOT NULL,
    overview TEXT NOT NULL,
    key_points_json TEXT NOT NULL,
    important_terms_json TEXT NOT NULL,
    review_questions_json TEXT NOT NULL,
    model VARCHAR(100) NOT NULL,
    status VARCHAR(30) NOT NULL,
    source_processed_at DATETIME NULL,
    source_chunk_count INT NOT NULL,
    content_version VARCHAR(50) NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    CONSTRAINT fk_ai_summaries_doc FOREIGN KEY (document_id) REFERENCES documents(document_id) ON DELETE CASCADE,
    CONSTRAINT fk_ai_summaries_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Table: flashcard_sets
CREATE TABLE flashcard_sets (
    flashcard_set_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    document_id INT NOT NULL,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    item_count INT NOT NULL,
    model VARCHAR(100) NOT NULL,
    source_processed_at DATETIME NULL,
    source_chunk_count INT NOT NULL,
    content_version VARCHAR(50) NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    CONSTRAINT fk_flashcard_sets_doc FOREIGN KEY (document_id) REFERENCES documents(document_id) ON DELETE CASCADE,
    CONSTRAINT fk_flashcard_sets_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Table: flashcards
CREATE TABLE flashcards (
    flashcard_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    flashcard_set_id BIGINT NOT NULL,
    front_text TEXT NOT NULL,
    back_text TEXT NOT NULL,
    source_page INT NULL,
    difficulty VARCHAR(20) NULL,
    position INT NOT NULL,
    CONSTRAINT fk_flashcards_set FOREIGN KEY (flashcard_set_id) REFERENCES flashcard_sets(flashcard_set_id) ON DELETE CASCADE
);

-- Table: quiz_sets
CREATE TABLE quiz_sets (
    quiz_set_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    document_id INT NOT NULL,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    question_count INT NOT NULL,
    model VARCHAR(100) NOT NULL,
    source_processed_at DATETIME NULL,
    source_chunk_count INT NOT NULL,
    content_version VARCHAR(50) NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    CONSTRAINT fk_quiz_sets_doc FOREIGN KEY (document_id) REFERENCES documents(document_id) ON DELETE CASCADE,
    CONSTRAINT fk_quiz_sets_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Table: quiz_questions
CREATE TABLE quiz_questions (
    question_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    quiz_set_id BIGINT NOT NULL,
    question_text TEXT NOT NULL,
    correct_option VARCHAR(1) NOT NULL,
    explanation TEXT NOT NULL,
    difficulty VARCHAR(20) NOT NULL,
    position INT NOT NULL,
    CONSTRAINT fk_quiz_questions_set FOREIGN KEY (quiz_set_id) REFERENCES quiz_sets(quiz_set_id) ON DELETE CASCADE
);

-- Table: quiz_options
CREATE TABLE quiz_options (
    option_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    question_id BIGINT NOT NULL,
    option_key VARCHAR(1) NOT NULL,
    option_text TEXT NOT NULL,
    position INT NOT NULL,
    CONSTRAINT fk_quiz_options_question FOREIGN KEY (question_id) REFERENCES quiz_questions(question_id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_ai_summaries_user_document_created
ON ai_summaries(user_id, document_id, created_at);

CREATE INDEX idx_flashcard_sets_user_document_created
ON flashcard_sets(user_id, document_id, created_at);

CREATE INDEX idx_quiz_sets_user_document_created
ON quiz_sets(user_id, document_id, created_at);

CREATE INDEX idx_flashcards_set_position
ON flashcards(flashcard_set_id, position);

CREATE INDEX idx_quiz_questions_set_position
ON quiz_questions(quiz_set_id, position);

CREATE INDEX idx_quiz_options_question_position
ON quiz_options(question_id, position);
