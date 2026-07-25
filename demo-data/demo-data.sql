-- =================================================================================
-- AI Study Hub - Full Demo Data Script (All features included)
-- Dữ liệu mẫu hoàn chỉnh, đầy đủ cho mọi tính năng của dự án.
-- =================================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Xóa toàn bộ dữ liệu cũ
TRUNCATE TABLE ai_chat_messages;
TRUNCATE TABLE ai_chat_sessions;
TRUNCATE TABLE ai_usage_logs;
TRUNCATE TABLE quiz_options;
TRUNCATE TABLE quiz_questions;
TRUNCATE TABLE quiz_sets;
TRUNCATE TABLE flashcards;
TRUNCATE TABLE flashcard_sets;
TRUNCATE TABLE group_chat_messages;
TRUNCATE TABLE group_invitations;
TRUNCATE TABLE study_group_members;
TRUNCATE TABLE study_groups;
TRUNCATE TABLE document_favorites;
TRUNCATE TABLE documents;
TRUNCATE TABLE folders;
TRUNCATE TABLE subjects;
TRUNCATE TABLE plan_configs;
TRUNCATE TABLE notifications;
TRUNCATE TABLE users;

-- 2. Dữ liệu bảng `plan_configs` (Gói cước)
INSERT INTO plan_configs (plan_id, plan_name, price, ai_daily_limit, max_upload_size_mb, support_level, created_at, updated_at) VALUES
(1, 'FREE', 0, 5, 20, 'STANDARD', NOW(), NOW()),
(2, 'PREMIUM', 99000, 50, 100, 'PRIORITY', NOW(), NOW());

-- 3. Dữ liệu bảng `users`
INSERT INTO users (user_id, email, password_hash, full_name, role, tier, status, school_name, major, student_code, created_at, updated_at) VALUES
(1, 'admin@aistudyhub.edu.vn', '$2a$10$XQY3.hT9x1F9C8qVbLQKf.32U9F7sD/5q9V/3U2C8d8w5D.t9x3', 'Quản Trị Viên', 'ADMIN', 'PREMIUM', 'ACTIVE', 'ĐH Bách Khoa', 'CNTT', 'AD01', NOW(), NOW()),
(2, 'nguyenvana@gmail.com', '$2a$10$XQY3.hT9x1F9C8qVbLQKf.32U9F7sD/5q9V/3U2C8d8w5D.t9x3', 'Nguyễn Văn An', 'USER', 'FREE', 'ACTIVE', 'ĐH KHTN', 'Khoa Học Máy Tính', 'SV001', NOW(), NOW()),
(3, 'tranthib@gmail.com', '$2a$10$XQY3.hT9x1F9C8qVbLQKf.32U9F7sD/5q9V/3U2C8d8w5D.t9x3', 'Trần Thị Bình', 'USER', 'PREMIUM', 'ACTIVE', 'ĐH Bách Khoa', 'Kỹ Thuật Phần Mềm', 'SV002', NOW(), NOW()),
(4, 'lehoangc@edu.vn', '$2a$10$XQY3.hT9x1F9C8qVbLQKf.32U9F7sD/5q9V/3U2C8d8w5D.t9x3', 'Lê Hoàng Cường', 'USER', 'FREE', 'ACTIVE', 'ĐH FPT', 'AI', 'SV003', NOW(), NOW());

-- 4. Dữ liệu bảng `subjects`
INSERT INTO subjects (subject_id, subject_code, subject_name, description, status, scope, owner_id, created_at, updated_at) VALUES
(1, 'IT001', 'Nhập môn lập trình', 'Kiến thức cơ bản C/C++', 'ACTIVE', 'SYSTEM', 1, NOW(), NOW()),
(2, 'IT002', 'Lập trình hướng đối tượng', 'OOP với Java', 'ACTIVE', 'SYSTEM', 1, NOW(), NOW()),
(3, 'IT003', 'Cấu trúc dữ liệu và giải thuật', 'CTDL cơ bản, thuật toán', 'ACTIVE', 'SYSTEM', 1, NOW(), NOW()),
(4, 'IT004', 'Cơ sở dữ liệu', 'Mô hình ERD, SQL', 'ACTIVE', 'SYSTEM', 1, NOW(), NOW());

-- 5. Dữ liệu bảng `folders`
INSERT INTO folders (folder_id, name, description, owner_id, parent_folder_id, status, created_at, updated_at) VALUES
(1, 'Tài liệu HK1', 'Năm nhất', 2, NULL, 'ACTIVE', NOW(), NOW()),
(2, 'Bài tập nhóm CSDL', 'Lưu trữ đồ án', 3, NULL, 'ACTIVE', NOW(), NOW());

-- 6. Dữ liệu bảng `documents`
INSERT INTO documents (document_id, title, description, file_name, file_type, file_size, file_url, storage_path, subject_id, owner_id, folder_id, status, visibility, approval_status, view_count, download_count, created_at, updated_at) VALUES
(1, 'Slide NMLT', 'Tóm tắt cú pháp C', 'Slide_NMLT.pdf', 'application/pdf', 1500000, 'https://res.cloudinary.com/demo/image/upload/sample.pdf', 'path1', 1, 2, 1, 'ACTIVE', 'PUBLIC', 'APPROVED', 150, 45, NOW(), NOW()),
(2, 'Đề thi OOP', 'Đề năm ngoái', 'De_OOP.docx', 'application/vnd.openxmlformats', 500000, 'https://res.cloudinary.com/demo/image/upload/sample2.docx', 'path2', 2, 3, NULL, 'ACTIVE', 'PUBLIC', 'APPROVED', 210, 80, NOW(), NOW());

-- 7. Dữ liệu bảng `document_favorites`
INSERT INTO document_favorites (favorite_id, user_id, document_id, created_at) VALUES
(1, 2, 2, NOW()),
(2, 3, 1, NOW());

-- 8. Dữ liệu bảng `study_groups` và `study_group_members`
INSERT INTO study_groups (group_id, group_name, description, invite_code, owner_id, status, requires_approval, created_at, updated_at) VALUES
(1, 'Hội cuồng code', 'Nhóm share kinh nghiệm lập trình', 'CPLUS123', 2, 'ACTIVE', 0, NOW(), NOW()),
(2, 'Ôn thi CSDL', 'Luyện giải SQL', 'SQLDB456', 3, 'ACTIVE', 1, NOW(), NOW());

INSERT INTO study_group_members (member_id, group_id, user_id, role, status, joined_at, updated_at) VALUES
(1, 1, 2, 'OWNER', 'ACTIVE', NOW(), NOW()),
(2, 1, 3, 'MEMBER', 'ACTIVE', NOW(), NOW()),
(3, 2, 3, 'OWNER', 'ACTIVE', NOW(), NOW()),
(4, 2, 4, 'MEMBER', 'ACTIVE', NOW(), NOW());

-- 9. Dữ liệu bảng `group_chat_messages`
INSERT INTO group_chat_messages (message_id, group_id, user_id, content, created_at) VALUES
(1, 1, 2, 'Chào mọi người, mình mới join nhé!', NOW()),
(2, 1, 3, 'Chào bạn, cùng cố gắng nhé.', NOW());

-- 10. Dữ liệu bảng `flashcard_sets` và `flashcards`
INSERT INTO flashcard_sets (flashcard_set_id, document_id, user_id, title, item_count, model, source_chunk_count, created_at, updated_at) VALUES
(1, 1, 2, 'Từ vựng OOP cơ bản', 2, 'gemini-2.5-flash', 10, NOW(), NOW());

INSERT INTO flashcards (flashcard_id, flashcard_set_id, front_text, back_text, difficulty, position) VALUES
(1, 1, 'Encapsulation là gì?', 'Tính đóng gói, che giấu thông tin bên trong class.', 'EASY', 1),
(2, 1, 'Polymorphism là gì?', 'Tính đa hình, cho phép object có nhiều hình thái.', 'MEDIUM', 2);

-- 11. Dữ liệu bảng `quiz_sets`, `quiz_questions`, `quiz_options`
INSERT INTO quiz_sets (quiz_set_id, document_id, user_id, title, question_count, model, source_chunk_count, created_at, updated_at) VALUES
(1, 2, 3, 'Trắc nghiệm OOP', 1, 'gemini-2.5-flash', 5, NOW(), NOW());

INSERT INTO quiz_questions (question_id, quiz_set_id, question_text, correct_option, explanation, difficulty, position) VALUES
(1, 1, 'Đâu là 4 tính chất của OOP?', 'A', 'Tính đóng gói, kế thừa, đa hình, trừu tượng.', 'EASY', 1);

INSERT INTO quiz_options (option_id, question_id, option_key, option_text, position) VALUES
(1, 1, 'A', 'Đóng gói, kế thừa, đa hình, trừu tượng', 1),
(2, 1, 'B', 'Hàm, biến, lớp, đối tượng', 2),
(3, 1, 'C', 'Đa hình, đa nhiệm, đa luồng', 3),
(4, 1, 'D', 'Không có đáp án đúng', 4);

-- 12. Dữ liệu bảng `ai_chat_sessions`, `ai_chat_messages`
INSERT INTO ai_chat_sessions (session_id, user_id, document_id, title, status, created_at, updated_at) VALUES
(1, 2, 1, 'Hỏi đáp về C++', 'ACTIVE', NOW(), NOW());

INSERT INTO ai_chat_messages (message_id, session_id, role, content, provider, model_name, created_at) VALUES
(1, 1, 'USER', 'Giải thích cho tôi biến con trỏ?', NULL, NULL, NOW()),
(2, 1, 'ASSISTANT', 'Biến con trỏ là biến lưu địa chỉ bộ nhớ...', 'gemini', 'gemini-2.5-flash', NOW());

-- 13. Dữ liệu bảng `ai_usage_logs`
INSERT INTO ai_usage_logs (usage_id, user_id, document_id, request_type, input_tokens, output_tokens, total_tokens, provider, model_name, counted_as_question, status, created_at) VALUES
(1, 2, 1, 'ASK', 150, 100, 250, 'gemini', 'gemini-2.5-flash', 1, 'SUCCESS', NOW());

-- 14. Dữ liệu bảng `notifications`
INSERT INTO notifications (notification_id, user_id, title, message, type, is_read, created_at) VALUES
(1, 2, 'Tài liệu được duyệt', 'Tài liệu Slide NMLT đã được duyệt.', 'SYSTEM', 0, NOW()),
(2, 3, 'Nhóm mới', 'Bạn vừa được thêm vào nhóm CSDL', 'GROUP_INVITE', 0, NOW());

SET FOREIGN_KEY_CHECKS = 1;
