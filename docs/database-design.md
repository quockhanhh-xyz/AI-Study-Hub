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

Stores uploaded document metadata. The real file is stored in Cloudinary Storage.

| Column Name    | Data Type    | Constraints                                           | Description                                                            |
| :------------- | :----------- | :---------------------------------------------------- | :--------------------------------------------------------------------- |
| `document_id`  | INT          | PRIMARY KEY, AUTO_INCREMENT, NOT NULL                 | Unique document ID                                                     |
| `title`        | VARCHAR(255) | NOT NULL                                              | User-facing document title                                             |
| `description`  | TEXT         | NULLABLE                                              | Optional document description                                          |
| `file_name`    | VARCHAR(255) | NOT NULL                                              | Original uploaded file name (mapped to `originalFileName` in DTO)      |
| `file_type`    | VARCHAR(50)  | NOT NULL                                              | File type such as PDF, DOCX, PPTX, TXT, PNG, JPG, JPEG                 |
| `file_size`    | BIGINT       | NOT NULL                                              | File size in bytes                                                     |
| `file_url`     | TEXT         | NOT NULL                                              | Cloudinary secure URL used by frontend to open or download file        |
| `storage_path` | TEXT         | NOT NULL                                              | Cloudinary public ID (mapped to `publicId` in DTO)                     |
| `owner_id`     | INT          | FOREIGN KEY REFERENCES users(user_id), NOT NULL       | User who owns this document                                            |
| `subject_id`   | INT          | FOREIGN KEY REFERENCES subjects(subject_id), NULLABLE | Subject this document belongs to                                       |
| `folder_id`    | INT          | FOREIGN KEY REFERENCES folders(folder_id), NULLABLE   | Folder this document belongs to (added in Step 5)                      |
| `status`       | VARCHAR(30)  | DEFAULT 'ACTIVE', NOT NULL                            | Document status: ACTIVE or DELETED                                     |
| `created_at`   | TIMESTAMP    | DEFAULT CURRENT_TIMESTAMP                             | Document upload time                                                   |
| `updated_at`   | TIMESTAMP    | NULLABLE                                              | Last update time                                                       |
| `deleted_at`   | TIMESTAMP    | NULLABLE                                              | Document deletion time (when soft-deleted)                             |

### Business Rules

- A document must belong to exactly one user.
- `owner_id` must be resolved from the authenticated JWT token / security session, not from frontend input.
- The uploaded file must be validated by the backend before being stored.
- Allowed file types are: `pdf`, `doc`, `docx`, `ppt`, `pptx`, `xls`, `xlsx`, `txt`, `jpg`, `jpeg`, `png` (case-insensitive).
- Maximum file size is 10MB (10,485,760 bytes).
- Cloudinary Storage stores the real file; MySQL stores metadata only.
- A document can optionally be assigned a `subject_id`.
- In Step 5, a document can optionally be assigned to a `folder_id`. The folder must belong to the same user.
- Soft-deletion: When a document is deleted, its `status` is set to `'DELETED'` in MySQL, and `deleted_at` is populated with the current timestamp. Soft-deleted documents must not be returned in standard lists or detail endpoints.
- Restoration: A soft-deleted document can be restored by resetting `status` to `'ACTIVE'` and `deleted_at` to `null`. If the folder it belonged to was permanently deleted, the document is restored to the root/unassigned level.
- Permanent deletion: When a document is permanently deleted from the trash:
  - The database record is deleted from MySQL.
  - The physical file is deleted from Cloudinary Storage using its `storage_path` (public ID).

---

## 4. Table `folders`

Stores user folders.

| Column Name  | Data Type    | Constraints                                     | Description                                |
| :----------- | :----------- | :---------------------------------------------- | :----------------------------------------- |
| `folder_id`  | INT          | PRIMARY KEY, AUTO_INCREMENT, NOT NULL           | Unique folder ID                           |
| `name`       | VARCHAR(100) | NOT NULL                                        | Folder name                                |
| `owner_id`   | INT          | FOREIGN KEY REFERENCES users(user_id), NOT NULL | User who owns this folder                  |
| `parent_folder_id` | INT    | FOREIGN KEY REFERENCES folders(folder_id), NULLABLE | Parent folder ID (NULL for root level)  |
| `status`     | VARCHAR(30)  | DEFAULT 'ACTIVE', NOT NULL                      | Folder status: ACTIVE or DELETED           |
| `created_at` | TIMESTAMP    | DEFAULT CURRENT_TIMESTAMP                       | Folder creation time                       |
| `updated_at` | TIMESTAMP    | NULLABLE                                        | Last update time                           |
| `deleted_at` | TIMESTAMP    | NULLABLE                                        | Folder deletion time (when soft-deleted)   |

### Business Rules

- A folder must belong to exactly one user.
- `owner_id` must be resolved from the authenticated JWT token / security session, not from frontend input.
- Folder name must be unique per user under the same parent folder for ACTIVE folders (i.e. a user cannot have two active folders with the same name inside the same parent folder). A user can create a folder with the same name as a soft-deleted folder.
- Root level folders have `parent_folder_id = NULL`. In the frontend UI, this root level is displayed as `"My Documents"`.
- Nested folders: Folders can contain other subfolders through `parent_folder_id`.
- Soft-deletion: When a folder is deleted, its `status` is set to `'DELETED'` in MySQL, and `deleted_at` is populated with the current timestamp. All nested child subfolders and documents inside the folder must recursively be soft-deleted with the same `deleted_at` timestamp.
- Restoration: A soft-deleted folder can be restored by setting `status` to `'ACTIVE'` and `deleted_at` to `null`. All documents and nested subfolders in the trash that were soft-deleted with the same `deleted_at` timestamp are recursively restored to `'ACTIVE'` status.
- Permanent deletion: When a folder is permanently deleted:
  - The folder record is deleted from MySQL.
  - All nested subfolders and documents currently inside the folder (recursively) are also permanently deleted from MySQL.
  - Their physical files must be deleted from Cloudinary Storage using their `storage_path` (public ID).

---

## 5. Table `subjects`

Stores subject or category information.

| Column Name   | Data Type    | Constraints                           | Description                                            |
| :------------ | :----------- | :------------------------------------ | :----------------------------------------------------- |
| `subject_id`  | INT          | PRIMARY KEY, AUTO_INCREMENT, NOT NULL | Unique subject ID                                      |
| `subject_code`| VARCHAR(50)  | UNIQUE, NOT NULL                      | Short code for the subject (e.g., SWP391)              |
| `subject_name`| VARCHAR(255) | NOT NULL                              | Full subject name (e.g., Software Project)             |
| `description` | TEXT         | NULLABLE                              | Optional subject description                           |
| `status`      | VARCHAR(30)  | DEFAULT 'ACTIVE', NOT NULL            | Status: ACTIVE or INACTIVE                             |
| `created_at`  | TIMESTAMP    | DEFAULT CURRENT_TIMESTAMP, NOT NULL   | Subject creation time                                  |
| `updated_at`  | TIMESTAMP    | NULLABLE                              | Last update time                                       |

### Business Rules

- A subject is unique by its `subject_code`.
- Only subjects with status `'ACTIVE'` will be returned by default in the list API.

---

## 6. Table `document_shares`

Stores document sharing permissions.

| Column Name   | Data Type   | Description               |
| :------------ | :---------- | :------------------------ |
| `id`          | INT         | Primary key               |
| `document_id` | INT         | References documents(document_id) |
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
| `document_id` | INT         | References documents(document_id) |
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
