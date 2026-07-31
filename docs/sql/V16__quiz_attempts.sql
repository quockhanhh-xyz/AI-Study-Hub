CREATE TABLE quiz_attempts (
    attempt_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    quiz_set_id BIGINT NOT NULL,
    user_id INT NOT NULL,
    score DOUBLE NOT NULL,
    total_questions INT NOT NULL,
    correct_count INT NOT NULL,
    percentage DOUBLE NOT NULL,
    started_at DATETIME NULL,
    completed_at DATETIME NULL,
    created_at DATETIME NOT NULL,
    CONSTRAINT fk_quiz_attempts_quiz_set FOREIGN KEY (quiz_set_id) REFERENCES quiz_sets(quiz_set_id),
    CONSTRAINT fk_quiz_attempts_user FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE quiz_attempt_answers (
    attempt_answer_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    attempt_id BIGINT NOT NULL,
    question_id BIGINT NOT NULL,
    selected_option VARCHAR(10) NULL,
    correct_option VARCHAR(10) NOT NULL,
    is_correct BOOLEAN NOT NULL,
    answered_at DATETIME NULL,
    CONSTRAINT fk_quiz_attempt_answers_attempt FOREIGN KEY (attempt_id) REFERENCES quiz_attempts(attempt_id) ON DELETE CASCADE,
    CONSTRAINT fk_quiz_attempt_answers_question FOREIGN KEY (question_id) REFERENCES quiz_questions(question_id)
);
