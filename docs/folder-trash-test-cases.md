# Folder & Trash Management Test Cases - Step 5

This document defines the functional test cases for Step 5: Folder & Trash Management.

## Preconditions

- Backend is running at `http://localhost:8080`.
- Two users exist and are verified:
  - **User A**: `usera@test.com` (owns Folder ID `1` named "Math Notes", and active Document ID `101` inside Folder `1`)
  - **User B**: `userb@test.com` (owns Folder ID `2` named "Calculus Notes", and active Document ID `102` inside Folder `2`)
- User A and User B have active browser sessions with their respective `accessToken` HttpOnly cookies set.

---

## Folder CRUD Test Cases

### TC-FLD-001 - Create Folder Successfully
- **Precondition:** User A is logged in.
- **Steps:**
  1. Send `POST /api/folders` with User A's session.
  2. Request Body:
     ```json
     {
       "name": "Physics Notes"
     }
     ```
- **Expected Result:**
  - Status code: `200 OK`.
  - Response `success` is `true`.
  - Response `data` includes a new `folderId`, `name`="Physics Notes", `status`="ACTIVE", and `createdAt` timestamp.
  - MySQL database shows a new record in `folders` with `name`="Physics Notes", `owner_id` of User A, and `status`='ACTIVE'.
- **Status:** `Not Run`

### TC-FLD-002 - Create Folder with Empty Name (400 Bad Request)
- **Precondition:** User A is logged in.
- **Steps:**
  1. Send `POST /api/folders` with User A's session.
  2. Request Body:
     ```json
     {
       "name": ""
     }
     ```
- **Expected Result:**
  - Status code: `400 Bad Request`.
  - Response `success` is `false`.
  - Response `message` states: "Folder name is required".
  - MySQL database record is NOT created.
- **Status:** `Not Run`

### TC-FLD-003 - Create Folder with Duplicate Name (409 Conflict)
- **Precondition:** User A is logged in and already owns an active folder named "Math Notes" in the top-level My Documents area.
- **Steps:**
  1. Send `POST /api/folders` with User A's session.
  2. Request Body:
     ```json
     {
       "folderName": "Math Notes",
       "description": "Duplicated folder",
       "parentFolderId": null
     }
     ```
- **Expected Result:**
  - Status code: `409 Conflict`.
  - Response `success` is `false`.
  - Response `message` states: "A folder with the same name already exists in this location.".
  - MySQL database record is NOT created.
- **Status:** `Not Run`

### TC-FLD-004 - Create Folder with Duplicate Name of a Soft-Deleted Folder (Success)
- **Precondition:** User A is logged in. User A has a soft-deleted folder (`status = 'DELETED'`) named "Old Physics" in the top-level My Documents area.
- **Steps:**
  1. Send `POST /api/folders` with User A's session.
  2. Request Body:
     ```json
     {
       "folderName": "Old Physics",
       "description": "New active folder with old name",
       "parentFolderId": null
     }
     ```
- **Expected Result:**
  - Status code: `200 OK`.
  - Response `success` is `true`.
  - MySQL database contains two folders with the name "Old Physics" for User A in the top-level My Documents area: one `'ACTIVE'` (new) and one `'DELETED'`.
- **Status:** `Not Run`

### TC-FLD-005 - Get My Folders Successfully
- **Precondition:** User A is logged in and owns folder "Math Notes" (ACTIVE) and folder "Old Physics" (DELETED).
- **Steps:**
  1. Send `GET /api/folders/my` with User A's session.
- **Expected Result:**
  - Status code: `200 OK`.
  - Response `success` is `true`.
  - Response `data` is a list containing only active folders (e.g., "Math Notes" is present, "Old Physics" is NOT present).
- **Status:** `Not Run`

### TC-FLD-005a - Get Folder Detail Successfully
- **Precondition:** User A is logged in and owns active Folder ID `1` ("Math Notes").
- **Steps:**
  1. Send `GET /api/folders/1` with User A's session.
- **Expected Result:**
  - Status code: `200 OK`.
  - Response `success` is `true`.
  - Response `data` includes `folderId`=1, `name`="Math Notes", `status`="ACTIVE", and `createdAt`.
- **Status:** `Not Run`

### TC-FLD-005b - Get Folder Detail Owned by Another User (403 Forbidden)
- **Precondition:** User B is logged in. Folder ID `1` belongs to User A.
- **Steps:**
  1. Send `GET /api/folders/1` with User B's session.
- **Expected Result:**
  - Status code: `403 Forbidden`.
  - Response `success` is `false`.
  - Message states: "Access denied".
- **Status:** `Not Run`

### TC-FLD-005c - Get Folder Detail of Non-existent or Soft-deleted Folder (404 Not Found)
- **Precondition:** User A is logged in. Folder ID `999` does not exist in the database (or is soft-deleted).
- **Steps:**
  1. Send `GET /api/folders/999` with User A's session.
- **Expected Result:**
  - Status code: `404 Not Found`.
  - Response `success` is `false`.
  - Message states: "Folder not found".
- **Status:** `Not Run`

### TC-FLD-006 - Update Folder Name Successfully
- **Precondition:** User A is logged in and owns active Folder ID `1` ("Math Notes").
- **Steps:**
  1. Send `PUT /api/folders/1` with User A's session.
  2. Request Body:
     ```json
     {
       "name": "Calculus I Notes"
     }
     ```
- **Expected Result:**
  - Status code: `200 OK`.
  - Response `success` is `true`.
  - MySQL database shows Folder ID `1` name updated to "Calculus I Notes".
- **Status:** `Not Run`

### TC-FLD-007 - Update Folder Owned by Another User (403 Forbidden)
- **Precondition:** User B is logged in. Folder ID `1` belongs to User A.
- **Steps:**
  1. Send `PUT /api/folders/1` with User B's session.
  2. Request Body:
     ```json
     {
       "name": "Hack Folder"
     }
     ```
- **Expected Result:**
  - Status code: `403 Forbidden`.
  - Response `success` is `false`.
  - Message states: "Access denied".
  - MySQL database folder name remains unchanged.
- **Status:** `Not Run`

### TC-FLD-008 - Update Folder to a Name That Already Exists (409 Conflict)
- **Precondition:** User A is logged in. User A owns Folder ID `1` ("Math Notes") and another active Folder ID `3` ("Chemistry") in the top-level My Documents area.
- **Steps:**
  1. Send `PUT /api/folders/1` with User A's session.
  2. Request Body:
     ```json
     {
       "folderName": "Chemistry",
       "description": "Renaming to existing folder name"
     }
     ```
- **Expected Result:**
  - Status code: `409 Conflict`.
  - Response `success` is `false`.
  - Message states: "A folder with the same name already exists in this location.".
  - Folder ID `1` name remains "Math Notes".
- **Status:** `Not Run`

---

## Document Upload to Folder Test Cases

### TC-DOC-024b - Upload Document into Non-existent Folder (404 Not Found)
- **Precondition:** User A is logged in. Folder ID `999` does not exist in the database (or is soft-deleted).
- **Steps:**
  1. Send `POST /api/documents/upload` with User A's session.
  2. Format: `multipart/form-data`.
  3. Include `file` (valid), `title`="SWR Lecture 1", `description`="Week 1 note", and `folderId`=999.
- **Expected Result:**
  - Status code: `404 Not Found`.
  - Response `success` is `false`.
  - Message states: "Folder not found".
  - MySQL database document record is NOT created and Cloudinary file is NOT uploaded.
- **Status:** `Not Run`

### TC-DOC-024c - Upload Document into Folder Owned by Another User (403 Forbidden)
- **Precondition:** User A is logged in. Folder ID `2` is owned by User B.
- **Steps:**
  1. Send `POST /api/documents/upload` with User A's session.
  2. Format: `multipart/form-data`.
  3. Include `file` (valid), `title`="SWR Lecture 1", `description`="Week 1 note", and `folderId`=2.
- **Expected Result:**
  - Status code: `403 Forbidden`.
  - Response `success` is `false`.
  - Message states: "Access denied".
  - MySQL database document record is NOT created and Cloudinary file is NOT uploaded.
- **Status:** `Not Run`

---

## Document Move Test Cases

### TC-DOC-025 - Move Document to Folder Successfully
- **Precondition:** User A is logged in. User A owns active Document ID `101` and active Folder ID `1` ("Math Notes").
- **Steps:**
  1. Send `PUT /api/documents/101/move` with User A's session.
  2. Request Body:
     ```json
     {
       "folderId": 1
     }
     ```
- **Expected Result:**
  - Status code: `200 OK`.
  - Response `success` is `true`.
  - Response `data` includes `documentId`=101, `folderId`=1, and `folderName`="Math Notes".
  - MySQL database shows Document ID `101` has `folder_id` set to `1`.
- **Status:** `Not Run`

### TC-DOC-026 - Move Document to Root (Null Folder) Successfully
- **Precondition:** User A is logged in. Document ID `101` is currently inside Folder ID `1`.
- **Steps:**
  1. Send `PUT /api/documents/101/move` with User A's session.
  2. Request Body:
     ```json
     {
       "folderId": null
     }
     ```
- **Expected Result:**
  - Status code: `200 OK`.
  - Response `success` is `true`.
  - Response `data` shows `folderId`=null, `folderName`=null.
  - MySQL database shows Document ID `101` has `folder_id` set to `NULL`.
- **Status:** `Not Run`

### TC-DOC-027 - Move Document of Another User (403 Forbidden)
- **Precondition:** User B is logged in. Document ID `101` is owned by User A. User B owns Folder ID `2`.
- **Steps:**
  1. Send `PUT /api/documents/101/move` with User B's session.
  2. Request Body:
     ```json
     {
       "folderId": 2
     }
     ```
- **Expected Result:**
  - Status code: `403 Forbidden`.
  - Response `success` is `false`.
  - Message states: "Access denied".
  - MySQL database shows Document ID `101` has NOT changed folders.
- **Status:** `Not Run`

### TC-DOC-028 - Move Document to Folder Owned by Another User (403 Forbidden)
- **Precondition:** User A is logged in. Document ID `101` is owned by User A. Folder ID `2` is owned by User B.
- **Steps:**
  1. Send `PUT /api/documents/101/move` with User A's session.
  2. Request Body:
     ```json
     {
       "folderId": 2
     }
     ```
- **Expected Result:**
  - Status code: `403 Forbidden`.
  - Response `success` is `false`.
  - Message states: "Access denied".
  - MySQL database shows Document ID `101` `folder_id` remains unchanged.
- **Status:** `Not Run`

### TC-DOC-028a - Move Document to Soft-deleted Folder (404 Not Found)
- **Precondition:** User A is logged in. User A owns Document ID `101`. Folder ID `1` is owned by User A but has been soft-deleted.
- **Steps:**
  1. Send `PUT /api/documents/101/move` with User A's session.
  2. Request Body:
     ```json
     {
       "folderId": 1
     }
     ```
- **Expected Result:**
  - Status code: `404 Not Found`.
  - Response `success` is `false`.
  - Message states: "Document or folder not found".
  - MySQL database shows Document ID `101` `folder_id` remains unchanged.
- **Status:** `Not Run`

---

## Soft-delete & Trash Retrieval Test Cases

### TC-FLD-009 - Soft-delete Non-empty Folder Fails (400 Bad Request)
- **Precondition:** User A is logged in. User A owns Folder ID `1` ("Math Notes") and Document ID `101` which has `folder_id = 1` and `status = 'ACTIVE'`.
- **Steps:**
  1. Send `DELETE /api/folders/1` with User A's session.
- **Expected Result:**
  - Status code: `400 Bad Request`.
  - Response `success` is `false`.
  - Response `message` states: "Folder must be empty before deleting.".
  - MySQL database Folder ID `1` status remains `'ACTIVE'`.
  - MySQL database Document ID `101` status remains `'ACTIVE'`.
- **Status:** `Not Run`

---

### TC-FLD-009a - Soft-delete Empty Folder Successfully
- **Precondition:** User A is logged in. User A owns Folder ID `3` ("Chemistry") which has no active documents and no active subfolders inside it.
- **Steps:**
  1. Send `DELETE /api/folders/3` with User A's session.
- **Expected Result:**
  - Status code: `200 OK`.
  - Response `success` is `true`.
  - Response `message` is "Folder deleted successfully".
  - MySQL database shows Folder ID `3` status is `'DELETED'` and `deleted_at` has the current timestamp.
- **Status:** `Not Run`

---

### TC-TRSH-001 - Retrieve Trash Items Successfully
- **Precondition:** User A has soft-deleted Folder ID `3` (empty folder).
- **Steps:**
  1. Send `GET /api/trash` with User A's session.
- **Expected Result:**
  - Status code: `200 OK`.
  - Response `success` is `true`.
  - Response `data` lists Folder ID `3` under `"folders"`.
- **Status:** `Not Run`

---

## Restore Test Cases

### TC-TRSH-002 - Restore Folder Successfully
- **Precondition:** User A has soft-deleted Folder ID `3` (empty folder).
- **Steps:**
  1. Send `POST /api/trash/folders/3/restore` with User A's session.
- **Expected Result:**
  - Status code: `200 OK`.
  - Response `success` is `true`.
  - Response `message` is "Folder restored successfully".
  - MySQL database shows Folder ID `3` `status` is `'ACTIVE'` and `deleted_at` is `NULL`.
- **Status:** `Not Run`

### TC-TRSH-002a - Restore Non-existent Folder from Trash (404 Not Found)
- **Precondition:** User A is logged in. Folder ID `999` does not exist (or is active, not in trash).
- **Steps:**
  1. Send `POST /api/trash/folders/999/restore` with User A's session.
- **Expected Result:**
  - Status code: `404 Not Found`.
  - Response `success` is `false`.
  - Message states: "Folder not found in trash".
- **Status:** `Not Run`

### TC-TRSH-003 - Restore Document Individually Successfully
- **Precondition:** User A owns soft-deleted Document ID `101` (currently in trash). The parent Folder ID `1` is still ACTIVE.
- **Steps:**
  1. Send `POST /api/trash/documents/101/restore` with User A's session.
- **Expected Result:**
  - Status code: `200 OK`.
  - Response `success` is `true`.
  - MySQL database shows Document ID `101` `status` is `'ACTIVE'` and `deleted_at` is `NULL`.
  - Document ID `101` remains assigned to Folder ID `1`.
- **Status:** `Not Run`

### TC-TRSH-003a - Restore Non-existent Document from Trash (404 Not Found)
- **Precondition:** User A is logged in. Document ID `999` does not exist (or is active, not in trash).
- **Steps:**
  1. Send `POST /api/trash/documents/999/restore` with User A's session.
- **Expected Result:**
  - Status code: `404 Not Found`.
  - Response `success` is `false`.
  - Message states: "Document not found in trash".
- **Status:** `Not Run`

### TC-TRSH-004 - Restore Document whose Parent Folder is in Trash (Restored to Root)
- **Precondition:** User A has soft-deleted Folder ID `1` and Document ID `101` (inside Folder `1`). The folder is NOT yet restored.
- **Steps:**
  1. Send `POST /api/trash/documents/101/restore` with User A's session.
- **Expected Result:**
  - Status code: `200 OK`.
  - Response `success` is `true`.
  - MySQL database shows Document ID `101` `status` is `'ACTIVE'` and `deleted_at` is `NULL`.
  - Document ID `101` has its `folder_id` updated to `NULL` (restored to root because its parent folder is still in trash/deleted).
- **Status:** `Not Run`

### TC-TRSH-005 - Restore Folder/Document of Another User (403 Forbidden)
- **Precondition:** User B is logged in. User A owns soft-deleted Folder ID `1`.
- **Steps:**
  1. Send `POST /api/trash/folders/1/restore` with User B's session.
- **Expected Result:**
  - Status code: `403 Forbidden`.
  - Response `success` is `false`.
  - Message states: "Access denied".
  - MySQL database Folder ID `1` status remains `'DELETED'`.
- **Status:** `Not Run`

---

## Permanent Delete Test Cases

### TC-TRSH-006 - Permanent Delete Document (Cloudinary Cleanup)
- **Precondition:** User A is logged in. User A has a soft-deleted Document ID `101` in trash with Cloudinary public ID `ai-study-hub/documents/1/math.pdf`.
- **Steps:**
  1. Send `DELETE /api/trash/documents/101` with User A's session.
- **Expected Result:**
  - Status code: `200 OK`.
  - Response `success` is `true`.
  - MySQL database has record for Document ID `101` completely removed (hard deleted).
  - Cloudinary Storage physical file corresponding to public ID `ai-study-hub/documents/1/math.pdf` is deleted.
- **Status:** `Not Run`

### TC-TRSH-006a - Permanent Delete Non-existent or Active Document (404 Not Found)
- **Precondition:** User A is logged in. Document ID `999` does not exist (or is active and has not been soft-deleted).
- **Steps:**
  1. Send `DELETE /api/trash/documents/999` with User A's session.
- **Expected Result:**
  - Status code: `404 Not Found`.
  - Response `success` is `false`.
  - Message states: "Document not found in trash".
- **Status:** `Not Run`

### TC-TRSH-007 - Permanent Delete Empty Folder
- **Precondition:** User A is logged in. User A has soft-deleted Folder ID `3` (empty folder).
- **Steps:**
  1. Send `DELETE /api/trash/folders/3` with User A's session.
- **Expected Result:**
  - Status code: `200 OK`.
  - Response `success` is `true`.
  - Response `message` is "Folder permanently deleted".
  - MySQL database has record for Folder ID `3` completely removed.
- **Status:** `Not Run`

### TC-TRSH-007a - Permanent Delete Non-existent or Active Folder (404 Not Found)
- **Precondition:** User A is logged in. Folder ID `999` does not exist (or is active and has not been soft-deleted).
- **Steps:**
  1. Send `DELETE /api/trash/folders/999` with User A's session.
- **Expected Result:**
  - Status code: `404 Not Found`.
  - Response `success` is `false`.
  - Message states: "Folder not found in trash".
- **Status:** `Not Run`

### TC-TRSH-008 - Permanent Delete Folder/Document of Another User (403 Forbidden)
- **Precondition:** User B is logged in. User A owns soft-deleted Folder ID `1`.
- **Steps:**
  1. Send `DELETE /api/trash/folders/1` with User B's session.
- **Expected Result:**
  - Status code: `403 Forbidden`.
  - Response `success` is `false`.
  - Message states: "Access denied".
  - MySQL database Folder ID `1` remains in trash.
- **Status:** `Not Run`

---

## Authorization Security Test Cases

### TC-SEC-002 - Call Folder APIs Without Logging In (401 Unauthorized)
- **Precondition:** No active session (the `accessToken` cookie is missing or invalid).
- **Steps:**
  1. Send `POST /api/folders` with request body `{"folderName": "Math Notes"}`.
  2. Send `GET /api/folders/my`.
  3. Send `GET /api/folders/1`.
  4. Send `PUT /api/folders/1` with request body `{"folderName": "New Name"}`.
  5. Send `DELETE /api/folders/1`.
  6. Send `PUT /api/documents/101/move` with request body `{"folderId": 1}`.
- **Expected Result:**
  - Each request returns status code: `401 Unauthorized`.
  - Response `success` is `false`.
  - Response `message` matches: "Your session has expired. Please log in again.".
- **Status:** `Not Run`

### TC-SEC-003 - Call Trash/Restore APIs Without Logging In (401 Unauthorized)
- **Precondition:** No active session (the `accessToken` cookie is missing or invalid).
- **Steps:**
  1. Send `GET /api/trash`.
  2. Send `POST /api/trash/folders/1/restore`.
  3. Send `POST /api/trash/documents/101/restore`.
  4. Send `DELETE /api/trash/folders/1`.
  5. Send `DELETE /api/trash/documents/101`.
- **Expected Result:**
  - Each request returns status code: `401 Unauthorized`.
  - Response `success` is `false`.
  - Response `message` matches: "Your session has expired. Please log in again.".
- **Status:** `Not Run`

---

## Nested Folders and Subfolders Test Cases

### TC-FLD-013 - Create Root Folder Successfully
- **Precondition:** User A is logged in. No folder with folderName "SWT301" exists at User A's root level.
- **Steps:**
  1. Send `POST /api/folders` with User A's session.
  2. Request Body:
     ```json
     {
       "folderName": "SWT301",
       "description": "Software Testing",
       "parentFolderId": null
     }
     ```
- **Expected Result:**
  - Status code: `200 OK`.
  - Response `success` is `true`.
  - Response `data` contains a new `folderId`, `folderName`="SWT301", `parentFolderId`=null, and `status`="ACTIVE".
  - MySQL database contains a folder record with `name`="SWT301", `parent_folder_id` = NULL, and `owner_id` of User A.
- **Status:** `Not Run`

---

### TC-FLD-014 - Create Subfolder Successfully
- **Precondition:** User A is logged in. User A owns Folder ID `1` ("Math Notes"). No folder with folderName "Week 1" exists under Folder ID `1`.
- **Steps:**
  1. Send `POST /api/folders` with User A's session.
  2. Request Body:
     ```json
     {
       "folderName": "Week 1",
       "description": "Lecture documents",
       "parentFolderId": 1
     }
     ```
- **Expected Result:**
  - Status code: `200 OK`.
  - Response `success` is `true`.
  - Response `data` contains a new `folderId`, `folderName`="Week 1", `parentFolderId`=1, and `status`="ACTIVE".
  - MySQL database contains a folder record with `name`="Week 1", `parent_folder_id` = 1, and `owner_id` of User A.
- **Status:** `Not Run`

---

### TC-FLD-015 - Create Subfolder in a Folder Owned by Another User (403 Forbidden / 404 Not Found)
- **Precondition:** User A is logged in. Folder ID `2` is owned by User B.
- **Steps:**
  1. Send `POST /api/folders` with User A's session.
  2. Request Body:
     ```json
     {
       "folderName": "Week 2",
       "description": "Attacking folder",
       "parentFolderId": 2
     }
     ```
- **Expected Result:**
  - Status code: `403 Forbidden` or `404 Not Found`.
  - Response `success` is `false`.
  - Message states: "Access denied" or "Folder not found".
  - MySQL database record is NOT created.
- **Status:** `Not Run`

---

### TC-FLD-016 - Get Top-Level Folders Successfully
- **Precondition:** User A is logged in. User A has top-level folders (Folder ID `1` "Math Notes") and subfolders (Folder ID `3` "Week 1" which has `parentFolderId = 1`).
- **Steps:**
  1. Send `GET /api/folders/my` with User A's session (do not pass any query parameters, or pass `parentFolderId` as empty/null).
- **Expected Result:**
  - Status code: `200 OK`.
  - Response `success` is `true`.
  - Response `data` list contains Folder ID `1` ("Math Notes"), but does NOT contain Folder ID `3` ("Week 1").
- **Status:** `Not Run`

---

### TC-FLD-017 - Get Subfolders by parentFolderId Successfully
- **Precondition:** User A is logged in. User A has top-level folders (Folder ID `1` "Math Notes") and subfolders (Folder ID `3` "Week 1" under Folder ID `1`).
- **Steps:**
  1. Send `GET /api/folders/my?parentFolderId=1` with User A's session.
- **Expected Result:**
  - Status code: `200 OK`.
  - Response `success` is `true`.
  - Response `data` list contains Folder ID `3` ("Week 1"), but does NOT contain Folder ID `1` ("Math Notes").
- **Status:** `Not Run`

---

### TC-FLD-018 - User Cannot View Subfolders of Another User
- **Precondition:** User A is logged in. Folder ID `2` is owned by User B.
- **Steps:**
  1. Send `GET /api/folders/my?parentFolderId=2` with User A's session.
- **Expected Result:**
  - Status code: `403 Forbidden` or `404 Not Found`.
  - Response `success` is `false`.
  - Message states: "Access denied" or "Folder not found".
- **Status:** `Not Run`

---

### TC-FLD-019 - Browse Files UI Navigates to the Correct Folder View
- **Precondition:** User is logged in and is viewing the files dashboard.
- **Steps:**
  1. Click on a folder card in the Browse Files grid view.
  2. Verify the browser navigates to or renders the contents of the selected folder (e.g., updates the folder path indicator and filters the displayed items using the selected folder's ID).
- **Expected Result:**
  - UI updates the toolbar path / folder location.
  - The documents list displays only the active documents and subfolders belonging to the clicked folder.
- **Status:** `Not Run`

---

### TC-FLD-020 - Root Folders Display as "My Documents" on the UI
- **Precondition:** User is logged in and has navigated to the main files dashboard (root level view).
- **Steps:**
  1. View the breadcrumb path or current directory title on the UI toolbar.
- **Expected Result:**
  - The UI displays the directory name or path header as "My Documents" (even though technically the database/API represents this level as a `null` parent folder ID).
- **Status:** `Not Run`

---

### TC-FLD-021 - Folder Response Contains fileCount Property
- **Precondition:** User A is logged in. Folder ID `1` contains exactly 3 active documents.
- **Steps:**
  1. Send `GET /api/folders/my` with User A's session.
- **Expected Result:**
  - Status code: `200 OK`.
  - The returned Folder DTO for Folder ID `1` has a `fileCount` field with value `3`.
- **Status:** `Not Run`

---

### TC-FLD-022 - Folder Response Contains subfolderCount Property
- **Precondition:** User A is logged in. Folder ID `1` has exactly 2 active subfolders.
- **Steps:**
  1. Send `GET /api/folders/my` with User A's session.
- **Expected Result:**
  - Status code: `200 OK`.
  - The returned Folder DTO for Folder ID `1` has a `subfolderCount` field with value `2`.
- **Status:** `Not Run`
