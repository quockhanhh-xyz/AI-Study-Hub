# Folder & Trash Management Test Cases - Step 5

This document defines the functional test cases for Step 5: Folder & Trash Management.

## Preconditions

- Backend is running at `http://localhost:8080`.
- Two users exist and are verified:
  - **User A**: `usera@test.com` (owns Folder ID `1` named "Math Notes", and active Document ID `101` inside Folder `1`)
  - **User B**: `userb@test.com` (owns Folder ID `2` named "Calculus Notes", and active Document ID `102` inside Folder `2`)
- The JWT tokens for User A and User B are generated and active.

---

## Folder CRUD Test Cases

### TC-FLD-001 - Create Folder Successfully
- **Precondition:** User A is logged in.
- **Steps:**
  1. Send `POST /api/folders` with User A's token.
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
  1. Send `POST /api/folders` with User A's token.
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

### TC-FLD-003 - Create Folder with Duplicate Name (400 Bad Request)
- **Precondition:** User A is logged in and already owns an active folder named "Math Notes".
- **Steps:**
  1. Send `POST /api/folders` with User A's token.
  2. Request Body:
     ```json
     {
       "name": "Math Notes"
     }
     ```
- **Expected Result:**
  - Status code: `400 Bad Request`.
  - Response `success` is `false`.
  - Response `message` states: "Folder name already exists".
  - MySQL database record is NOT created.
- **Status:** `Not Run`

### TC-FLD-004 - Create Folder with Duplicate Name of a Soft-Deleted Folder (Success)
- **Precondition:** User A is logged in. User A has a soft-deleted folder (`status = 'DELETED'`) named "Old Physics".
- **Steps:**
  1. Send `POST /api/folders` with User A's token.
  2. Request Body:
     ```json
     {
       "name": "Old Physics"
     }
     ```
- **Expected Result:**
  - Status code: `200 OK`.
  - Response `success` is `true`.
  - MySQL database contains two folders with the name "Old Physics" for User A: one `'ACTIVE'` (new) and one `'DELETED'`.
- **Status:** `Not Run`

### TC-FLD-005 - Get My Folders Successfully
- **Precondition:** User A is logged in and owns folder "Math Notes" (ACTIVE) and folder "Old Physics" (DELETED).
- **Steps:**
  1. Send `GET /api/folders` with User A's token.
- **Expected Result:**
  - Status code: `200 OK`.
  - Response `success` is `true`.
  - Response `data` is a list containing only active folders (e.g., "Math Notes" is present, "Old Physics" is NOT present).
- **Status:** `Not Run`

### TC-FLD-006 - Update Folder Name Successfully
- **Precondition:** User A is logged in and owns active Folder ID `1` ("Math Notes").
- **Steps:**
  1. Send `PUT /api/folders/1` with User A's token.
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
  1. Send `PUT /api/folders/1` with User B's token.
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

### TC-FLD-008 - Update Folder to a Name That Already Exists (400 Bad Request)
- **Precondition:** User A is logged in. User A owns Folder ID `1` ("Math Notes") and another active Folder ID `3` ("Chemistry").
- **Steps:**
  1. Send `PUT /api/folders/1` with User A's token.
  2. Request Body:
     ```json
     {
       "name": "Chemistry"
     }
     ```
- **Expected Result:**
  - Status code: `400 Bad Request`.
  - Response `success` is `false`.
  - Message states: "Folder name already exists".
  - Folder ID `1` name remains "Math Notes".
- **Status:** `Not Run`

---

## Document Move Test Cases

### TC-DOC-025 - Move Document to Folder Successfully
- **Precondition:** User A is logged in. User A owns active Document ID `101` and active Folder ID `1` ("Math Notes").
- **Steps:**
  1. Send `PUT /api/documents/101/move` with User A's token.
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
  1. Send `PUT /api/documents/101/move` with User A's token.
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
  1. Send `PUT /api/documents/101/move` with User B's token.
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
  1. Send `PUT /api/documents/101/move` with User A's token.
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

---

## Soft-delete & Trash Retrieval Test Cases

### TC-FLD-009 - Soft-delete Folder and Check Cascade Soft-delete of Documents
- **Precondition:** User A is logged in. User A owns Folder ID `1` ("Math Notes") and Document ID `101` which has `folder_id = 1` and `status = 'ACTIVE'`.
- **Steps:**
  1. Send `DELETE /api/folders/1` with User A's token.
- **Expected Result:**
  - Status code: `200 OK`.
  - Response `success` is `true`.
  - MySQL database shows Folder ID `1` status is `'DELETED'` and `deleted_at` has the current timestamp.
  - MySQL database shows Document ID `101` status is `'DELETED'` and `deleted_at` matches Folder ID `1`'s `deleted_at` timestamp.
  - Standard document and folder listings (`GET /api/documents/my`, `GET /api/folders`) do NOT return Folder ID `1` or Document ID `101`.
- **Status:** `Not Run`

### TC-TRSH-001 - Retrieve Trash Items Successfully
- **Precondition:** User A has soft-deleted Folder ID `1` and soft-deleted Document ID `101` (inside Folder `1`).
- **Steps:**
  1. Send `GET /api/trash` with User A's token.
- **Expected Result:**
  - Status code: `200 OK`.
  - Response `success` is `true`.
  - Response `data` lists Folder ID `1` under `"folders"` and Document ID `101` under `"documents"`.
- **Status:** `Not Run`

---

## Restore Test Cases

### TC-TRSH-002 - Restore Folder Successfully
- **Precondition:** User A has soft-deleted Folder ID `1` (`deleted_at` = T) and Document ID `101` (inside Folder `1` with `deleted_at` = T).
- **Steps:**
  1. Send `POST /api/trash/folders/1/restore` with User A's token.
- **Expected Result:**
  - Status code: `200 OK`.
  - Response `success` is `true`.
  - MySQL database shows Folder ID `1` `status` is `'ACTIVE'` and `deleted_at` is `NULL`.
  - MySQL database shows Document ID `101` `status` is `'ACTIVE'` and `deleted_at` is `NULL` (restored because its deletion timestamp matched the folder T).
- **Status:** `Not Run`

### TC-TRSH-003 - Restore Document Individually Successfully
- **Precondition:** User A owns soft-deleted Document ID `101` (currently in trash). The parent Folder ID `1` is still ACTIVE.
- **Steps:**
  1. Send `POST /api/trash/documents/101/restore` with User A's token.
- **Expected Result:**
  - Status code: `200 OK`.
  - Response `success` is `true`.
  - MySQL database shows Document ID `101` `status` is `'ACTIVE'` and `deleted_at` is `NULL`.
  - Document ID `101` remains assigned to Folder ID `1`.
- **Status:** `Not Run`

### TC-TRSH-004 - Restore Document whose Parent Folder is in Trash (Restored to Root)
- **Precondition:** User A has soft-deleted Folder ID `1` and Document ID `101` (inside Folder `1`). The folder is NOT yet restored.
- **Steps:**
  1. Send `POST /api/trash/documents/101/restore` with User A's token.
- **Expected Result:**
  - Status code: `200 OK`.
  - Response `success` is `true`.
  - MySQL database shows Document ID `101` `status` is `'ACTIVE'` and `deleted_at` is `NULL`.
  - Document ID `101` has its `folder_id` updated to `NULL` (restored to root because its parent folder is still in trash/deleted).
- **Status:** `Not Run`

### TC-TRSH-005 - Restore Folder/Document of Another User (403 Forbidden)
- **Precondition:** User B is logged in. User A owns soft-deleted Folder ID `1`.
- **Steps:**
  1. Send `POST /api/trash/folders/1/restore` with User B's token.
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
  1. Send `DELETE /api/trash/documents/101` with User A's token.
- **Expected Result:**
  - Status code: `200 OK`.
  - Response `success` is `true`.
  - MySQL database has record for Document ID `101` completely removed (hard deleted).
  - Cloudinary Storage physical file corresponding to public ID `ai-study-hub/documents/1/math.pdf` is deleted.
- **Status:** `Not Run`

### TC-TRSH-007 - Permanent Delete Folder and All Its Contents
- **Precondition:** User A is logged in. User A has soft-deleted Folder ID `1`. Document ID `101` and Document ID `103` are inside Folder `1`.
- **Steps:**
  1. Send `DELETE /api/trash/folders/1` with User A's token.
- **Expected Result:**
  - Status code: `200 OK`.
  - Response `success` is `true`.
  - MySQL database has record for Folder ID `1` completely removed.
  - MySQL database has records for both Document ID `101` and `103` completely removed (hard deleted).
  - Their physical files are deleted from Cloudinary Storage using their respective public IDs.
- **Status:** `Not Run`

### TC-TRSH-008 - Permanent Delete Folder/Document of Another User (403 Forbidden)
- **Precondition:** User B is logged in. User A owns soft-deleted Folder ID `1`.
- **Steps:**
  1. Send `DELETE /api/trash/folders/1` with User B's token.
- **Expected Result:**
  - Status code: `403 Forbidden`.
  - Response `success` is `false`.
  - Message states: "Access denied".
  - MySQL database Folder ID `1` remains in trash.
- **Status:** `Not Run`
