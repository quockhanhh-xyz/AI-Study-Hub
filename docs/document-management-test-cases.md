# Document Management & Subject Organization Test Cases - Step 3

This document defines the functional test cases for Step 3: Document Management & Subject Organization.

## Preconditions

- Backend is running at `http://localhost:8080`.
- MySQL database has seeded subjects:
  - ID 1: `SWP391`
  - ID 2: `SWT301`
- Two users exist:
  - **User A**: `usera@test.com` (owns document with ID `101`)
  - **User B**: `userb@test.com` (owns document with ID `102`)

---

## Subject Retrieval Test Cases

### TC-SUB-001 - Get Active Subjects Successfully
- **Precondition:** User is logged in.
- **Steps:**
  1. Send `GET /api/subjects` with User A's token.
- **Expected Result:**
  - Status code: `200 OK`.
  - Response `success` is `true`.
  - Response `data` is a list of active subjects containing `subjectId`, `subjectCode`, `subjectName`, and `description`.
- **Status:** `Not Run`

---

## Document List, Search & Filter Test Cases

### TC-DOC-013 - Get My Documents Without Filtering
- **Precondition:** User A is logged in. User A has documents in the database.
- **Steps:**
  1. Send `GET /api/documents/my` with User A's token.
- **Expected Result:**
  - Status code: `200 OK`.
  - Response `success` is `true`.
  - Response `data` lists all active documents owned by User A.
- **Status:** `Not Run`

### TC-DOC-014 - Search My Documents by Keyword
- **Precondition:** User A has documents titled "SWR Lecture 1" and "Database Lab".
- **Steps:**
  1. Send `GET /api/documents/my?keyword=lecture` with User A's token.
- **Expected Result:**
  - Status code: `200 OK`.
  - Response `success` is `true`.
  - Response `data` only lists the document "SWR Lecture 1".
- **Status:** `Not Run`

### TC-DOC-015 - Filter My Documents by Subject
- **Precondition:** User A has one document under Subject ID `1` and one under Subject ID `2`.
- **Steps:**
  1. Send `GET /api/documents/my?subjectId=1` with User A's token.
- **Expected Result:**
  - Status code: `200 OK`.
  - Response `success` is `true`.
  - Response `data` only lists the document under Subject ID `1`.
- **Status:** `Not Run`

### TC-DOC-016 - Filter My Documents by File Type
- **Precondition:** User A has a PDF document and a DOCX document.
- **Steps:**
  1. Send `GET /api/documents/my?fileType=PDF` with User A's token.
- **Expected Result:**
  - Status code: `200 OK`.
  - Response `success` is `true`.
  - Response `data` only lists the PDF document.
- **Status:** `Not Run`

---

## Document Detail Test Cases

### TC-DOC-017 - Get Document Detail Successfully
- **Precondition:** User A is logged in and owns document ID `101`.
- **Steps:**
  1. Send `GET /api/documents/101` with User A's token.
- **Expected Result:**
  - Status code: `200 OK`.
  - Response `success` is `true`.
  - Response `data` includes all metadata of document `101`.
- **Status:** `Not Run`

### TC-DOC-018 - Get Document Detail of Another User (403 Forbidden)
- **Precondition:** User B is logged in. Document ID `101` is owned by User A.
- **Steps:**
  1. Send `GET /api/documents/101` with User B's token.
- **Expected Result:**
  - Status code: `403 Forbidden`.
  - Response `success` is `false`.
  - Message states: "You do not have permission to access this document.".
- **Status:** `Not Run`

---

## Document Update Test Cases

### TC-DOC-019 - Update Document Metadata Successfully
- **Precondition:** User A is logged in and owns document ID `101`.
- **Steps:**
  1. Send `PUT /api/documents/101` with User A's token.
  2. Request Body:
     ```json
     {
       "title": "Updated Lecture 1",
       "description": "Updated Description",
       "subjectId": 2
     }
     ```
- **Expected Result:**
  - Status code: `200 OK`.
  - Response `success` is `true`.
  - MySQL database shows updated title, description, and subject ID for document `101`.
- **Status:** `Not Run`

### TC-DOC-020 - Update Document Owned by Another User (Forbidden)
- **Precondition:** User B is logged in. Document ID `101` is owned by User A.
- **Steps:**
  1. Send `PUT /api/documents/101` with User B's token.
  2. Request Body:
     ```json
     {
       "title": "Hack Title",
       "description": "Hack Description",
       "subjectId": 2
     }
     ```
- **Expected Result:**
  - Status code: `403 Forbidden`.
  - Response `success` is `false`.
  - Message states: "You do not have permission to edit this document.".
  - MySQL database metadata for document `101` is NOT changed.
- **Status:** `Not Run`

### TC-DOC-020a - Update Document with Non-existent or Inactive Subject ID (404 Not Found)
- **Precondition:** User A is logged in and owns document ID `101`. Subject ID `999` does not exist in the database (or is inactive).
- **Steps:**
  1. Send `PUT /api/documents/101` with User A's token.
  2. Request Body:
     ```json
     {
       "title": "Updated Title",
       "description": "Updated Description",
       "subjectId": 999
     }
     ```
- **Expected Result:**
  - Status code: `404 Not Found`.
  - Response `success` is `false`.
  - Message states: "Subject not found".
  - MySQL database document `101` metadata is NOT updated.
- **Status:** `Not Run`

---

## Document Deletion Test Cases

### TC-DOC-021 - Delete Document Successfully
- **Precondition:** User A is logged in and owns document ID `101`.
- **Steps:**
  1. Send `DELETE /api/documents/101` with User A's token.
- **Expected Result:**
  - Status code: `200 OK`.
  - Response `success` is `true`.
  - MySQL database has document `101` status updated to `DELETED` (soft delete).
  - Subsequent requests to `GET /api/documents/my` or `GET /api/documents/101` do NOT return document `101`.
- **Status:** `Not Run`

### TC-DOC-022 - Delete Document Owned by Another User (Forbidden)
- **Precondition:** User B is logged in. Document ID `101` is owned by User A.
- **Steps:**
  1. Send `DELETE /api/documents/101` with User B's token.
- **Expected Result:**
  - Status code: `403 Forbidden`.
  - Response `success` is `false`.
  - Message states: "You do not have permission to delete this document.".
  - MySQL database document `101` status remains `ACTIVE`.
- **Status:** `Not Run`

---

## Document Not Found Test Cases

### TC-DOC-023 - Access Non-existent Document (404 Not Found)
- **Precondition:** User A is logged in. Document ID `999` does not exist in the database.
- **Steps:**
  1. Send `GET /api/documents/999` with User A's token.
  2. Send `PUT /api/documents/999` with User A's token and request body:
     ```json
     {
       "title": "Updated Title",
       "description": "Updated Description",
       "subjectId": 1
     }
     ```
  3. Send `DELETE /api/documents/999` with User A's token.
- **Expected Result:**
  - Each request returns status code: `404 Not Found`.
  - Response `success` is `false`.
  - Message states: "Document not found.".
- **Status:** `Not Run`

---

## Document Upload with Subject Test Cases

### TC-DOC-024 - Upload Document With Subject ID Successfully
- **Precondition:** User A is logged in. Subject ID `1` exists in the database.
- **Steps:**
  1. Send `POST /api/documents/upload` with User A's token.
  2. Format: `multipart/form-data`.
  3. Include `file` (valid), `title`="SWR Lecture 1", `description`="Week 1 note", and `subjectId`=1.
- **Expected Result:**
  - Status code: `200 OK`.
  - Response `success` is `true`.
  - Response `data` includes: `subjectId`=1, `subjectCode`="SWP391", `subjectName`="Software Project".
  - MySQL database document record has `subject_id` set to `1`.
- **Status:** `Not Run`

### TC-DOC-024a - Upload Document with Non-existent or Inactive Subject ID (404 Not Found)
- **Precondition:** User A is logged in. Subject ID `999` does not exist in the database (or is inactive).
- **Steps:**
  1. Send `POST /api/documents/upload` with User A's token.
  2. Format: `multipart/form-data`.
  3. Include `file` (valid), `title`="SWR Lecture 1", `description`="Week 1 note", and `subjectId`=999.
- **Expected Result:**
  - Status code: `404 Not Found`.
  - Response `success` is `false`.
  - Message states: "Subject not found".
  - MySQL database document record is NOT created and Cloudinary file is NOT uploaded.
- **Status:** `Not Run`

---

## Authorization Security Test Cases

### TC-SEC-001 - Call APIs Without Logging In (Unauthorized)
- **Precondition:** No `Authorization` header is provided.
- **Steps:**
  1. Send `GET /api/subjects`.
  2. Send `GET /api/documents/my`.
  3. Send `GET /api/documents/101`.
  4. Send `PUT /api/documents/101`.
  5. Send `DELETE /api/documents/101`.
- **Expected Result:**
  - Each request returns status code: `401 Unauthorized`.
  - Response `success` is `false`.
  - Response `message` matches: "Your session has expired. Please log in again.".
- **Status:** `Not Run`
