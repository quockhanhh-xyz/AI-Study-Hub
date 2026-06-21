# Folder Sharing Test Cases - Step 6B

This document defines the functional test cases for Step 6B: Folder Sharing & Sharing UX Completion.

## Preconditions

- Backend is running at `http://localhost:8080`.
- The database has been populated with:
  - **User A**: `usera@test.com` (owns active Folder ID `1` named "SWP391", which contains active Subfolder ID `3` named "Lab", which contains active Document ID `101` named "lab-guidelines.pdf")
  - **User B**: `userb@test.com` (owns active Folder ID `2` named "Calculus")
  - **User C**: `userc@test.com` (active member of Study Group ID `10` "SWT301 Group")
  - **Study Group ID 10**: "SWT301 Group" (Group Owner is User A, Group Member is User C)
- Users have active browser sessions with their respective `accessToken` HttpOnly cookies set.

---

## Direct Folder Sharing Test Cases

### TC-FLD-SHR-001 - Share Folder to User Successfully
- **Precondition:** User A is logged in and owns Folder ID `1`. User B is registered and active.
- **Steps:**
  1. Send `POST /api/folders/1/shares/users` with User A's session.
  2. Request Body:
     ```json
     {
       "email": "userb@test.com"
     }
     ```
- **Expected Result:**
  - Status code: `200 OK`.
  - Response `success` is `true`.
  - Response `data` includes `shareId`, `folderId`=1, `sharedWithEmail`="userb@test.com", `permission`="VIEW", `status`="ACTIVE".
  - MySQL database contains a row in `folder_shares` with status `'ACTIVE'`.
- **Status:** `Not Run`

### TC-FLD-SHR-002 - Share Folder to Self is Blocked
- **Precondition:** User A is logged in and owns Folder ID `1`.
- **Steps:**
  1. Send `POST /api/folders/1/shares/users` with User A's session.
  2. Request Body:
     ```json
     {
       "email": "usera@test.com"
     }
     ```
- **Expected Result:**
  - Status code: `400 Bad Request` or `409 Conflict`.
  - Response `success` is `false`.
  - Message states: "You cannot share a folder with yourself" or similar.
  - No database share record is created.
- **Status:** `Not Run`

### TC-FLD-SHR-003 - Share Folder Not Owned is Blocked (403 Forbidden)
- **Precondition:** User B is logged in. Folder ID `1` is owned by User A.
- **Steps:**
  1. Send `POST /api/folders/1/shares/users` with User B's session.
  2. Request Body:
     ```json
     {
       "email": "userc@test.com"
     }
     ```
- **Expected Result:**
  - Status code: `403 Forbidden`.
  - Response `success` is `false`.
  - Message states: "Access denied" or "Only the folder owner can share this folder".
- **Status:** `Not Run`

### TC-FLD-SHR-004 - Share Soft-deleted Folder is Blocked (404 Not Found)
- **Precondition:** User A is logged in. User A has soft-deleted Folder ID `4` (`status = 'DELETED'`).
- **Steps:**
  1. Send `POST /api/folders/4/shares/users` with User A's session.
  2. Request Body:
     ```json
     {
       "email": "userb@test.com"
     }
     ```
- **Expected Result:**
  - Status code: `404 Not Found`.
  - Response `success` is `false`.
  - Message states: "Folder not found".
- **Status:** `Not Run`

### TC-FLD-SHR-005 - Share Duplicate Active yields 409 Conflict
- **Precondition:** User A has already actively shared Folder ID `1` with User B.
- **Steps:**
  1. Send `POST /api/folders/1/shares/users` with User A's session.
  2. Request Body:
     ```json
     {
       "email": "userb@test.com"
     }
     ```
- **Expected Result:**
  - Status code: `409 Conflict`.
  - Response `success` is `false`.
  - Message states: "Folder is already shared with this user".
- **Status:** `Not Run`

### TC-FLD-SHR-006 - Re-sharing a Revoked Folder Reactivates the Record
- **Precondition:** User A owns Folder ID `1` and has shared it with User B. The share record was previously revoked (`status = 'REVOKED'`).
- **Steps:**
  1. Send `POST /api/folders/1/shares/users` with User A's session.
  2. Request Body:
     ```json
     {
       "email": "userb@test.com"
     }
     ```
- **Expected Result:**
  - Status code: `200 OK`.
  - Response `success` is `true`.
  - The existing `folder_shares` record has its `status` updated from `'REVOKED'` to `'ACTIVE'`. No new record is created in MySQL.
- **Status:** `Not Run`

---

## Shared With Me & Recursive Access Test Cases

### TC-FLD-SHR-007 - Shared With Me Lists Only Shared Roots
- **Precondition:** User A has shared Folder ID `1` (which contains Subfolder ID `3`) with User B.
- **Steps:**
  1. Send `GET /api/folders/shared-with-me` with User B's session.
- **Expected Result:**
  - Status code: `200 OK`.
  - Response `success` is `true`.
  - Response `data` list contains Folder ID `1` ("SWP391").
  - Response `data` list does **NOT** contain Folder ID `3` ("Lab") to prevent redundant displays in the root sharing dashboard.
- **Status:** `Not Run`

### TC-FLD-SHR-008 - Open Shared Root Successfully
- **Precondition:** User A has shared Folder ID `1` with User B.
- **Steps:**
  1. Send `GET /api/folders/1/shared-content` with User B's session.
- **Expected Result:**
  - Status code: `200 OK`.
  - Response `success` is `true`.
  - Response `data.subfolders` lists Subfolder ID `3` ("Lab").
  - Response `data.documents` lists any active documents directly under Folder ID `1`.
- **Status:** `Not Run`

### TC-FLD-SHR-009 - Open Nested Subfolder in Shared Root Successfully
- **Precondition:** User A has shared Folder ID `1` (parent) with User B. Subfolder ID `3` ("Lab") is nested inside Folder ID `1`.
- **Steps:**
  1. Send `GET /api/folders/3/shared-content` with User B's session.
- **Expected Result:**
  - Status code: `200 OK`.
  - Response `success` is `true`.
  - The recursive security check resolves that Folder ID `3` is nested under Folder ID `1` (which is shared with User B), and allows access.
  - Response `data.documents` lists Document ID `101` ("lab-guidelines.pdf").
- **Status:** `Not Run`

### TC-FLD-SHR-010 - Shared Folder Content Returns Only Immediate Children
- **Precondition:** User A has shared Folder ID `1` (contains Subfolder ID `3` and Document ID `101` inside Subfolder ID `3`) with User B.
- **Steps:**
  1. Send `GET /api/folders/1/shared-content` with User B's session.
- **Expected Result:**
  - Status code: `200 OK`.
  - Response `data.subfolders` contains Subfolder ID `3` ("Lab").
  - Response `data.documents` does **NOT** contain Document ID `101` ("lab-guidelines.pdf") because it is nested within `Lab`, not directly inside the root folder.
- **Status:** `Not Run`

### TC-FLD-SHR-011 - Access Nested Document inside Shared Folder Tree Successfully
- **Precondition:** User A has shared Folder ID `1` with User B. Document ID `101` is nested inside the shared tree under `SWP391/Lab`.
- **Steps:**
  1. Send `GET /api/documents/101` with User B's session.
- **Expected Result:**
  - Status code: `200 OK`.
  - Response `success` is `true`.
  - The request succeeds, returning details and the secure download link for Document ID `101` because it is located inside an actively shared folder tree.
- **Status:** `Not Run`

### TC-FLD-SHR-012 - Moving Document out of Shared Folder Tree Revokes Access
- **Precondition:** User A has shared Folder ID `1` with User B. Document ID `101` is inside the shared tree.
- **Steps:**
  1. User A moves Document ID `101` to `folderId = null` (My Documents root level).
  2. Send `GET /api/documents/101` with User B's session.
- **Expected Result:**
  - Status code: `403 Forbidden`.
  - Response `success` is `false`.
  - Access is denied because the document is no longer nested inside any folder tree shared with User B.
- **Status:** `Not Run`

### TC-FLD-SHR-013 - Breadcrumb Path Starts from Shared Root
- **Precondition:** User A has shared Folder ID `1` ("SWP391") with User B. Subfolder ID `3` ("Lab") is nested inside Folder ID `1`.
- **Steps:**
  1. Send `GET /api/folders/3/shared-content` with User B's session.
- **Expected Result:**
  - Status code: `200 OK`.
  - Response `data.breadcrumb` is exactly:
    ```json
    [
      { "folderId": 1, "folderName": "SWP391" },
      { "folderId": 3, "folderName": "Lab" }
    ]
    ```
  - The owner's root directory is hidden from the path list.
- **Status:** `Not Run`

---

## Group Folder Sharing Test Cases

### TC-FLD-SHR-014 - Share Folder to Study Group Successfully
- **Precondition:** User A is logged in, owns Folder ID `1`, and is the owner of Study Group ID `10`.
- **Steps:**
  1. Send `POST /api/folders/1/shares/groups` with User A's session.
  2. Request Body:
     ```json
     {
       "groupId": 10
     }
     ```
- **Expected Result:**
  - Status code: `200 OK`.
  - Response `success` is `true`.
  - Response `data` contains `shareId`, `folderId`=1, `groupId`=10, `groupName`="SWT301 Group", `status`="ACTIVE".
  - MySQL database contains a row in `group_folder_shares` with status `'ACTIVE'`.
- **Status:** `Not Run`

### TC-FLD-SHR-015 - Group Member Accesses Shared Folder Successfully
- **Precondition:** User A has shared Folder ID `1` to Group ID `10`. User C is an active member of Group ID `10`.
- **Steps:**
  1. Send `GET /api/folders/1/shared-content` with User C's session.
- **Expected Result:**
  - Status code: `200 OK`.
  - User C is authorized to read the shared folder because their active group has been granted access.
- **Status:** `Not Run`

### TC-FLD-SHR-016 - Group Member Accesses Nested Subfolder Successfully
- **Precondition:** User A has shared Folder ID `1` to Group ID `10`. User C is a member of Group ID `10`. Subfolder ID `3` is nested under Folder ID `1`.
- **Steps:**
  1. Send `GET /api/folders/3/shared-content` with User C's session.
- **Expected Result:**
  - Status code: `200 OK`.
  - Request succeeds and returns subfolder details for Folder ID `3`.
- **Status:** `Not Run`

### TC-FLD-SHR-017 - Group Member Downloads/Opens Document in Shared Tree Successfully
- **Precondition:** User A has shared Folder ID `1` to Group ID `10`. User C is a member of Group ID `10`. Document ID `101` is inside Folder ID `1` tree.
- **Steps:**
  1. Send `GET /api/documents/101` with User C's session.
- **Expected Result:**
  - Status code: `200 OK`.
  - User C is authorized to fetch Document ID `101` details and download URL.
- **Status:** `Not Run`

### TC-FLD-SHR-018 - Group Owner Revokes Any Group Folder Share Successfully
- **Precondition:** User A is the owner of Group ID `10`. Folder ID `2` (owned by User B) is shared to Group ID `10` (active share ID `8`).
- **Steps:**
  1. Send `DELETE /api/group-folder-shares/8` with User A's session.
- **Expected Result:**
  - Status code: `200 OK`.
  - The share is successfully revoked (status set to `'REVOKED'`) because the caller is the group owner.
- **Status:** `Not Run`

### TC-FLD-SHR-019 - Group Member Cannot Revoke Group Folder Share of Another User
- **Precondition:** User C is a regular member of Group ID `10`. Folder ID `1` (owned by User A) is shared to Group ID `10` (active share ID `9`).
- **Steps:**
  1. Send `DELETE /api/group-folder-shares/9` with User C's session.
- **Expected Result:**
  - Status code: `403 Forbidden`.
  - Response `success` is `false`.
  - Message: "Access denied". The share remains active in MySQL.
- **Status:** `Not Run`

---

## Deletion, Trash & Group Deactivation Test Cases

### TC-FLD-SHR-020 - Trash and Restore Impact on Folder Sharing Access
- **Precondition:** User A has shared Folder ID `1` with User B.
- **Steps:**
  1. User A soft-deletes Folder ID `1` (moves it to trash, `status = 'DELETED'`).
  2. Send `GET /api/folders/1/shared-content` with User B's session. (Expected: `404 Not Found` / access denied)
  3. User A restores Folder ID `1` from trash.
  4. Send `GET /api/folders/1/shared-content` with User B's session. (Expected: `200 OK` success)
- **Expected Result:**
  - When the folder is in the trash, User B cannot access it or see its contents.
  - Once restored, access is automatically re-enabled because the `folder_shares` record status remained `'ACTIVE'`.
- **Status:** `Not Run`
