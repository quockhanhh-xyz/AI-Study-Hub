# Database Design - AI Study Hub

## Database Name

```text
ai_study_hub
```

---

# Main Tables

## 1. Table `users`

Stores user account information and account status.

| Column Name     | Data Type    | Constraints                           | Description                                                                                     |
| :-------------- | :----------- | :------------------------------------ | :---------------------------------------------------------------------------------------------- |
| `user_id`       | INT          | PRIMARY KEY, AUTO_INCREMENT, NOT NULL | Unique user ID                                                                                  |
| `email`         | VARCHAR(100) | UNIQUE, NOT NULL                      | User email used for login                                                                       |
| `password_hash` | VARCHAR(255) | NOT NULL                              | Hashed password                                                                                 |
| `full_name`     | VARCHAR(255) | NOT NULL                              | User full name                                                                                  |
| `role`          | VARCHAR(20)  | DEFAULT 'USER', NOT NULL              | User role: USER or ADMIN                                                                        |
| `tier`          | VARCHAR(20)  | DEFAULT 'FREE', NOT NULL              | Account tier: FREE or PREMIUM                                                                   |
| `status`        | VARCHAR(30)  | DEFAULT 'INACTIVE', NOT NULL          | INACTIVE: not verified by OTP, ACTIVE: verified and allowed to login, BLOCKED: blocked by admin |
| `created_at`    | TIMESTAMP    | DEFAULT CURRENT_TIMESTAMP             | Account creation time                                                                           |
| `updated_at`    | TIMESTAMP    | NULLABLE                              | Last update time                                                                                |

### Business Rules

- A newly registered user must have status `INACTIVE`.
- Only users with status `ACTIVE` can log in.
- Users with status `BLOCKED` cannot log in or use system features.
- Passwords must be stored as hashed values, not plain text.

---

## 2. Table `otp_codes`

Stores OTP codes used for email verification.

| Column Name  | Data Type   | Constraints                                     | Description                             |
| :----------- | :---------- | :---------------------------------------------- | :-------------------------------------- |
| `otp_id`     | INT         | PRIMARY KEY, AUTO_INCREMENT, NOT NULL           | Unique OTP ID                           |
| `user_id`    | INT         | FOREIGN KEY REFERENCES users(user_id), NOT NULL | User who owns this OTP                  |
| `otp_code`   | VARCHAR(6)  | NOT NULL                                        | 6-digit OTP code                        |
| `purpose`    | VARCHAR(30) | DEFAULT 'REGISTER', NOT NULL                    | OTP purpose: REGISTER or RESET_PASSWORD |
| `expires_at` | TIMESTAMP   | NOT NULL                                        | OTP expiration time                     |
| `used`       | BOOLEAN     | DEFAULT FALSE, NOT NULL                         | Whether the OTP has already been used   |
| `created_at` | TIMESTAMP   | DEFAULT CURRENT_TIMESTAMP                       | OTP creation time                       |

### Business Rules

- OTP code must contain exactly 6 digits.
- Register OTP must expire after 5 minutes.
- Used OTP cannot be verified again.
- A user must become `ACTIVE` after successful register OTP verification.
- Resend OTP creates a new OTP for an `INACTIVE` user.

---

## 3. Table `documents`

Stores document metadata.

| Column Name   | Data Type    | Description                                        |
| :------------ | :----------- | :------------------------------------------------- |
| `id`          | INT          | Primary key                                        |
| `title`       | VARCHAR(255) | Document title                                     |
| `description` | TEXT         | Document description                               |
| `file_name`   | VARCHAR(255) | Original file name                                 |
| `file_type`   | VARCHAR(50)  | File type such as PDF, DOCX, PPTX, TXT, IMAGE, ZIP |
| `file_size`   | BIGINT       | File size in bytes                                 |
| `file_url`    | TEXT         | Firebase Storage file URL                          |
| `owner_id`    | INT          | References users(user_id)                          |
| `subject_id`  | INT          | References subjects(id)                            |
| `folder_id`   | INT          | References folders(id)                             |
| `created_at`  | TIMESTAMP    | Document upload time                               |
| `updated_at`  | TIMESTAMP    | Last update time                                   |

---

## 4. Table `folders`

Stores user folders.

| Column Name  | Data Type    | Description               |
| :----------- | :----------- | :------------------------ |
| `id`         | INT          | Primary key               |
| `name`       | VARCHAR(100) | Folder name               |
| `owner_id`   | INT          | References users(user_id) |
| `created_at` | TIMESTAMP    | Folder creation time      |

---

## 5. Table `subjects`

Stores subject or category information.

| Column Name   | Data Type    | Description         |
| :------------ | :----------- | :------------------ |
| `id`          | INT          | Primary key         |
| `name`        | VARCHAR(100) | Subject name        |
| `description` | TEXT         | Subject description |

---

## 6. Table `document_shares`

Stores document sharing permissions.

| Column Name   | Data Type   | Description               |
| :------------ | :---------- | :------------------------ |
| `id`          | INT         | Primary key               |
| `document_id` | INT         | References documents(id)  |
| `shared_by`   | INT         | References users(user_id) |
| `shared_to`   | INT         | References users(user_id) |
| `permission`  | VARCHAR(20) | VIEW or DOWNLOAD          |
| `created_at`  | TIMESTAMP   | Share creation time       |

---

## 7. Table `ai_usage_limits`

Stores AI usage records.

| Column Name    | Data Type   | Description               |
| :------------- | :---------- | :------------------------ |
| `id`           | INT         | Primary key               |
| `user_id`      | INT         | References users(user_id) |
| `usage_date`   | DATE        | Usage date                |
| `feature_type` | VARCHAR(30) | CHAT, QUIZ, FLASHCARD     |
| `usage_count`  | INT         | Number of uses            |

---

## 8. Table `reports`

Stores user reports for documents.

| Column Name   | Data Type   | Description                 |
| :------------ | :---------- | :-------------------------- |
| `id`          | INT         | Primary key                 |
| `document_id` | INT         | References documents(id)    |
| `reported_by` | INT         | References users(user_id)   |
| `reason`      | TEXT        | Report reason               |
| `status`      | VARCHAR(30) | PENDING, REVIEWED, REJECTED |
| `created_at`  | TIMESTAMP   | Report creation time        |

---

## 9. Table `system_logs`

Stores important admin or system actions.

| Column Name   | Data Type    | Description                    |
| :------------ | :----------- | :----------------------------- |
| `id`          | INT          | Primary key                    |
| `actor_id`    | INT          | References users(user_id)      |
| `action`      | VARCHAR(100) | Action name                    |
| `target_type` | VARCHAR(50)  | USER, DOCUMENT, REPORT, SYSTEM |
| `target_id`   | INT          | Target object ID               |
| `reason`      | TEXT         | Action reason                  |
| `created_at`  | TIMESTAMP    | Action time                    |
