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
- Soft-deletion: A folder can only be deleted if it is empty (i.e., it contains no ACTIVE documents and no ACTIVE subfolders). If the folder is not empty, the deletion request must be rejected. When an empty folder is soft-deleted, its `status` is set to `'DELETED'` in MySQL, and `deleted_at` is populated with the current timestamp.
- Restoration: A soft-deleted folder (which is empty) can be restored by setting `status` to `'ACTIVE'` and `deleted_at` to `null`.
- Permanent deletion: When a soft-deleted folder is permanently deleted from the trash, the folder record is permanently removed from MySQL.


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
