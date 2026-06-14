# API Contract - AI Study Hub

## Base URL

```text
http://localhost:8080
```

---

## Common Response Format

### Success Response

```json
{
  "success": true,
  "message": "Action completed successfully",
  "data": {}
}
```

### Error Response

```json
{
  "success": false,
  "message": "Error message",
  "data": null
}
```

---

# 1. Health Check API

## GET `/api/health`

Used to check whether the backend server is running.

### Success Response

```json
{
  "success": true,
  "message": "AI Study Hub backend is running",
  "data": {
    "status": "UP"
  }
}
```

---

# 2. Authentication APIs with Gmail OTP

## 2.1. Register API

## POST `/api/auth/register`

Registers a new user account with status `INACTIVE` and sends a 6-digit OTP to the user's email.

### Request Body

```json
{
  "fullName": "Nguyen Van A",
  "email": "user@gmail.com",
  "password": "12345678"
}
```

### Success Response

```json
{
  "success": true,
  "message": "Register successfully. Please verify OTP sent to your email.",
  "data": {
    "email": "user@gmail.com",
    "status": "INACTIVE"
  }
}
```

### Error Response - Email Already Exists

```json
{
  "success": false,
  "message": "Email already exists",
  "data": null
}
```

### Error Response - Invalid Input

```json
{
  "success": false,
  "message": "Invalid registration information",
  "data": null
}
```

---

## 2.2. Verify OTP API

## POST `/api/auth/verify-otp`

Verifies the 6-digit OTP sent to the user's email. If the OTP is valid, the user's status changes from `INACTIVE` to `ACTIVE`.

### Request Body

```json
{
  "email": "user@gmail.com",
  "otpCode": "123456"
}
```

### Success Response

```json
{
  "success": true,
  "message": "Email verified successfully",
  "data": {
    "email": "user@gmail.com",
    "status": "ACTIVE"
  }
}
```

### Error Response - Invalid OTP

```json
{
  "success": false,
  "message": "Invalid OTP",
  "data": null
}
```

### Error Response - Expired OTP

```json
{
  "success": false,
  "message": "OTP has expired",
  "data": null
}
```

### Error Response - User Not Found

```json
{
  "success": false,
  "message": "User not found",
  "data": null
}
```

### Error Response - Account Already Verified

```json
{
  "success": false,
  "message": "Account is already verified",
  "data": null
}
```

---

## 2.3. Resend OTP API

## POST `/api/auth/resend-otp`

Sends a new OTP to the user's email if the account exists and has not been verified.

### Request Body

```json
{
  "email": "user@gmail.com"
}
```

### Success Response

```json
{
  "success": true,
  "message": "OTP has been resent to your email",
  "data": {
    "email": "user@gmail.com"
  }
}
```

### Error Response - User Not Found

```json
{
  "success": false,
  "message": "User not found",
  "data": null
}
```

### Error Response - Account Already Verified

```json
{
  "success": false,
  "message": "Account is already verified",
  "data": null
}
```

---

## 2.4. Login API

## POST `/api/auth/login`

Logs in a user account. Only users with status `ACTIVE` can log in. Sets a secure `HttpOnly` cookie in the HTTP headers.

### Request Body

```json
{
  "email": "user@gmail.com",
  "password": "12345678"
}
```

### Success Response Headers

```http
Set-Cookie: accessToken=jwt-token-value-here; Path=/; HttpOnly; SameSite=Strict; Secure
```
*(Note: The `Secure` flag is enabled in production environments.)*

### Success Response Body

*(Note: The JWT token is NOT returned in the response body for security against XSS attacks.)*

```json
{
  "success": true,
  "message": "Login successfully",
  "data": {
    "userId": 1,
    "fullName": "Nguyen Van A",
    "email": "user@gmail.com",
    "role": "USER",
    "status": "ACTIVE"
  }
}
```

### Error Response - Invalid Email or Password

```json
{
  "success": false,
  "message": "Invalid email or password",
  "data": null
}
```

### Error Response - Account Not Verified

```json
{
  "success": false,
  "message": "Please verify your email before login",
  "data": null
}
```

### Error Response - Account Blocked

```json
{
  "success": false,
  "message": "Your account has been blocked",
  "data": null
}
```

---

## 2.5. Get Current User API

## GET `/api/auth/me`

Returns the current logged-in user's information. No authentication headers are required; the browser automatically sends the HttpOnly `accessToken` cookie.

### Request Headers

- Cookie: `accessToken=jwt-token-value-here`
- *(Note: No `Authorization` header is sent. Cross-origin requests must be sent with credentials/cookies enabled.)*

### Success Response

```json
{
  "success": true,
  "message": "Current user retrieved successfully",
  "data": {
    "userId": 1,
    "fullName": "Nguyen Van A",
    "email": "user@gmail.com",
    "role": "USER",
    "status": "ACTIVE"
  }
}
```

### Error Response - Unauthorized

```json
{
  "success": false,
  "message": "Unauthorized",
  "data": null
}
```

---

## 2.6. Logout API

## POST `/api/auth/logout`

Logs out the user by clearing the session and invalidating the `accessToken` cookie.

### Request Headers

- Cookie: `accessToken=jwt-token-value-here`

### Success Response Headers

```http
Set-Cookie: accessToken=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict; Secure
```

### Success Response Body

```json
{
  "success": true,
  "message": "Logout successfully",
  "data": null
}
```

---

## Authentication Integration Rules (XSS/CSRF Prevention)

- **HttpOnly Cookie**: The JWT token MUST be stored in a cookie named `accessToken`. It MUST be configured as `HttpOnly`, preventing client-side scripts from reading the token (mitigating XSS).
- **LocalStorage & SessionStorage Prohibition**: Under no circumstances should the frontend store the authentication token in `localStorage`, `sessionStorage`, or custom JavaScript memory caches.
- **Credential Propagation**: The frontend must send all fetch requests to protected backend APIs with the option `credentials: "include"` (or configure Axios / XMLHttpRequest to send credentials/cookies).
- **SameSite Config**: The cookie MUST carry `SameSite=Strict` to defend against Cross-Site Request Forgery (CSRF).

---

# 3. Document Upload APIs

These APIs support Step 2: authenticated users upload study documents to Cloudinary Storage while document metadata is saved in MySQL.

## 3.1. Upload Document API

## POST `/api/documents/upload`

Uploads a document file for the currently authenticated user.

### Headers

```text
Authorization: Bearer sample-token
```
*(Note: Do not manually set `Content-Type` header when sending `FormData` in JavaScript; let the browser automatically generate the header with boundary.)*

### Form Data (FormData)

| Field         | Type    | Required | Description                                                            |
| :------------ | :------ | :------- | :--------------------------------------------------------------------- |
| `file`        | File    | Yes      | Uploaded study document                                                |
| `title`       | String  | Yes      | User-facing document title                                             |
| `description` | String  | No       | Optional document description                                          |
| `subjectId`   | Integer | No       | Optional Subject ID to assign to the document (added in Step 3)        |
| `folderId`    | Integer | No       | Optional Folder ID to assign to the document (added in Step 5)         |

### Backend & Frontend Integration Rules

- **Owner Resolution**: The backend must resolve the owner from the JWT token / security session. The frontend must **not** send `ownerId` or `userId`.
- **Content-Type Header**: The frontend must send upload data with `FormData` and must **not** manually set `Content-Type` headers in JavaScript (allowing the browser to calculate the multipart boundary).
- **Validation**: The backend must validate the file type and file size before uploading to Cloudinary.
- **Allowed File Types**: `pdf`, `doc`, `docx`, `ppt`, `pptx`, `xls`, `xlsx`, `txt`, `jpg`, `jpeg`, `png` (case-insensitive).
- **Maximum File Size**: **10MB** (10,485,760 bytes).
- **Storage Target**: The real file is stored in Cloudinary Storage.
- **Metadata Storage**: MySQL stores document metadata only.
- **Secrets Management**: Under NO circumstances should any Cloudinary API Key, Secret, or credentials be pushed to Git or exposed to the frontend.
- **Subject & Folder Integration (Step 5)**: Any API that returns document data (upload, get my documents, get detail, update) must include the following subject and folder DTO fields in `data`:
  - `subjectId` (Integer, nullable)
  - `subjectCode` (String, nullable)
  - `subjectName` (String, nullable)
  - `folderId` (Integer, nullable)
  - `folderName` (String, nullable)
- **HTTP Status Codes (Step 3)**: Backend must use precise RESTful HTTP status codes:
  - `200 OK` for successful actions.
  - `400 Bad Request` for validation failures (e.g. missing title).
  - `401 Unauthorized` for missing/expired token.
  - `403 Forbidden` for ownership violations (user attempting to read/write another user's document).
  - `404 Not Found` for non-existent or soft-deleted documents.
  - Controller endpoints must NOT catch all exceptions and simplify them into a generic `400 Bad Request` (`ResponseEntity.badRequest()`).

### Success Response

```json
{
  "success": true,
  "message": "Document uploaded successfully",
  "data": {
    "documentId": 1,
    "title": "SWR Lecture 1",
    "description": "Week 1 lecture note",
    "originalFileName": "swr-lecture-1.pdf",
    "fileType": "PDF",
    "fileSize": 102400,
    "fileUrl": "https://res.cloudinary.com/demo/raw/upload/v123456/ai-study-hub/documents/1/swr-lecture-1.pdf",
    "publicId": "ai-study-hub/documents/1/swr-lecture-1.pdf",
    "subjectId": 1,
    "subjectCode": "SWP391",
    "subjectName": "Software Project",
    "folderId": null,
    "folderName": null,
    "uploadedBy": "user@gmail.com",
    "createdAt": "2026-06-01T10:00:00"
  }
}
```

### Error Response - Unauthorized (401)

```json
{
  "success": false,
  "message": "Your session has expired. Please log in again.",
  "data": null
}
```

### Error Response - Missing File (400)

```json
{
  "success": false,
  "message": "File is required",
  "data": null
}
```

### Error Response - Missing Title (400)

```json
{
  "success": false,
  "message": "Title is required",
  "data": null
}
```

### Error Response - Invalid File Type (400)

```json
{
  "success": false,
  "message": "Invalid file type",
  "data": null
}
```

### Error Response - File Too Large (400)

```json
{
  "success": false,
  "message": "File size exceeds 10MB",
  "data": null
}
```

### Error Response - Cloudinary Upload Failed (500)

```json
{
  "success": false,
  "message": "Cloudinary upload failed: [details]",
  "data": null
}
```

### Error Response - Subject Not Found (404)

If `subjectId` is provided but does not exist in the database or is inactive:

```json
{
  "success": false,
  "message": "Subject not found",
  "data": null
}
```

### Error Response - Folder Not Found (404)

If `folderId` is provided but does not exist in the database or has been soft-deleted:

```json
{
  "success": false,
  "message": "Folder not found",
  "data": null
}
```

### Error Response - Folder Access Denied (403)

If `folderId` is provided but belongs to another user:

```json
{
  "success": false,
  "message": "Access denied",
  "data": null
}
```

---

## 3.2. Get My Documents API

## GET `/api/documents/my`

Returns documents owned by the currently authenticated user, with optional search and filter parameters. Only documents with `status = 'ACTIVE'` are returned.

### Headers

```text
Authorization: Bearer sample-token
```

### Query Parameters

| Parameter   | Type    | Required | Description                                                            |
| :---------- | :------ | :------- | :--------------------------------------------------------------------- |
| `keyword`   | String  | No       | Filter by title or originalFileName (case-insensitive substring match) |
| `subjectId` | Integer | No       | Filter by subject ID                                                   |
| `fileType`  | String  | No       | Filter by file extension type (e.g., PDF, DOCX)                        |
| `folderId`  | Integer | No       | Filter by folder ID (optional)                                         |

### Success Response

```json
{
  "success": true,
  "message": "Documents retrieved successfully",
  "data": [
    {
      "documentId": 1,
      "title": "SWR Lecture 1",
      "description": "Week 1 lecture note",
      "originalFileName": "swr-lecture-1.pdf",
      "fileType": "PDF",
      "fileSize": 102400,
      "fileUrl": "https://res.cloudinary.com/demo/raw/upload/v123456/ai-study-hub/documents/1/swr-lecture-1.pdf",
      "publicId": "ai-study-hub/documents/1/swr-lecture-1.pdf",
      "subjectId": 1,
      "subjectCode": "SWP391",
      "subjectName": "Software Project",
      "folderId": 1,
      "folderName": "Math Notes",
      "uploadedBy": "user@gmail.com",
      "createdAt": "2026-06-01T10:00:00"
    }
  ]
}
```

### Success Response - Empty List

```json
{
  "success": true,
  "message": "Documents retrieved successfully",
  "data": []
}
```

### Error Response - Unauthorized (401)

```json
{
  "success": false,
  "message": "Your session has expired. Please log in again.",
  "data": null
}
```

---

# 4. Subject Management APIs (Step 3)

These APIs support retrieving subject master data.

## 4.1. Get All Subjects API

## GET `/api/subjects`

Returns all active subjects.

### Headers

```text
Authorization: Bearer sample-token
```

### Success Response

```json
{
  "success": true,
  "message": "Subjects retrieved successfully",
  "data": [
    {
      "subjectId": 1,
      "subjectCode": "SWP391",
      "subjectName": "Software Project",
      "description": "Software project management and development course"
    },
    {
      "subjectId": 2,
      "subjectCode": "SWT301",
      "subjectName": "Software Testing",
      "description": "Software verification and testing course"
    }
  ]
}
```

### Error Response - Unauthorized (401)

```json
{
  "success": false,
  "message": "Your session has expired. Please log in again.",
  "data": null
}
```

---

# 5. Document Management APIs (Step 3)

These APIs manage documents after upload. Access is strictly restricted to the owner of the document.

## 5.1. Get Document Detail API

## GET `/api/documents/{id}`

Returns detailed information for a specific document owned by the authenticated user.

### Headers

```text
Authorization: Bearer sample-token
```

### Success Response

```json
{
  "success": true,
  "message": "Document retrieved successfully",
  "data": {
    "documentId": 1,
    "title": "SWR Lecture 1",
    "description": "Week 1 lecture note",
    "originalFileName": "swr-lecture-1.pdf",
    "fileType": "PDF",
    "fileSize": 102400,
    "fileUrl": "https://res.cloudinary.com/demo/raw/upload/v123456/ai-study-hub/documents/1/swr-lecture-1.pdf",
    "publicId": "ai-study-hub/documents/1/swr-lecture-1.pdf",
    "subjectId": 1,
    "subjectCode": "SWP391",
    "subjectName": "Software Project",
    "folderId": 1,
    "folderName": "Math Notes",
    "uploadedBy": "user@gmail.com",
    "createdAt": "2026-06-01T10:00:00"
  }
}
```

### Error Response - Unauthorized (401)

```json
{
  "success": false,
  "message": "Your session has expired. Please log in again.",
  "data": null
}
```

### Error Response - Forbidden (403)

If the document exists but belongs to another user:

```json
{
  "success": false,
  "message": "Access denied",
  "data": null
}
```

### Error Response - Not Found (404)

If the document does not exist or has been soft-deleted:

```json
{
  "success": false,
  "message": "Document not found",
  "data": null
}
```

---

## 5.2. Update Document Metadata API

## PUT `/api/documents/{id}`

Updates the title, description, and subject of a specific document owned by the authenticated user.

### Headers

```text
Authorization: Bearer sample-token
```

### Request Body

```json
{
  "title": "New Document Title",
  "description": "Updated document description",
  "subjectId": 2
}
```

### Success Response

```json
{
  "success": true,
  "message": "Document updated successfully",
  "data": {
    "documentId": 1,
    "title": "New Document Title",
    "description": "Updated document description",
    "originalFileName": "swr-lecture-1.pdf",
    "fileType": "PDF",
    "fileSize": 102400,
    "fileUrl": "https://res.cloudinary.com/demo/raw/upload/v123456/ai-study-hub/documents/1/swr-lecture-1.pdf",
    "publicId": "ai-study-hub/documents/1/swr-lecture-1.pdf",
    "subjectId": 2,
    "subjectCode": "SWT301",
    "subjectName": "Software Testing",
    "folderId": null,
    "folderName": null,
    "uploadedBy": "user@gmail.com",
    "createdAt": "2026-06-01T10:00:00"
  }
}
```

### Error Response - Validation Failed (400)

```json
{
  "success": false,
  "message": "Title is required",
  "data": null
}
```

### Error Response - Forbidden (403)

```json
{
  "success": false,
  "message": "Access denied",
  "data": null
}
```

### Error Response - Not Found (404)

```json
{
  "success": false,
  "message": "Document not found",
  "data": null
}
```

### Error Response - Subject Not Found (404)

If `subjectId` is provided but does not exist in the database or is inactive:

```json
{
  "success": false,
  "message": "Subject not found",
  "data": null
}
```

---

## 5.3. Delete Document API

## DELETE `/api/documents/{id}`

Soft-deletes a specific document owned by the authenticated user.

### Headers

```text
Authorization: Bearer sample-token
```

### Success Response

```json
{
  "success": true,
  "message": "Document deleted successfully",
  "data": null
}
```

### Error Response - Forbidden (403)

```json
{
  "success": false,
  "message": "Access denied",
  "data": null
}
```

### Error Response - Not Found (404)

```json
{
  "success": false,
  "message": "Document not found",
  "data": null
}
```

---

# 6. Folder Management APIs (Step 5)

These APIs manage user-defined folders for document organization. Access is restricted to the folder owner.

> [!NOTE]
> All Step 5 APIs (Folders and Trash/Restore) require an `Authorization` header. A missing or expired token returns `401 Unauthorized` with the message: `"Your session has expired. Please log in again."`.

## 6.1. Create Folder API

## POST `/api/folders`

Creates a new folder for the currently authenticated user.

### Headers

```text
Authorization: Bearer sample-token
Content-Type: application/json
```

### Request Body

```json
{
  "name": "Math Notes"
}
```

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Folder created successfully",
  "data": {
    "folderId": 1,
    "name": "Math Notes",
    "status": "ACTIVE",
    "createdAt": "2026-06-10T10:00:00"
  }
}
```

### Error Response - Validation Failed (400)

```json
{
  "success": false,
  "message": "Folder name is required",
  "data": null
}
```

### Error Response - Duplicate Name (400)

If the user already has an active folder with the same name:

```json
{
  "success": false,
  "message": "Folder name already exists",
  "data": null
}
```

### Error Response - Unauthorized (401)

```json
{
  "success": false,
  "message": "Your session has expired. Please log in again.",
  "data": null
}
```

---

## 6.2. Get My Folders API

## GET `/api/folders/my`

Retrieves all active folders owned by the currently authenticated user. Only folders with `status = 'ACTIVE'` are returned.

### Headers

```text
Authorization: Bearer sample-token
```

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Folders retrieved successfully",
  "data": [
    {
      "folderId": 1,
      "name": "Math Notes",
      "status": "ACTIVE",
      "createdAt": "2026-06-10T10:00:00"
    }
  ]
}
```

---

## 6.3. Get Folder Detail API

## GET `/api/folders/{id}`

Retrieves details of a specific folder owned by the authenticated user. Only folders with `status = 'ACTIVE'` can be retrieved.

### Headers

```text
Authorization: Bearer sample-token
```

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Folder retrieved successfully",
  "data": {
    "folderId": 1,
    "name": "Math Notes",
    "status": "ACTIVE",
    "createdAt": "2026-06-10T10:00:00"
  }
}
```

### Error Response - Forbidden (403)

If the folder belongs to another user:

```json
{
  "success": false,
  "message": "Access denied",
  "data": null
}
```

### Error Response - Not Found (404)

If the folder does not exist or has been soft-deleted:

```json
{
  "success": false,
  "message": "Folder not found",
  "data": null
}
```

---

## 6.4. Update Folder API

## PUT `/api/folders/{id}`

Updates the name of a specific folder owned by the authenticated user.

### Headers

```text
Authorization: Bearer sample-token
Content-Type: application/json
```

### Request Body

```json
{
  "name": "Calculus Notes"
}
```

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Folder updated successfully",
  "data": {
    "folderId": 1,
    "name": "Calculus Notes",
    "status": "ACTIVE",
    "createdAt": "2026-06-10T10:00:00"
  }
}
```

### Error Response - Validation Failed (400)

```json
{
  "success": false,
  "message": "Folder name is required",
  "data": null
}
```

### Error Response - Duplicate Name (400)

If the user already has an active folder with the new name:

```json
{
  "success": false,
  "message": "Folder name already exists",
  "data": null
}
```

### Error Response - Forbidden (403)

If the folder belongs to another user:

```json
{
  "success": false,
  "message": "Access denied",
  "data": null
}
```

### Error Response - Not Found (404)

If the folder does not exist or has been soft-deleted:

```json
{
  "success": false,
  "message": "Folder not found",
  "data": null
}
```

---

## 6.5. Delete Folder (Soft-delete) API

## DELETE `/api/folders/{id}`

Soft-deletes a folder owned by the authenticated user. This changes its `status` to `'DELETED'` in MySQL and records `deletedAt`. All active documents inside this folder are automatically soft-deleted with the same timestamp.

### Headers

```text
Authorization: Bearer sample-token
```

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Folder and its contents deleted successfully",
  "data": null
}
```

### Error Response - Forbidden (403)

```json
{
  "success": false,
  "message": "Access denied",
  "data": null
}
```

### Error Response - Not Found (404)

```json
{
  "success": false,
  "message": "Folder not found",
  "data": null
}
```

---

## 6.6. Move Document to Folder API

## PUT `/api/documents/{id}/move`

Moves a document to a specified folder. Both the document and the target folder must be owned by the authenticated user.

### Headers

```text
Authorization: Bearer sample-token
Content-Type: application/json
```

### Request Body

```json
{
  "folderId": 2
}
```
*(Note: To move a document out of all folders back to the root, pass `"folderId": null`)*

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Document moved successfully",
  "data": {
    "documentId": 1,
    "title": "SWR Lecture 1",
    "folderId": 2,
    "folderName": "Calculus Notes"
  }
}
```

### Error Response - Forbidden (403)

If either the document or the target folder is owned by another user:

```json
{
  "success": false,
  "message": "Access denied",
  "data": null
}
```

### Error Response - Not Found (404)

If the document or folder does not exist or is soft-deleted:

```json
{
  "success": false,
  "message": "Document or folder not found",
  "data": null
}
```

---

# 7. Trash & Restore APIs (Step 5)

These APIs manage soft-deleted documents and folders.

## 7.1. Get Trash API

## GET `/api/trash`

Retrieves all soft-deleted folders and documents owned by the currently authenticated user (`status = 'DELETED'`).

### Headers

```text
Authorization: Bearer sample-token
```

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Trash items retrieved successfully",
  "data": {
    "folders": [
      {
        "folderId": 1,
        "name": "Math Notes",
        "deletedAt": "2026-06-10T10:05:00"
      }
    ],
    "documents": [
      {
        "documentId": 2,
        "title": "SWR Lecture 2",
        "originalFileName": "swr-lecture-2.pdf",
        "fileType": "PDF",
        "fileSize": 150000,
        "deletedAt": "2026-06-10T10:05:00",
        "folderId": 1
      }
    ]
  }
}
```

---

## 7.2. Restore Folder API

## POST `/api/trash/folders/{id}/restore`

Restores a soft-deleted folder. This sets the folder's `status` back to `'ACTIVE'` and resets `deletedAt` to `null`. All documents inside this folder that were soft-deleted as part of the folder deletion (sharing the same `deletedAt` timestamp) are also restored to `'ACTIVE'`.

### Headers

```text
Authorization: Bearer sample-token
```

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Folder and its documents restored successfully",
  "data": null
}
```

### Error Response - Forbidden (403)

```json
{
  "success": false,
  "message": "Access denied",
  "data": null
}
```

### Error Response - Not Found (404)

If the folder does not exist or is not in the trash:

```json
{
  "success": false,
  "message": "Folder not found in trash",
  "data": null
}
```

---

## 7.3. Restore Document API

## POST `/api/trash/documents/{id}/restore`

Restores a soft-deleted document. This sets the document's `status` back to `'ACTIVE'` and resets `deletedAt` to `null`.
*(Note: If the document belonged to a folder that has since been permanently deleted, the document is restored to the root/unassigned level. If the folder is still in the trash, the document is restored to the root unless the folder itself is restored.)*

### Headers

```text
Authorization: Bearer sample-token
```

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Document restored successfully",
  "data": null
}
```

### Error Response - Forbidden (403)

```json
{
  "success": false,
  "message": "Access denied",
  "data": null
}
```

### Error Response - Not Found (404)

If the document does not exist or is not in the trash:

```json
{
  "success": false,
  "message": "Document not found in trash",
  "data": null
}
```

---

## 7.4. Permanent Delete Folder API

## DELETE `/api/trash/folders/{id}`

Permanently deletes a folder from the database. All documents contained within this folder (whether in active or deleted status) are also permanently deleted from the database, and their physical files are deleted from Cloudinary.

### Headers

```text
Authorization: Bearer sample-token
```

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Folder and its documents permanently deleted",
  "data": null
}
```

### Error Response - Forbidden (403)

```json
{
  "success": false,
  "message": "Access denied",
  "data": null
}
```

### Error Response - Not Found (404)

```json
{
  "success": false,
  "message": "Folder not found in trash",
  "data": null
}
```

---

## 7.5. Permanent Delete Document API

## DELETE `/api/trash/documents/{id}`

Permanently deletes a document from the database and removes the associated file from Cloudinary Storage using its `publicId`.

### Headers

```text
Authorization: Bearer sample-token
```

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Document permanently deleted",
  "data": null
}
```

### Error Response - Forbidden (403)

```json
{
  "success": false,
  "message": "Access denied",
  "data": null
}
```

### Error Response - Not Found (404)

```json
{
  "success": false,
  "message": "Document not found in trash",
  "data": null
}
```
