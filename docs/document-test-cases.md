# Document Upload Test Cases - Step 2 (Cloudinary Storage)

## Scope

Step 2 covers document upload through backend, Cloudinary Storage persistence, MySQL metadata persistence, and dashboard document listing for the authenticated user.

In scope:

- `POST /api/documents/upload`
- `GET /api/documents/my`
- Cloudinary Storage upload
- MySQL document metadata
- Authenticated ownership by HttpOnly cookie session

Out of scope:

- Search and filter
- Folder and subject CRUD
- Document sharing
- AI chatbot, quiz, and flashcards
- Admin moderation

---

## Common Preconditions

- Backend is running at `http://localhost:8080`.
- Frontend is running through Live Server at `http://localhost:5500`.
- MySQL database `ai_study_hub` exists.
- Cloudinary accounts are configured for the backend.
- A verified user account exists and can log in.
- Login sets a secure `HttpOnly` cookie named `accessToken`.
- Requests to protected APIs automatically include the cookie (browser handles credentials propagation via `credentials: "include"`).

---

## Upload Document Test Cases

### TC-DOC-001 - Upload Valid PDF Successfully

Precondition:

- User is logged in.
- Valid PDF file is available.

Steps:

1. Send `POST /api/documents/upload`.
2. Use `multipart/form-data` format using `FormData`.
3. Include `file`, `title`, and optional `description`.
4. *Do not manually set the `Content-Type` header (let the browser generate the multipart boundary).*

Expected Result:

- Response status is `200 OK`.
- Response has `success=true`.
- Response `data` includes:
  - `documentId`
  - `title`
  - `description`
  - `originalFileName`
  - `fileType`
  - `fileSize`
  - `fileUrl` (Cloudinary secure_url)
  - `publicId` (Cloudinary public_id)
  - `uploadedBy` (Owner email)
  - `createdAt`
- File exists in Cloudinary Storage.
- Metadata exists in MySQL table `documents` matching these DTO fields.

Status:

```text
Not Run
```

---

### TC-DOC-002 - Upload Without Login

Precondition:

- No active session (the `accessToken` cookie is missing or invalid).

Steps:

1. Send `POST /api/documents/upload`.
2. Include valid `file`, `title`, and `description`.

Expected Result:

- Response status is `401 Unauthorized` (intercepted by Custom `JwtAuthenticationEntryPoint`).
- Document is not saved in MySQL.
- File is not uploaded to Cloudinary Storage.

Status:

```text
Not Run
```

---

### TC-DOC-003 - Upload Missing File

Precondition:

- User is logged in.

Steps:

1. Send `POST /api/documents/upload`.
2. Include `title` and `description`.
3. Do not include `file`.

Expected Result:

- Response status is `400 Bad Request`.
- Response has `success=false`.
- Message is `File is required`.
- No metadata is saved.

Status:

```text
Not Run
```

---

### TC-DOC-004 - Upload Missing Title

Precondition:

- User is logged in.
- Valid file is available.

Steps:

1. Send `POST /api/documents/upload`.
2. Include `file`.
3. Do not include `title`.

Expected Result:

- Response status is `400 Bad Request`.
- Response has `success=false`.
- Message is `Title is required`.
- No metadata is saved.

Status:

```text
Not Run
```

---

### TC-DOC-005 - Upload Empty File

Precondition:

- User is logged in.
- Empty file is available.

Steps:

1. Send `POST /api/documents/upload`.
2. Include empty `file` and valid `title`.

Expected Result:

- Response status is `400 Bad Request`.
- Response has `success=false`.
- No metadata is saved.
- File is not uploaded to Cloudinary Storage.

Status:

```text
Not Run
```

---

### TC-DOC-006 - Upload File Larger Than 10MB

Precondition:

- User is logged in.
- A file larger than 10MB is available.

Steps:

1. Send `POST /api/documents/upload`.
2. Include file larger than 10MB and valid `title`.

Expected Result:

- Response status is `400 Bad Request`.
- Response has `success=false`.
- Message is `File size exceeds 10MB`.
- No metadata is saved.
- File is not uploaded to Cloudinary Storage.

Status:

```text
Not Run
```

---

### TC-DOC-007 - Upload Invalid File Type

Precondition:

- User is logged in.
- Invalid file type is available, for example `.exe`.

Steps:

1. Send `POST /api/documents/upload`.
2. Include invalid file and valid `title`.

Expected Result:

- Response status is `400 Bad Request`.
- Response has `success=false`.
- Message is `Invalid file type`.
- No metadata is saved.
- File is not uploaded to Cloudinary Storage.

Status:

```text
Not Run
```

---

### TC-DOC-008 - Upload All Allowed File Types

Precondition:

- User is logged in.
- Valid files are available for PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, TXT, JPG, JPEG, and PNG.

Steps:

1. Upload each allowed file type through `POST /api/documents/upload`.

Expected Result:

- Each allowed file type uploads successfully.
- Each response has `success=true`.
- Metadata is saved correctly for each document.
- Cloudinary handles resource type appropriately (`raw` for documents/text, `image` for images).

Status:

```text
Not Run
```

---

## Get My Documents Test Cases

### TC-DOC-009 - Get My Documents Successfully

Precondition:

- User is logged in.
- User already uploaded at least one document.

Steps:

1. Send `GET /api/documents/my`.

Expected Result:

- Response status is `200 OK`.
- Response has `success=true`.
- Response `data` is an array.
- Each item includes:
  - `documentId`
  - `title`
  - `description`
  - `originalFileName`
  - `fileType`
  - `fileSize`
  - `fileUrl`
  - `publicId`
  - `uploadedBy`
  - `createdAt`

Status:

```text
Not Run
```

---

### TC-DOC-010 - Get My Documents When Empty

Precondition:

- User is logged in.
- User has no uploaded documents.

Steps:

1. Send `GET /api/documents/my`.

Expected Result:

- Response status is `200 OK`.
- Response has `success=true`.
- Response `data` is an empty array.

Status:

```text
Not Run
```

---

### TC-DOC-011 - User Only Sees Own Documents

Precondition:

- User A and User B exist.
- User A uploaded one document.
- User B uploaded one document.

Steps:

1. Login as User A.
2. Send `GET /api/documents/my`.
3. Login as User B.
4. Send `GET /api/documents/my`.

Expected Result:

- User A only sees User A documents.
- User B only sees User B documents.
- No response includes documents owned by another user.

Status:

```text
Not Run
```

---

### TC-DOC-012 - Get My Documents Without Login

Precondition:

- No active session (the `accessToken` cookie is missing or invalid).

Steps:

1. Send `GET /api/documents/my`.

Expected Result:

- Response status is `401 Unauthorized` (intercepted by Custom `JwtAuthenticationEntryPoint`).
- No document data is returned.

Status:

```text
Not Run
```

---

## Duplicate Upload and Folder Test Cases

### TC-DOC-029 - Upload New File to My Documents Successfully
- **Precondition:** User is logged in. No document with name "sample.pdf" and the same file size exists in the root folder for this user.
- **Steps:**
  1. Send `POST /api/documents/upload`.
  2. Multipart Form Data includes: `file` (sample.pdf, size 50000 bytes), `title`="Sample PDF", `folderId`=null (or omitted).
- **Expected Result:**
  - Status code: `200 OK`.
  - Response `success` is `true`.
  - File is uploaded to Cloudinary.
  - Metadata is saved in MySQL with `folder_id = NULL` and `status = 'ACTIVE'`.
- **Status:** `Not Run`

---

### TC-DOC-030 - Upload Duplicate File in My Documents (409 Conflict)
- **Precondition:** User is logged in. An active document with original file name "sample.pdf" and size 50000 bytes already exists in the root folder for this user.
- **Steps:**
  1. Send `POST /api/documents/upload`.
  2. Multipart Form Data includes: `file` (sample.pdf, size 50000 bytes), `title`="Sample PDF Duplicate", `folderId`=null (or omitted).
- **Expected Result:**
  - Status code: `409 Conflict`.
  - Response `success` is `false`.
  - Message states: "A file with the same name and file size already exists in this folder.".
  - Backend does NOT invoke Cloudinary upload.
  - No new record is inserted into the database.
- **Status:** `Not Run`

---

### TC-DOC-031 - Upload Duplicate File in the Same Folder (409 Conflict)
- **Precondition:** User is logged in. Folder ID `1` exists and is owned by the user. An active document with original file name "lecture1.docx" and size 120000 bytes already exists in Folder ID `1`.
- **Steps:**
  1. Send `POST /api/documents/upload`.
  2. Multipart Form Data includes: `file` (lecture1.docx, size 120000 bytes), `title`="Lecture 1 Duplicate", `folderId`=1.
- **Expected Result:**
  - Status code: `409 Conflict`.
  - Response `success` is `false`.
  - Message states: "A file with the same name and file size already exists in this folder.".
  - Backend does NOT invoke Cloudinary upload.
  - No new record is inserted into the database.
- **Status:** `Not Run`

---

### TC-DOC-032 - Upload Same File Name to Different Folders (Success)
- **Precondition:** User is logged in. Folder ID `1` and Folder ID `2` exist and are owned by the user. An active document with original file name "homework.docx" and size 80000 bytes exists in Folder ID `1`. No document with that name/size exists in Folder ID `2`.
- **Steps:**
  1. Send `POST /api/documents/upload`.
  2. Multipart Form Data includes: `file` (homework.docx, size 80000 bytes), `title`="Homework in Folder 2", `folderId`=2.
- **Expected Result:**
  - Status code: `200 OK`.
  - Response `success` is `true`.
  - File is uploaded to Cloudinary.
  - Metadata is saved in MySQL under Folder ID `2`.
- **Status:** `Not Run`

---

### TC-DOC-033 - Upload Same File Name but with Different File Size (Success)
- **Precondition:** User is logged in. An active document with original file name "homework.docx" and size 80000 bytes exists in the root folder. No document with name "homework.docx" and size 95000 bytes exists in the root folder.
- **Steps:**
  1. Send `POST /api/documents/upload`.
  2. Multipart Form Data includes: `file` (homework.docx, size 95000 bytes), `title`="Updated Homework", `folderId`=null.
- **Expected Result:**
  - Status code: `200 OK`.
  - Response `success` is `true`.
  - File is uploaded to Cloudinary.
  - Metadata is saved in MySQL.
- **Status:** `Not Run`

---

### TC-DOC-034 - Upload Previously Deleted File (Success)
- **Precondition:** User is logged in. A document with original file name "deleted_note.pdf" and size 35000 bytes exists in the root folder but has `status = 'DELETED'` (is in trash).
- **Steps:**
  1. Send `POST /api/documents/upload`.
  2. Multipart Form Data includes: `file` (deleted_note.pdf, size 35000 bytes), `title`="New Note", `folderId`=null.
- **Expected Result:**
  - Status code: `200 OK`.
  - Response `success` is `true`.
  - File is uploaded to Cloudinary.
  - A new active document record is successfully saved in MySQL.
- **Status:** `Not Run`

### TC-DOC-035 - Upload Document with Subject Successfully
- **Precondition:** User is logged in. Subject ID `1` exists and is active in the database.
- **Steps:**
  1. Send `POST /api/documents/upload` with the user's session.
  2. Multipart Form Data includes: `file` (notes.pdf), `title`="Math Lecture Notes", `subjectId`=1.
- **Expected Result:**
  - Status code: `200 OK`.
  - Response `success` is `true`.
  - Response `data` includes `subjectId`=1, `subjectCode` and `subjectName` matching the subject record.
  - File is uploaded to Cloudinary, and metadata in MySQL has `subject_id` set to 1.
- **Status:** `Not Run`

---

### TC-DOC-036 - Upload Document Without subjectId (400 Bad Request)
- **Precondition:** User is logged in.
- **Steps:**
  1. Send `POST /api/documents/upload` with the user's session.
  2. Multipart Form Data includes: `file` (notes.pdf), `title`="Math Lecture Notes" (omit `subjectId`).
- **Expected Result:**
  - Status code: `400 Bad Request`.
  - Response `success` is `false`.
  - Message states: "Subject ID is required" or similar validation error message.
  - No database record is created, and no Cloudinary upload occurs.
- **Status:** `Not Run`

---

### TC-DOC-037 - Document in Subfolder Appears on Dashboard
- **Precondition:** User is logged in. Folder ID `2` is a subfolder of Folder ID `1`. Document ID `201` exists and is active inside Folder ID `2`.
- **Steps:**
  1. Navigate to the main Dashboard (representing the root overview).
  2. Fetch user documents without folder filter (`GET /api/documents/my` without query parameters).
- **Expected Result:**
  - Status code: `200 OK`.
  - Response lists Document ID `201` as part of the overall documents list, verifying that files inside subfolders still appear on the general dashboard query.
- **Status:** `Not Run`

---

### TC-DOC-038 - Filter Documents by Folder with includeSubfolders=true
- **Precondition:** User is logged in. Folder ID `1` (parent) has subfolder Folder ID `2` (child). Active Document ID `101` is inside Folder `1`. Active Document ID `201` is inside Folder `2`.
- **Steps:**
  1. Send `GET /api/documents/my?folderId=1&includeSubfolders=true`.
- **Expected Result:**
  - Status code: `200 OK`.
  - Response lists both Document ID `101` and Document ID `201`.
- **Status:** `Not Run`

---

### TC-DOC-039 - Duplicate Upload Prevention (409 Conflict)
- **Precondition:** User is logged in. An active document with file name "intro.pdf" and size 75000 bytes exists in Folder ID `1`.
- **Steps:**
  1. Send `POST /api/documents/upload`.
  2. Include `file` (intro.pdf, size 75000 bytes), `title`="Intro Copy", `subjectId`=1, `folderId`=1.
- **Expected Result:**
  - Status code: `409 Conflict`.
  - Response `success` is `false`.
  - Response message indicates duplicate document conflict.
- **Status:** `Not Run`

---

### TC-DOC-040 - Duplicate File Not Uploaded to Cloudinary
- **Precondition:** User is logged in. An active document with file name "intro.pdf" and size 75000 bytes exists in Folder ID `1`.
- **Steps:**
  1. Send `POST /api/documents/upload` with the duplicate file.
  2. Monitor Cloudinary API calls during backend execution.
- **Expected Result:**
  - Response status is `409 Conflict`.
  - Backend validation aborts immediately upon database match, and no network request to upload files is made to Cloudinary.
- **Status:** `Not Run`

---

### TC-DOC-041 - Trash Item Access Restriction (Open/Download Disabled)
- **Precondition:** User is logged in. Document ID `301` has `status = 'DELETED'` (is in trash).
- **Steps:**
  1. Navigate to the Trash view page (`trash.html`).
  2. Attempt to open or download Document ID `301` from the list.
- **Expected Result:**
  - The UI does not display any "Open File" or "View Details" buttons/actions for Document ID `301` in the Trash.
  - Any direct API requests to retrieve the download link or details for Document ID `301` are rejected by the backend.
- **Status:** `Not Run`

---

### TC-DOC-042 - Root Folder Labeling as "My Documents"
- **Precondition:** User is logged in and is viewing the main file list dashboard.
- **Steps:**
  1. Observe the text label and breadcrumbs for the top-level directory where `folderId = null`.
- **Expected Result:**
  - The UI displays the standard label "My Documents".
  - All technical terms or labels such as "root", "No folder", or "unassigned" are removed.
- **Status:** `Not Run`

---

## Integration Checklist

- File appears in Cloudinary Storage after successful upload.
- Metadata appears in MySQL table `documents` after successful upload.
- `owner_id` is the authenticated user ID resolved on the backend.
- Frontend does not send `ownerId` or `userId`.
- Response format always uses `success`, `message`, and `data`.
- JSON fields use camelCase.
- No Cloudinary credentials (cloud name, API key, API secret) are pushed to GitHub.
- No `.env` or local configuration properties file is pushed to GitHub.
- Config defaults prevent the application from crashing if Cloudinary environment variables are missing at startup.
- The application remains clean of any Firebase Storage dependencies in the Step 2 flow.
