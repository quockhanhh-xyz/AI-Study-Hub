# Document Upload Test Cases - Step 2

## Scope

Step 2 covers document upload through backend, Firebase Storage persistence, MySQL metadata persistence, and dashboard document listing for the authenticated user.

In scope:

- `POST /api/documents/upload`
- `GET /api/documents/my`
- Firebase Storage upload
- MySQL document metadata
- Authenticated ownership by JWT token

Out of scope:

- Search and filter
- Folder and subject CRUD
- Document sharing
- AI chatbot, quiz, and flashcards
- Admin moderation

---

## Common Preconditions

- Backend is running at `http://localhost:8080`.
- Frontend is running through Live Server.
- MySQL database `ai_study_hub` exists.
- Firebase Storage is configured for backend.
- A verified user account exists and can log in.
- Login returns an `accessToken`.
- Requests to protected APIs use:

```text
Authorization: Bearer <accessToken>
```

---

## Upload Document Test Cases

### TC-DOC-001 - Upload Valid PDF Successfully

Precondition:

- User is logged in.
- Valid PDF file is available.

Steps:

1. Send `POST /api/documents/upload`.
2. Use `multipart/form-data`.
3. Include `file`, `title`, and optional `description`.

Expected Result:

- Response status is `200 OK`.
- Response has `success=true`.
- Response `data` includes `documentId`, `fileUrl`, and `storagePath`.
- File exists in Firebase Storage.
- Metadata exists in MySQL table `documents`.

Status:

```text
Not Run
```

---

### TC-DOC-002 - Upload Without Login

Precondition:

- No `Authorization` header is sent.

Steps:

1. Send `POST /api/documents/upload`.
2. Include valid `file`, `title`, and `description`.

Expected Result:

- Response status is `401 Unauthorized` or `403 Forbidden`.
- Document is not saved in MySQL.
- File is not uploaded to Firebase Storage.

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
- File is not uploaded to Firebase Storage.

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
- File is not uploaded to Firebase Storage.

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
- File is not uploaded to Firebase Storage.

Status:

```text
Not Run
```

---

### TC-DOC-008 - Upload All Allowed File Types

Precondition:

- User is logged in.
- Valid files are available for PDF, DOCX, PPTX, TXT, PNG, JPG, and JPEG.

Steps:

1. Upload each allowed file type through `POST /api/documents/upload`.

Expected Result:

- Each allowed file type uploads successfully.
- Each response has `success=true`.
- Metadata is saved correctly for each document.

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
- Each item includes `documentId`, `title`, `fileName`, `fileType`, `fileSize`, `fileUrl`, and `createdAt`.

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

- No `Authorization` header is sent.

Steps:

1. Send `GET /api/documents/my`.

Expected Result:

- Response status is `401 Unauthorized` or `403 Forbidden`.
- No document data is returned.

Status:

```text
Not Run
```

---

## Integration Checklist

- File appears in Firebase Storage after successful upload.
- Metadata appears in MySQL table `documents` after successful upload.
- `owner_id` is the authenticated user ID.
- Frontend does not send `ownerId`.
- Response format always uses `success`, `message`, and `data`.
- JSON fields use camelCase.
- No Firebase service account key is pushed to GitHub.
- No `.env` or `application-local.properties` file is pushed to GitHub.
