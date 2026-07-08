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
| `tier`          | VARCHAR(20)  | DEFAULT 'FREE', NOT NULL              | Account tier: FREE, PREMIUM, or ULTRA                                                           |
| `tier_expires_at`| DATETIME     | NULLABLE                              | Expiration datetime for paid tiers (PREMIUM, ULTRA). Null for FREE users.                        |
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
| :------------- |:-------------| :---------------------------------------------------- | :--------------------------------------------------------------------- |
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
| `visibility`   | VARCHAR(20)  | DEFAULT 'PRIVATE', NOT NULL                            | Document visibility: PRIVATE or PUBLIC                                 |
| `approval_status`| VARCHAR(20)  | DEFAULT 'PENDING', NOT NULL                            | Approval status for PUBLIC documents: PENDING, APPROVED, REJECTED      |
| `published_at` | TIMESTAMP    | NULLABLE                                              | Timestamp when the document was published                              |
| `view_count`   | BIGINT       | DEFAULT 0, NOT NULL                                    | Number of times the public document detail was viewed                                 |
| `download_count`| BIGINT       | DEFAULT 0, NOT NULL                                    | Number of times the public document was downloaded                             |
| `created_at`   | TIMESTAMP    | DEFAULT CURRENT_TIMESTAMP                             | Document upload time                                                   |
| `updated_at`   | TIMESTAMP    | NULLABLE                                              | Last update time                                                       |
| `deleted_at`   | TIMESTAMP    | NULLABLE                                              | Document deletion time (when soft-deleted)                             |

### Business Rules

- A document must belong to exactly one user.
- `owner_id` must be resolved from the authenticated JWT token / security session, not from frontend input.
- The uploaded file must be validated by the backend before being stored.
- Allowed file types are: `pdf`, `doc`, `docx`, `ppt`, `pptx`, `xls`, `xlsx`, `txt`, `jpg`, `jpeg`, `png` (case-insensitive).
- Maximum file size is resolved dynamically from the user's effective tier: FREE (10MB / 10,485,760 bytes), PREMIUM (50MB / 52,428,800 bytes), or ULTRA (100MB / 104,857,600 bytes).
- Cloudinary Storage stores the real file; MySQL stores metadata only.
- A document can optionally be assigned a `subject_id`.
- In Step 5, a document can optionally be assigned to a `folder_id`. The folder must belong to the same user.
- Soft-deletion: When a document is deleted, its `status` is set to `'DELETED'` in MySQL, and `deleted_at` is populated with the current timestamp. Soft-deleted documents must not be returned in standard lists or detail endpoints.
- Restoration: A soft-deleted document can be restored by resetting `status` to `'ACTIVE'` and `deleted_at` to `null`. If the folder it belonged to was permanently deleted, the document is restored to the root/unassigned level.
- Public publishing: When an owner publishes a document, `visibility` transitions to `'PUBLIC'`, `approval_status` is updated to `'APPROVED'` (auto-approved for the current phase), and `published_at` is set to the current timestamp.
- Unpublishing: When an owner unpublishes a document, `visibility` transitions back to `'PRIVATE'` and `published_at` is cleared to `null`.
- Guest access: Only documents with `status = 'ACTIVE'`, `visibility = 'PUBLIC'`, and `approval_status = 'APPROVED'` are visible to guest users.
- Counters: `view_count` increments on successful public document detail fetches. `download_count` increments on successful secure public document downloads.
- Permanent deletion: When a document is permanently deleted from the trash:
  - The database record is deleted from MySQL.
  - The physical file is deleted from Cloudinary Storage using its `storage_path` (public ID).
- Legacy Data Backfill Migration: To prevent NullPointerExceptions and ensure correct access control values for documents created before this step, execute the following SQL migration:
  ```sql
  UPDATE documents SET visibility = 'PRIVATE' WHERE visibility IS NULL;
  UPDATE documents SET approval_status = 'PENDING' WHERE approval_status IS NULL;
  UPDATE documents SET view_count = 0 WHERE view_count IS NULL;
  UPDATE documents SET download_count = 0 WHERE download_count IS NULL;
  ```

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
- Soft-deletion: A folder can only be deleted if it is empty (i.e., it contains no ACTIVE documents and no ACTIVE subfolders). If the folder is not empty, the deletion request must be rejected. When an empty folder is soft-deleted, its `status` is set to `'DELETED'` in MySQL, and `deleted_at` is populated with the current timestamp.
- Restoration: A soft-deleted folder (which is empty) can be restored by setting `status` to `'ACTIVE'` and `deleted_at` to `null`.
- Permanent deletion: When a soft-deleted folder is permanently deleted from the trash, the folder record is permanently removed from MySQL.


---

## 5. Table `subjects`

Stores subject or category information.

| Column Name   | Data Type    | Constraints                                          | Description                                            |
| :------------ | :----------- | :---------------------------------------------------- | :----------------------------------------------------- |
| `subject_id`  | INT          | PRIMARY KEY, AUTO_INCREMENT, NOT NULL                 | Unique subject ID                                      |
| `subject_code`| VARCHAR(50)  | NOT NULL                                              | Short code for the subject (e.g., SWP391)              |
| `subject_name`| VARCHAR(255) | NOT NULL                                              | Full subject name (e.g., Software Project)             |
| `description` | TEXT         | NULLABLE                                              | Optional subject description                           |
| `status`      | VARCHAR(30)  | DEFAULT 'ACTIVE', NOT NULL                            | Status: ACTIVE or INACTIVE                             |
| `scope`       | VARCHAR(20)  | DEFAULT 'SYSTEM', NOT NULL                            | Subject scope: SYSTEM or USER_CUSTOM                   |
| `owner_id`    | INT          | FOREIGN KEY REFERENCES users(user_id), NULLABLE       | Owner of the custom subject. NULL for SYSTEM subjects  |
| `created_at`  | TIMESTAMP    | DEFAULT CURRENT_TIMESTAMP, NOT NULL                   | Subject creation time                                  |
| `updated_at`  | TIMESTAMP    | NULLABLE                                              | Last update time                                       |

### Business Rules

- `scope = SYSTEM`: `owner_id` is NULL, visible to all users, seeded by the system.
- `scope = USER_CUSTOM`: `owner_id` is the creating user's ID, visible only to that owner.
- A subject's `subject_code` and `subject_name` must not duplicate another subject (SYSTEM or the same user's USER_CUSTOM subjects) — checked at the application level, not by a unique DB constraint, since custom subjects from different users may share the same code/name.
- Only subjects with status `'ACTIVE'` will be returned by default in the list API.
- Document upload and update only accept a SYSTEM subject or a USER_CUSTOM subject owned by the current user. Using another user's custom subject is rejected with `403 Forbidden`.

---

## 6. Table `document_shares`

Stores direct document sharing metadata.

| Column Name            | Data Type   | Constraints                                                 | Description                                            |
| :--------------------- | :---------- | :---------------------------------------------------------- | :----------------------------------------------------- |
| `share_id`             | INT         | PRIMARY KEY, AUTO_INCREMENT, NOT NULL                       | Unique share ID                                        |
| `document_id`          | INT         | FOREIGN KEY REFERENCES documents(document_id), NOT NULL     | Document being shared                                  |
| `shared_by`            | INT         | FOREIGN KEY REFERENCES users(user_id), NOT NULL             | User who shared the document                           |
| `shared_with_user_id`  | INT         | FOREIGN KEY REFERENCES users(user_id), NOT NULL             | Target user who receives the share                     |
| `permission`           | VARCHAR(20) | DEFAULT 'VIEW', NOT NULL                                    | Sharing permission: VIEW                               |
| `status`               | VARCHAR(20) | DEFAULT 'ACTIVE', NOT NULL                                  | Status: ACTIVE or REVOKED                              |
| `created_at`           | TIMESTAMP   | DEFAULT CURRENT_TIMESTAMP                                   | Creation timestamp                                     |
| `updated_at`           | TIMESTAMP   | NULLABLE                                                    | Last update timestamp                                  |

---

## 6.1. Table `study_groups`

Stores user study groups.

| Column Name   | Data Type    | Constraints                                           | Description                                  |
| :------------ | :----------- | :---------------------------------------------------- | :------------------------------------------- |
| `group_id`    | INT          | PRIMARY KEY, AUTO_INCREMENT, NOT NULL                 | Unique group ID                              |
| `group_name`  | VARCHAR(100) | NOT NULL                                              | Group name                                   |
| `description` | TEXT         | NULLABLE                                              | Optional group description                   |
| `invite_code` | VARCHAR(50)  | UNIQUE, NOT NULL                                      | Alphanumeric invite code for joining         |
| `owner_id`    | INT          | FOREIGN KEY REFERENCES users(user_id), NOT NULL       | User who created the group (Owner)           |
| `status`      | VARCHAR(30)  | DEFAULT 'ACTIVE', NOT NULL                            | Group status: ACTIVE or DELETED              |
| `created_at`  | TIMESTAMP    | DEFAULT CURRENT_TIMESTAMP                             | Group creation time                          |
| `updated_at`  | TIMESTAMP    | NULLABLE                                              | Last update time                             |

---

## 6.2. Table `study_group_members`

Stores study group memberships.

| Column Name | Data Type   | Constraints                                                 | Description                                     |
| :---------- | :---------- | :---------------------------------------------------------- | :---------------------------------------------- |
| `member_id` | INT         | PRIMARY KEY, AUTO_INCREMENT, NOT NULL                       | Unique member record ID                         |
| `group_id`  | INT         | FOREIGN KEY REFERENCES study_groups(group_id), NOT NULL     | Group association                               |
| `user_id`   | INT         | FOREIGN KEY REFERENCES users(user_id), NOT NULL             | User member association                         |
| `role`      | VARCHAR(20) | DEFAULT 'MEMBER', NOT NULL                                  | Role: OWNER or MEMBER                           |
| `status`    | VARCHAR(30) | DEFAULT 'ACTIVE', NOT NULL                                  | Member status: ACTIVE, REMOVED, or LEFT         |
| `joined_at` | TIMESTAMP   | DEFAULT CURRENT_TIMESTAMP                                   | Timestamp when member joined                    |
| `updated_at`| TIMESTAMP   | NULLABLE                                                    | Last update time                                |

---

## 6.3. Table `group_document_shares`

Stores documents shared into study groups.

| Column Name   | Data Type   | Constraints                                                 | Description                                     |
| :------------ | :---------- | :---------------------------------------------------------- | :---------------------------------------------- |
| `share_id`    | INT         | PRIMARY KEY, AUTO_INCREMENT, NOT NULL                       | Unique group share ID                           |
| `document_id` | INT         | FOREIGN KEY REFERENCES documents(document_id), NOT NULL     | Document shared                                 |
| `group_id`    | INT         | FOREIGN KEY REFERENCES study_groups(group_id), NOT NULL     | Target group receiving share                    |
| `shared_by`   | INT         | FOREIGN KEY REFERENCES users(user_id), NOT NULL             | Member who shared the document                  |
| `permission`  | VARCHAR(20) | DEFAULT 'VIEW', NOT NULL                                    | Sharing permission: VIEW                        |
| `status`      | VARCHAR(20) | DEFAULT 'ACTIVE', NOT NULL                                  | Share status: ACTIVE or REVOKED                 |
| `created_at`  | TIMESTAMP   | DEFAULT CURRENT_TIMESTAMP                                   | Creation timestamp                              |
| `updated_at`  | TIMESTAMP   | NULLABLE                                                    | Last update timestamp                           |

---

## 6.4. Table `folder_shares`

Stores direct folder sharing metadata.

| Column Name           | Data Type   | Constraints                                                 | Description                                            |
| :-------------------- | :---------- | :---------------------------------------------------------- | :----------------------------------------------------- |
| `share_id`            | INT         | PRIMARY KEY, AUTO_INCREMENT, NOT NULL                       | Unique share ID                                        |
| `folder_id`           | INT         | FOREIGN KEY REFERENCES folders(folder_id), NOT NULL         | Folder being shared                                    |
| `shared_by`           | INT         | FOREIGN KEY REFERENCES users(user_id), NOT NULL             | User who shared the folder                             |
| `shared_with_user_id` | INT         | FOREIGN KEY REFERENCES users(user_id), NOT NULL             | Target user who receives the shared folder             |
| `permission`          | VARCHAR(20) | DEFAULT 'VIEW', NOT NULL                                    | Sharing permission: VIEW                               |
| `status`              | VARCHAR(20) | DEFAULT 'ACTIVE', NOT NULL                                  | Status: ACTIVE or REVOKED                              |
| `created_at`          | TIMESTAMP   | DEFAULT CURRENT_TIMESTAMP                                   | Creation timestamp                                     |
| `updated_at`          | TIMESTAMP   | NULLABLE                                                    | Last update timestamp                                  |

### Constraints
- Unique index: `folder_id` + `shared_with_user_id`

---

## 6.5. Table `group_folder_shares`

Stores folders shared into study groups.

| Column Name  | Data Type   | Constraints                                                 | Description                                     |
| :----------- | :---------- | :---------------------------------------------------------- | :---------------------------------------------- |
| `share_id`   | INT         | PRIMARY KEY, AUTO_INCREMENT, NOT NULL                       | Unique group folder share ID                    |
| `folder_id`  | INT         | FOREIGN KEY REFERENCES folders(folder_id), NOT NULL         | Folder shared                                   |
| `group_id`   | INT         | FOREIGN KEY REFERENCES study_groups(group_id), NOT NULL     | Target group receiving share                    |
| `shared_by`  | INT         | FOREIGN KEY REFERENCES users(user_id), NOT NULL             | Member who shared the folder                    |
| `permission` | VARCHAR(20) | DEFAULT 'VIEW', NOT NULL                                    | Sharing permission: VIEW                        |
| `status`     | VARCHAR(20) | DEFAULT 'ACTIVE', NOT NULL                                  | Share status: ACTIVE or REVOKED                 |
| `created_at` | TIMESTAMP   | DEFAULT CURRENT_TIMESTAMP                                   | Creation timestamp                              |
| `updated_at` | TIMESTAMP   | NULLABLE                                                    | Last update timestamp                           |

### Constraints
- Unique index: `folder_id` + `group_id`

---

### Business Rules & Constraints (Step 6A & 6B)

#### 1. Group Management & Permissions
- **Group Creation**: Any registered user with status `ACTIVE` can create a study group. The creator is automatically added as `OWNER` of the group with status `ACTIVE` in `study_group_members`.
- **Unique Invite Code**: An 8-character unique uppercase alphanumeric invite code is generated automatically by the backend upon group creation.
- **Group Joining**: Active users join a group using its active `inviteCode`. Users already in the group (status `ACTIVE`) cannot join again. If a user previously left or was removed, their membership record status is reset to `ACTIVE` and role to `MEMBER`.
- **Group Details**: Only active group members (OWNER or MEMBER) can view group details and member lists.
- **Edit/Delete Group**: Only the group `OWNER` can edit group metadata or delete the group. Group deletion is a soft delete (`status = 'DELETED'`). Once a group is deleted, its members and shared documents are no longer accessible.
- **Leave Group**: Active members with the `MEMBER` role can leave the group (membership status set to `LEFT`). The group `OWNER` cannot leave the group in MVP; they must delete the group instead. Upon leaving, all active group document shares and folder shares created by the leaving member in this group are set to `REVOKED`.
- **Remove Member**: Only the group `OWNER` can remove other members from the group (membership status set to `REMOVED`). The owner cannot remove themselves. Upon removal, all active group document shares and folder shares created by the removed member in this group are set to `REVOKED`.

#### 2. Document Sharing & Permissions (Step 6A)
- **Direct Share**: Only the document owner can share their document directly to another user by email.
  - The document must be `ACTIVE`.
  - Recipient email must belong to an `ACTIVE` user.
  - Self-sharing is blocked.
  - Duplicate active shares are blocked.
  - Direct share records are soft-revoked by setting `status = 'REVOKED'`.
- **Group Share**: Only the document owner can share their document into a study group.
  - The document owner must be an active member (OWNER or MEMBER) of the target group.
  - The group must be `ACTIVE` (not deleted).
  - Duplicate active group shares are blocked.
  - Group share records are soft-revoked by setting `status = 'REVOKED'`.
- **Revocation Permissions**:
  - Direct share can only be revoked by the document owner.
  - Group share can be revoked by either the document owner OR the group owner. Group members cannot revoke other members' documents.
- **Read-Only Restrictions**:
  - Shared users (via direct share, group share, or folder tree inheritance) only have read access to the shared documents. They are strictly prohibited from editing, moving, or deleting these documents.
- **Trash & Soft Delete Impact**:
  - Trashed/deleted documents (`status = 'DELETED'` or moved to trash) are immediately hidden from "Shared With Me" and group document directories.
  - Restoring a document will make it visible again under all its active share records.
  - Deleting a group hides all document shares within that group.
- **Unique Active Share Recommendation**:
  To technically enforce duplicate share prevention at the database level while allowing multiple historical `REVOKED` records, partial unique indexes are recommended:
  - Direct sharing unique constraint: `document_shares(document_id, shared_with_user_id, status)` (enforced when `status = 'ACTIVE'`)
  - Group sharing unique constraint: `group_document_shares(document_id, group_id, status)` (enforced when `status = 'ACTIVE'`)

#### 3. Folder Sharing & Permissions (Step 6B)
- **Direct Folder Sharing**:
  - Only the folder owner can share their folder directly to another user by email.
  - The folder must be `ACTIVE`.
  - Recipient email must belong to an `ACTIVE` user.
  - Self-sharing is blocked.
  - Direct folder share is soft-revoked by setting `status = 'REVOKED'`.
- **Group Folder Sharing**:
  - Only the folder owner can share their folder into a study group.
  - Folder must be `ACTIVE`, and the target group must be `ACTIVE` (not deleted).
  - The folder owner must be an active member (OWNER or MEMBER) of the target group.
  - Group folder share is soft-revoked by setting `status = 'REVOKED'`.
- **Duplicate Sharing & Reactivation**:
  - Attempting to share an actively shared folder to the same user or group yields a `409 Conflict`.
  - If a sharing record already exists with status `REVOKED`, re-sharing the same folder will reactivate the record (update status to `ACTIVE`) instead of creating a new row.
- **Recursive Folder Access Rules**:
  - Sharing a parent folder grants view access recursively to all nested subfolders and active documents within it.
  - A user is granted access to a folder if:
    1. The user is the owner of the folder.
    2. The folder has an active direct share to the user.
    3. The folder has an active group share to a group where the user is an active member.
    4. Any ancestor of the folder in the directory tree satisfies condition 2 or 3.
- **Shared Content Rendering & Directory Scopes**:
  - **Shared With Me** only lists the root folders that were directly shared with the user (excludes nested subfolders of shared trees to avoid redundancy).
  - **Group Folders list** only lists the root folders that were directly shared with the group.
  - GET `/api/folders/{id}/shared-content` returns only the immediate active subfolders and immediate active documents inside the queried folder, enforcing that the current user has access to that folder.
- **Document Access via Folder Sharing**:
  - Users are allowed to open or download active documents if they own the document, are directly shared the document, or if the document's current folder is part of an actively shared folder tree.
  - If a document is moved out of the shared folder tree, access to the document via folder sharing is immediately revoked.
- **Breadcrumb Rules**:
  - In shared folder detail views, the breadcrumb trail is dynamically constructed to start from the highest shared root folder (the folder directly shared with the user or group). It will never expose the path leading up to the shared root from the owner's private directory (e.g. hides the owner's root "My Documents").
- **Revocation Permissions**:
  - Direct folder shares can only be revoked by the folder owner.
  - Group folder shares can be revoked by the folder owner OR the target group owner.

#### 4. MVP Exclusions (Remaining Exclusions)
- **Regenerate Invite Code**: Invite codes are static and cannot be regenerated.
- **Transfer Owner**: Group ownership cannot be transferred to other members.
- **Group Chat**: Communication features within study groups are excluded from MVP.
- **Notifications**: In-app or email notifications for new shares or group invites are excluded.
- **Public Link Sharing**: Only member-specific direct shares and group shares are supported; no public URL sharing is implemented.
- **Shared Folder Modification**: Uploading, editing, deleting, or moving items inside folders shared by others is blocked (read-only permissions).

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

---

## 10. Table `document_contents`

Stores the full extracted text content and processing metadata for documents.

| Column Name | Data Type | Description |
| :--- | :--- | :--- |
| `content_id` | BIGINT AUTO_INCREMENT | Primary key |
| `document_id` | INT UNIQUE | Foreign Key referencing `documents(document_id)` (ON DELETE CASCADE) |
| `extracted_text` | LONGTEXT | Full cleaned extracted text content |
| `processing_status` | VARCHAR(30) | Enum state: PENDING, PROCESSING, COMPLETED, FAILED, UNSUPPORTED, EMPTY_CONTENT |
| `character_count` | INT | Number of characters in the stored extracted text |
| `original_character_count` | INT | Original length before truncation |
| `word_count` | INT | Number of words in the stored text |
| `is_truncated` | BOOLEAN | Indicates if the text exceeded the 200k limit and was truncated |
| `processing_started_at` | DATETIME | Timestamp when processing started |
| `processed_at` | DATETIME | Timestamp when processing successfully finished |
| `last_attempt_status` | VARCHAR(30) | Outcome of the last processing attempt |
| `last_attempt_error` | VARCHAR(1000) | Error message if last processing attempt failed |
| `last_attempted_at` | DATETIME | Timestamp of the last processing attempt |
| `created_at` | DATETIME | Audit creation timestamp |
| `updated_at` | DATETIME | Audit modification timestamp |
| `version` | BIGINT | Optimistic locking version |

---

## 11. Table `document_chunks`

Stores the partitioned ordered chunks of a document's extracted text for AI context.

| Column Name | Data Type | Description |
| :--- | :--- | :--- |
| `chunk_id` | BIGINT AUTO_INCREMENT | Primary key |
| `document_id` | INT | Foreign Key referencing `documents(document_id)` (ON DELETE CASCADE) |
| `chunk_index` | INT | Sequence index of the chunk starting from 0 |
| `chunk_text` | LONGTEXT | Content text of the chunk |
| `character_count` | INT | Number of characters in the chunk |
| `page_number` | INT | Associated page number (PDF citation support) |
| `source_label` | VARCHAR(255) | Label indicating page/slide/section |
| `start_offset` | INT | Character index in original text where chunk starts |
| `end_offset` | INT | Character index in original text where chunk ends |
| `created_at` | DATETIME | Audit creation timestamp |

- **Constraints**:
  - `UNIQUE KEY uk_doc_chunks_doc_index (document_id, chunk_index)`
  - `INDEX idx_doc_chunks_doc_id (document_id)`

---

# AI Document Chat Tables (Step 10)

## 14. Table `ai_chat_sessions`

Stores one chat session per user per document. Sessions are soft-deleted, not physically removed.

| Column Name | Data Type | Constraints | Description |
|:---|:---|:---|:---|
| `session_id` | BIGINT | PRIMARY KEY, AUTO_INCREMENT, NOT NULL | Unique session ID |
| `user_id` | INT | FOREIGN KEY → `users(user_id)`, NOT NULL | User who owns this session |
| `document_id` | INT | FOREIGN KEY → `documents(document_id)`, NOT NULL | Document being chatted about |
| `title` | VARCHAR(255) | NULLABLE | Auto-generated from first question (first 100 chars) |
| `status` | VARCHAR(20) | DEFAULT `ACTIVE`, NOT NULL | Session status: `ACTIVE` \| `DELETED` |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Session creation time |
| `updated_at` | DATETIME | ON UPDATE CURRENT_TIMESTAMP | Last update time |
| `deleted_at` | DATETIME | NULLABLE | Soft-delete timestamp |

### Business Rules

- One user can have at most one `ACTIVE` session per document.
- If no session exists, backend auto-creates one on the first AI question.
- Deleting a session sets `status = DELETED` and `deleted_at = NOW()`.
- Usage logs are never deleted along with the session.

### Indexes

```sql
INDEX idx_ai_chat_sessions_user_doc (user_id, document_id)
```

---

## 15. Table `ai_chat_messages`

Stores individual messages in a chat session. Messages are never physically deleted.

| Column Name | Data Type | Constraints | Description |
|:---|:---|:---|:---|
| `message_id` | BIGINT | PRIMARY KEY, AUTO_INCREMENT, NOT NULL | Unique message ID |
| `session_id` | BIGINT | FOREIGN KEY → `ai_chat_sessions(session_id)`, NOT NULL | Parent session |
| `role` | VARCHAR(20) | NOT NULL | Message role: `USER` \| `ASSISTANT` |
| `content` | TEXT | NOT NULL | Message text content |
| `provider` | VARCHAR(50) | NULLABLE | AI provider used: `gemini` \| `mock` (null for USER messages) |
| `model_name` | VARCHAR(100) | NULLABLE | AI model name used (null for USER messages) |
| `input_tokens` | INT | NULLABLE | Input token count (null for USER messages) |
| `output_tokens` | INT | NULLABLE | Output token count (null for USER messages) |
| `total_tokens` | INT | NULLABLE | Total tokens = input + output |
| `token_usage_estimated` | BOOLEAN | DEFAULT FALSE | True if token counts are estimates |
| `source_chunks` | TEXT | NULLABLE | JSON array of source chunks used: `[{"chunkIndex": 1, "sourceLabel": "Chunk 1"}]` |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Message creation time |

### Business Rules

- USER role messages: `provider`, `model_name`, token fields, `source_chunks` are all null.
- ASSISTANT role messages: `provider` and `model_name` must be set if AI was called.
- No-context fallback messages: `provider = null`, all token fields = 0.
- `token_usage_estimated = true` when provider does not return exact token counts.

### Indexes

```sql
INDEX idx_ai_chat_messages_session (session_id)
INDEX idx_ai_chat_messages_created (created_at)
```

---

## 16. Table `ai_usage_logs`

Audit log for all AI usage attempts. Used for quota enforcement and usage reporting.

| Column Name | Data Type | Constraints | Description |
|:---|:---|:---|:---|
| `usage_id` | BIGINT | PRIMARY KEY, AUTO_INCREMENT, NOT NULL | Unique log ID |
| `user_id` | INT | FOREIGN KEY → `users(user_id)`, NOT NULL | User who made the request |
| `document_id` | INT | FOREIGN KEY → `documents(document_id)`, NULLABLE | Document requested |
| `request_type` | VARCHAR(30) | DEFAULT `ASK`, NOT NULL | Type of AI request: `ASK` |
| `input_tokens` | INT | DEFAULT 0 | Input tokens (0 if AI was not called) |
| `output_tokens` | INT | DEFAULT 0 | Output tokens (0 if AI was not called) |
| `total_tokens` | INT | DEFAULT 0 | Total tokens |
| `token_usage_estimated` | BOOLEAN | DEFAULT FALSE | True if token counts are estimates |
| `provider` | VARCHAR(50) | NULLABLE | AI provider used (null if AI not called) |
| `model_name` | VARCHAR(100) | NULLABLE | AI model name used (null if AI not called) |
| `counted_as_question` | BOOLEAN | DEFAULT FALSE, NOT NULL | Counts toward daily quota only when `true` |
| `status` | VARCHAR(30) | DEFAULT `SUCCESS`, NOT NULL | Outcome: `SUCCESS` \| `FAILED` \| `SKIPPED_NO_CONTEXT` \| `QUOTA_EXCEEDED` \| `AI_NOT_CONFIGURED` |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Log creation time |

### Business Rules

- `counted_as_question = true` only when AI provider was called successfully and returned a valid response.
- The following do NOT set `counted_as_question = true`: no-context fallback, provider error, quota exceeded, AI not configured.
- Daily quota = count of rows where `user_id = X AND counted_as_question = true AND status = 'SUCCESS' AND created_at >= today_start`.
- Records are never deleted (kept for audit).

### Indexes

```sql
INDEX idx_ai_usage_logs_user_date (user_id, created_at)
INDEX idx_ai_usage_logs_user_status (user_id, status, counted_as_question)
```

---

# Payment & Account Tier Tables (Step 11 & Step 13B)

## 17. Table `payment_orders`

Stores user payment order records for plan subscriptions and VNPay integration auditing.

| Column Name | Data Type | Constraints | Description |
|:---|:---|:---|:---|
| `payment_id` | BIGINT | PRIMARY KEY, AUTO_INCREMENT, NOT NULL | Unique payment order ID |
| `user_id` | INT | FOREIGN KEY REFERENCES `users(user_id)`, NOT NULL | User who placed the order |
| `plan_code` | VARCHAR(50) | NOT NULL | Billing plan code (e.g. `PREMIUM_1_MONTH`, `ULTRA_1_MONTH`) |
| `target_tier` | VARCHAR(20) | NULLABLE | Target tier level user receives (e.g. `PREMIUM`, `ULTRA`) |
| `duration_months` | INT | NULLABLE | Duration of plan subscription in months |
| `amount` | BIGINT | NOT NULL | Price in currency ( VND - no decimals) |
| `currency` | VARCHAR(10) | DEFAULT `'VND'`, NOT NULL | Currency code |
| `status` | VARCHAR(30) | DEFAULT `'PENDING'`, NOT NULL | Order status: `PENDING` \| `SUCCESS` \| `FAILED` \| `CANCELLED` \| `EXPIRED` \| `REVIEW_REQUIRED` |
| `payment_method` | VARCHAR(50) | DEFAULT `'MOCK'`, NOT NULL | Payment method representation (e.g. `MOCK`, `VNPAY`) |
| `payment_provider` | VARCHAR(30) | DEFAULT `'MOCK'`, NOT NULL | Payment provider deciding logic (e.g. `MOCK`, `VNPAY_SANDBOX`) |
| `payment_url` | TEXT | NULLABLE | Generated sandbox gateway URL for pending orders |
| `vnp_txn_ref` | VARCHAR(100) | UNIQUE, NULLABLE | VNPay unique transaction reference identifier |
| `vnp_transaction_no` | VARCHAR(100) | NULLABLE | VNPay internal transaction sequence number |
| `vnp_response_code` | VARCHAR(20) | NULLABLE | Response status returned by VNPay |
| `vnp_transaction_status` | VARCHAR(20) | NULLABLE | Transaction status returned by VNPay |
| `vnp_bank_code` | VARCHAR(50) | NULLABLE | Bank code utilized for the transaction |
| `vnp_pay_date` | VARCHAR(30) | NULLABLE | Raw payment date string returned by VNPay (GMT+7 format) |
| `provider_paid_at` | DATETIME | NULLABLE | Converted UTC payment date parsed from provider response |
| `review_reason` | VARCHAR(100) | NULLABLE | Audit reason why the payment requires manual intervention |
| `review_required_at` | DATETIME | NULLABLE | Timestamp when order was pushed into review state |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Order creation timestamp |
| `paid_at` | DATETIME | NULLABLE | Timestamp when order was successfully finalized (UTC) |
| `expired_at` | DATETIME | NULLABLE | Expiration time of the pending transaction session (typically created_at + 15m) |
| `updated_at` | DATETIME | NULLABLE, ON UPDATE CURRENT_TIMESTAMP | Last status update timestamp |

### Business Rules

- **State Machine Status Definitions**:
  * `PENDING`: Payment is initiated and waiting for client actions.
  * `SUCCESS`: Payment verified successfully; user tier has been upgraded or renewed.
  * `FAILED`: Payment failed at checkout or rejected by provider.
  * `CANCELLED`: Payment cancelled manually by the user.
  * `EXPIRED`: Pending time window (`15 minutes`) has lapsed. Checked dynamically or during new order initiation.
  * `REVIEW_REQUIRED`: Discrepancy detected (e.g., late callback or downgrade mismatch). Tier updates are suspended.
- **Provider & Method Separation**:
  * `MOCK` ➔ method = `MOCK`, provider = `MOCK`.
  * `VNPAY_SANDBOX` ➔ method = `VNPAY`, provider = `VNPAY_SANDBOX`.
- **Review Reason Registry**:
  * `PAY_DATE_AFTER_EXPIRY`: Pay Date parsed from callback is past order `expiredAt`.
  * `PAY_DATE_PARSE_FAILED`: `vnp_PayDate` query payload has invalid syntax.
  * `AMOUNT_REQUIRES_REVIEW`: Callback amount does not match snapshot amount.
  * `PROVIDER_DATA_INCONSISTENT`: General discrepancy in provider query hash payload.
  * `TARGET_TIER_LOWER_THAN_CURRENT_TIER`: Callback targets `PREMIUM` but the user upgraded to `ULTRA` concurrently.
- **Expiry Rules**:
  * Only one pending order is allowed per user at a time.
  * Creating a new order or fetching details on an existing pending order forces expiration transitions if `now > expiredAt`.

### Indexes

```sql
CREATE UNIQUE INDEX uk_payment_orders_vnp_txn_ref ON payment_orders(vnp_txn_ref);
CREATE INDEX idx_payment_orders_user ON payment_orders(user_id);
CREATE INDEX idx_payment_orders_status ON payment_orders(status);
CREATE INDEX idx_payment_orders_user_status_expired ON payment_orders(user_id, status, expired_at);
```

---

# Study Group Chat Tables (Step 12)

## 18. Table `group_chat_messages`

Stores individual persistent chat messages exchanged within study groups.

| Column Name | Data Type | Constraints | Description |
|:---|:---|:---|:---|
| `message_id` | BIGINT | PRIMARY KEY, AUTO_INCREMENT, NOT NULL | Unique message ID |
| `group_id` | INT | FOREIGN KEY REFERENCES `study_groups(group_id)`, NOT NULL | Study group ID |
| `sender_id` | INT | FOREIGN KEY REFERENCES `users(user_id)`, NOT NULL | Message sender ID |
| `content` | TEXT | NOT NULL | Message text content |
| `status` | VARCHAR(30) | DEFAULT `'ACTIVE'`, NOT NULL | Message status: `ACTIVE` \| `DELETED` |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP, NOT NULL | Message creation time |
| `updated_at` | DATETIME | NOT NULL | Timestamp when the message was last updated |
| `deleted_at` | DATETIME | NULLABLE | Timestamp when the message was soft-deleted |

### Business Rules

- **Persistence**: Chat history is persisted in the database, allowing users to view older exchanges when returning to the study group.
- **Auditing & Timestamps**:
  - On message creation: `created_at` = current time, `status = 'ACTIVE'`, `deleted_at = null`.
  - In Step 12 (MVP), since edit and delete features are not yet implemented, the `updated_at` field must be set equal to `created_at` upon creation.
- **Query Restriction**: The GET messages endpoint only returns messages with status = `'ACTIVE'`.
- **Identity Size**: `message_id` uses `BIGINT` to prevent integer overflow as message counts grow. `group_id` and `sender_id` remain `INT` to match other project tables.

### Indexes

```sql
INDEX idx_group_chat_group_created_at (group_id, created_at)
INDEX idx_group_chat_group_status_created_at (group_id, status, created_at)
INDEX idx_group_chat_sender (sender_id)
```

---

## 19. Table `ai_usage_reservations`

Manages temporary reservations of the AI Q&A question quota to prevent double-spending under concurrent requests.

| Column Name | Data Type | Constraints | Description |
|:---|:---|:---|:---|
| `reservation_id` | BIGINT | PRIMARY KEY, AUTO_INCREMENT, NOT NULL | Unique reservation ID |
| `request_id` | VARCHAR(100) | UNIQUE, NOT NULL | Unique request tracking ID generated by the client or server |
| `user_id` | INT | FOREIGN KEY REFERENCES `users(user_id)` ON DELETE CASCADE, NOT NULL | User associated with the reservation |
| `request_type` | VARCHAR(30) | NOT NULL | Type of AI action: `QA`, `SUMMARY`, `FLASHCARD`, `QUIZ` |
| `status` | VARCHAR(30) | NOT NULL | Status of reservation: `RESERVED`, `CONFIRMED`, `RELEASED`, `EXPIRED` |
| `reserved_at` | DATETIME | NOT NULL | Timestamp when reservation was created |
| `expires_at` | DATETIME | NOT NULL | Timestamp when reservation expires (short duration, e.g. 60 seconds) |
| `confirmed_at` | DATETIME | NULLABLE | Timestamp when reservation was confirmed |
| `released_at` | DATETIME | NULLABLE | Timestamp when reservation was released due to error |
| `created_at` | DATETIME | NOT NULL | Creation audit timestamp |
| `updated_at` | DATETIME | NOT NULL | Last update audit timestamp |

### Business Rules

- **Reservation Flow**:
  1. A user initiates an AI question request.
  2. The system checks quota: `usedQuestions = confirmedRequests + pendingReservations(not expired)`.
  3. If quota is available, the system creates a record with status `RESERVED` and a short expiration (e.g. 60 seconds).
  4. The AI Provider is called.
  5. If the AI call completes successfully, status changes to `CONFIRMED` and `confirmed_at` is set.
  6. If the AI call fails or is aborted, status changes to `RELEASED` and `released_at` is set.
- **Concurrency Protection**: Locks are placed during reservation calculation to prevent concurrent requests from double-spending or exceeding the daily quota.
- **Garbage Collection**: Expired reservations that remain in the `RESERVED` status are ignored in active quota counting, ensuring they do not permanently lock a user's daily questions.

### Indexes

```sql
CREATE INDEX idx_ai_reservation_user_status ON ai_usage_reservations(user_id, status);
CREATE INDEX idx_ai_reservation_expires_at ON ai_usage_reservations(expires_at);
CREATE UNIQUE INDEX uk_ai_reservation_request_id ON ai_usage_reservations(request_id);
```

---

## 20. Table `ai_summaries`

Stores AI-generated document summaries for users.

| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `summary_id` | BIGINT | PRIMARY KEY, AUTO_INCREMENT, NOT NULL | Unique summary ID |
| `document_id` | INT | FOREIGN KEY REFERENCES `documents(document_id)` ON DELETE CASCADE, NOT NULL | Reference to the summarized document |
| `user_id` | INT | FOREIGN KEY REFERENCES `users(user_id)` ON DELETE CASCADE, NOT NULL | Reference to the user who generated this summary |
| `overview` | TEXT | NOT NULL | High-level summary overview |
| `key_points_json` | TEXT | NOT NULL | JSON array containing key bullet points |
| `important_terms_json` | TEXT | NOT NULL | JSON array containing vocabulary terms and definitions |
| `review_questions_json` | TEXT | NOT NULL | JSON array containing suggested study questions |
| `model` | VARCHAR(100) | NOT NULL | AI model name (e.g. `gemini-2.5-flash`) |
| `status` | VARCHAR(30) | NOT NULL | Summary status: `SUCCESS`, `FAILED` |
| `source_processed_at` | DATETIME | NULLABLE | The timestamp when the source document content was processed |
| `source_chunk_count` | INT | NOT NULL | Count of chunks used to generate summary |
| `content_version` | VARCHAR(50) | NULLABLE | Version string of the document content snapshot |
| `created_at` | DATETIME | NOT NULL | Creation timestamp (UTC) |
| `updated_at` | DATETIME | NOT NULL | Update timestamp (UTC) |

### Business Rules

- **JSON Storage**: JSON fields must be stored as plain `TEXT` strings (not MySQL `JSON`) for version compatibility. Serialization and deserialization are handled at the application layer.
- **Ownership**: Summaries belong strictly to the generating user (`user_id`). Document owners do not automatically see summaries generated by other users on shared documents.
- **Immutability**: Every generate/regenerate action inserts a new record instead of overwriting the old summary. The latest summary is resolved using the highest `created_at` timestamp with a status of `SUCCESS` for a given user and document.

### Indexes

```sql
CREATE INDEX idx_ai_summaries_user_document_created
ON ai_summaries(user_id, document_id, created_at);
```

---

## 21. Table `flashcard_sets`

Container group for flashcard items generated from a specific document snapshot.

| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `flashcard_set_id` | BIGINT | PRIMARY KEY, AUTO_INCREMENT, NOT NULL | Unique flashcard set ID |
| `document_id` | INT | FOREIGN KEY REFERENCES `documents(document_id)` ON DELETE CASCADE, NOT NULL | Reference to the source document |
| `user_id` | INT | FOREIGN KEY REFERENCES `users(user_id)` ON DELETE CASCADE, NOT NULL | Reference to the user who owns this set |
| `title` | VARCHAR(255) | NOT NULL | Flashcard set title |
| `item_count` | INT | NOT NULL | Count of flashcard items in this set |
| `model` | VARCHAR(100) | NOT NULL | AI model name used |
| `source_processed_at` | DATETIME | NULLABLE | Timestamp of the source document content snapshot |
| `source_chunk_count` | INT | NOT NULL | Count of chunks utilized |
| `content_version` | VARCHAR(50) | NULLABLE | Version string of the source document content |
| `created_at` | DATETIME | NOT NULL | Creation timestamp (UTC) |
| `updated_at` | DATETIME | NOT NULL | Update timestamp (UTC) |

### Business Rules

- **Ownership**: Flashcard sets belong strictly to the generating user (`user_id`).
- **No Overwrite**: Each generate action creates a new `flashcard_sets` record and associated `flashcards` items.

### Indexes

```sql
CREATE INDEX idx_flashcard_sets_user_document_created
ON flashcard_sets(user_id, document_id, created_at);
```

---

## 22. Table `flashcards`

Individual concept card detail.

| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `flashcard_id` | BIGINT | PRIMARY KEY, AUTO_INCREMENT, NOT NULL | Unique card ID |
| `flashcard_set_id` | BIGINT | FOREIGN KEY REFERENCES `flashcard_sets(flashcard_set_id)` ON DELETE CASCADE, NOT NULL | Reference to the parent set |
| `front_text` | TEXT | NOT NULL | Flashcard question or prompt on the front face |
| `back_text` | TEXT | NOT NULL | Flashcard answer or explanation on the back face |
| `source_page` | INT | NULLABLE | Source page number from the document (if parsed) |
| `difficulty` | VARCHAR(20) | NULLABLE | Calculated difficulty: `EASY`, `MEDIUM`, `HARD` |
| `position` | INT | NOT NULL | Execution position order (1-indexed) |

### Business Rules

- **Ordering**: The position field is strictly ordered sequentially inside each parent set starting from 1.
- **Deletions & Edits**: In Step 14, flashcards are read-only; no edit or delete APIs are provided.

### Indexes

```sql
CREATE INDEX idx_flashcards_set_position
ON flashcards(flashcard_set_id, position);
```

---

## 23. Table `quiz_sets`

Container group for multiple choice quizzes generated from a specific document.

| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `quiz_set_id` | BIGINT | PRIMARY KEY, AUTO_INCREMENT, NOT NULL | Unique quiz set ID |
| `document_id` | INT | FOREIGN KEY REFERENCES `documents(document_id)` ON DELETE CASCADE, NOT NULL | Reference to the source document |
| `user_id` | INT | FOREIGN KEY REFERENCES `users(user_id)` ON DELETE CASCADE, NOT NULL | Reference to the user who owns this set |
| `title` | VARCHAR(255) | NOT NULL | Title of the quiz |
| `question_count` | INT | NOT NULL | Number of multiple-choice questions in the quiz |
| `model` | VARCHAR(100) | NOT NULL | AI model name used |
| `source_processed_at` | DATETIME | NULLABLE | Timestamp of the source document content snapshot |
| `source_chunk_count` | INT | NOT NULL | Count of chunks utilized |
| `content_version` | VARCHAR(50) | NULLABLE | Version string of the source document content |
| `created_at` | DATETIME | NOT NULL | Creation timestamp (UTC) |
| `updated_at` | DATETIME | NOT NULL | Update timestamp (UTC) |

### Business Rules

- **Ownership**: Quiz sets belong strictly to the generating user (`user_id`).

### Indexes

```sql
CREATE INDEX idx_quiz_sets_user_document_created
ON quiz_sets(user_id, document_id, created_at);
```

---

## 24. Table `quiz_questions`

Multiple choice question detail.

| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `question_id` | BIGINT | PRIMARY KEY, AUTO_INCREMENT, NOT NULL | Unique question ID |
| `quiz_set_id` | BIGINT | FOREIGN KEY REFERENCES `quiz_sets(quiz_set_id)` ON DELETE CASCADE, NOT NULL | Reference to the parent set |
| `question_text` | TEXT | NOT NULL | Text content of the question |
| `correct_option` | VARCHAR(1) | NOT NULL | Correct answer option key: `A`, `B`, `C`, or `D` |
| `explanation` | TEXT | NOT NULL | Explanation of the correct option based on the source document |
| `difficulty` | VARCHAR(20) | NOT NULL | Question difficulty level: `EASY`, `MEDIUM`, `HARD` |
| `position` | INT | NOT NULL | Position inside the quiz set (1-indexed) |

### Business Rules

- **Explanations**: Correct answer explanation must be present and extracted directly from the document.
- **Constraints**: Only single correct options are supported in Step 14.

### Indexes

```sql
CREATE INDEX idx_quiz_questions_set_position
ON quiz_questions(quiz_set_id, position);
```

---

## 25. Table `quiz_options`

Options associated with multiple choice questions.

| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `option_id` | BIGINT | PRIMARY KEY, AUTO_INCREMENT, NOT NULL | Unique option ID |
| `question_id` | BIGINT | FOREIGN KEY REFERENCES `quiz_questions(question_id)` ON DELETE CASCADE, NOT NULL | Parent question |
| `option_key` | VARCHAR(1) | NOT NULL | Option key identifier: `A`, `B`, `C`, or `D` |
| `option_text` | TEXT | NOT NULL | Option display text |
| `position` | INT | NOT NULL | Position index inside the question options (1 to 4) |

### Business Rules

- **Exclusivity**: Exactly 4 options (A, B, C, D) must be present for each question. Option key must match position order.

### Indexes

```sql
CREATE INDEX idx_quiz_options_question_position
ON quiz_options(question_id, position);
```
