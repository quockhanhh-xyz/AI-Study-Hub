# API Contract - AI Study Hub

> [!IMPORTANT]
> This is the target authentication contract for the upcoming security implementation. Currently, the active code operates using local storage and Bearer headers, but all endpoints documented below have been updated to reflect the final target architecture employing HttpOnly Cookies.

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

### HTTP Status Code Conventions

The backend APIs follow RESTful HTTP status code conventions:
- **`200 OK`**: The request succeeded, and the response data contains the result of the operation.
- **`400 Bad Request`**: Validation failures, malformed syntax, or business logic violations (e.g., self-sharing a document, or attempting to leave a group as the OWNER).
- **`401 Unauthorized`**: Authentication is required or the session/accessToken cookie has expired.
- **`403 Forbidden`**: Access is denied. The authenticated user does not have permission to view, edit, delete, or modify the resource (e.g., accessing a folder or document not owned by or shared with the user, or group standard members attempting to revoke another member's document share).
- **`404 Not Found`**: The requested resource (user, document, folder, or study group) does not exist or has been soft-deleted (`status = 'DELETED'`).
- **`409 Conflict`**: State conflict. Typically returned when trying to create a duplicate active share record (e.g., sharing a document/folder with a user or group that already has an ACTIVE share).
- **`500 Internal Server Error`**: An unexpected error occurred on the server (e.g., Cloudinary API issues, database connection errors).

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

### Request Headers

- Cookie: `accessToken=jwt-token-value-here`
*(Note: Do not manually set `Content-Type` header when sending `FormData` in JavaScript; let the browser automatically generate the header with boundary.)*

### Form Data (FormData)

| Field         | Type    | Required | Description                                                            |
| :------------ | :------ | :------- | :--------------------------------------------------------------------- |
| `file`        | File    | Yes      | Uploaded study document                                                |
| `title`       | String  | Yes      | User-facing document title                                             |
| `description` | String  | No       | Optional document description                                          |
| `subjectId`   | Integer | Yes      | Required Subject ID to assign to the document. Must be either a SYSTEM subject or a USER_CUSTOM subject owned by the current user (see Section 4). |
| `folderId`    | Integer | No       | Optional Folder ID to assign to the document. If null or empty, defaults to the top-level My Documents area. |

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
- **Subject Ownership (Step 6D)**: The backend must reject `subjectId` values pointing to a `USER_CUSTOM` subject owned by a different user, returning `403 Forbidden`. The same ownership rule applies when changing `subjectId` via `PUT /api/documents/{id}` (update). `SYSTEM` subjects (`scope = SYSTEM`) may always be used by any authenticated user.
- **Duplicate File Check**: Prior to initiating the upload to Cloudinary, the backend must query the MySQL database to check if a duplicate document already exists. A duplicate is identified if an existing document shares the same `owner_id` (current user), `folder_id` (nullable, where null represents the top-level My Documents area), `originalFileName` (file name), and `fileSize` (in bytes), with `status = 'ACTIVE'`. If a duplicate is found, the backend aborts the process (no Cloudinary file upload occurs) and returns `409 Conflict`.
- **HTTP Status Codes (Step 3)**: Backend must use precise RESTful HTTP status codes:
  - `200 OK` for successful actions.
  - `400 Bad Request` for validation failures (e.g. missing title).
  - `401 Unauthorized` for missing/expired token.
  - `403 Forbidden` for ownership violations (user attempting to read/write another user's document, or using another user's custom subject).
  - `404 Not Found` for non-existent or soft-deleted documents.
  - `409 Conflict` for duplicate file uploads.
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

### Error Response - Duplicate Document (409)

If a document with the same name and file size already exists in the same target folder (or root folder):

```json
{
  "success": false,
  "message": "A file with the same name and file size already exists in this folder.",
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

### Request Headers

- Cookie: `accessToken=jwt-token-value-here`

#### Query Parameters

| Parameter           | Type    | Required | Description                                                            |
| :------------------ | :------ | :------- | :--------------------------------------------------------------------- |
| `keyword`           | String  | No       | Filter by title or originalFileName (case-insensitive substring match) |
| `subjectId`         | Integer | No       | Filter by subject ID                                                   |
| `fileType`          | String  | No       | Filter by file extension type (e.g., PDF, DOCX)                        |
| `folderId`          | Integer | No       | Filter by folder ID. If omitted, returns all active documents of the current user. |
| `includeSubfolders` | Boolean | No       | If true, includes documents from subfolders of the folderId recursively. |

### Access & Query Rules

- **No folderId**: If `folderId` is omitted or empty, the backend returns all ACTIVE documents belonging to the authenticated user.
- **With folderId**: If `folderId` is provided, the backend returns only ACTIVE documents inside that specific folder.
- **With folderId & includeSubfolders=true**: If `folderId` is provided and `includeSubfolders` is set to `true`, the backend returns ACTIVE documents from that folder as well as all its subfolders recursively.

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

---

# 4. Subject Management APIs (Step 3 + Step 6D Custom Subjects)

These APIs support retrieving subject master data and creating user-owned custom subjects.

## 4.1. Get All Subjects API

## GET `/api/subjects`

Returns all active SYSTEM subjects plus the current user's own active USER_CUSTOM subjects. A user never sees another user's custom subjects.

### Request Headers

- Cookie: `accessToken=jwt-token-value-here`

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
      "description": "Software project management and development course",
      "scope": "SYSTEM",
      "ownerId": null
    },
    {
      "subjectId": 2,
      "subjectCode": "SWT301",
      "subjectName": "Software Testing",
      "description": "Software verification and testing course",
      "scope": "SYSTEM",
      "ownerId": null
    },
    {
      "subjectId": 10,
      "subjectCode": "MYSUB",
      "subjectName": "My Custom Subject",
      "description": null,
      "scope": "USER_CUSTOM",
      "ownerId": 4
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

## 4.2. Create Custom Subject API

## POST `/api/subjects/custom`

Creates a new subject owned by the current authenticated user. The subject is only visible to its owner and can be used by that owner when uploading or updating documents.

### Request Headers

- Cookie: `accessToken=jwt-token-value-here`

### Request Body

```json
{
  "subjectCode": "MYSUB",
  "subjectName": "My Custom Subject",
  "description": "Optional description"
}
```

| Field         | Type   | Required | Description                                          |
| :------------ | :----- | :------- | :---------------------------------------------------- |
| `subjectCode` | String | Yes      | Trimmed and uppercased by the backend before saving   |
| `subjectName` | String | Yes      | Trimmed by the backend before saving                  |
| `description` | String | No       | Trimmed by the backend before saving if provided       |

### Success Response (200)

```json
{
  "success": true,
  "message": "Custom subject created successfully",
  "data": {
    "subjectId": 10,
    "subjectCode": "MYSUB",
    "subjectName": "My Custom Subject",
    "description": "Optional description",
    "scope": "USER_CUSTOM",
    "ownerId": 4
  }
}
```

### Error Response - Validation Failed (400)

```json
{
  "success": false,
  "message": "Subject code is required",
  "data": null
}
```

### Error Response - Duplicate Subject (409)

Returned if `subjectCode` or `subjectName` already matches any SYSTEM subject, or matches an existing USER_CUSTOM subject owned by the current user.

```json
{
  "success": false,
  "message": "A subject with this code or name already exists",
  "data": null
}
```

---

# 5. Document Management APIs (Step 3)

These APIs manage documents after upload. Access is strictly restricted to the owner of the document.

## 5.1. Get Document Detail API

## GET `/api/documents/{id}`

Returns detailed information for a specific document. The request is authorized if:
- The authenticated user is the owner of the document.
- The document is actively shared directly with the authenticated user.
- The document is actively shared with a study group where the authenticated user is an active member.
- The document is located inside a folder tree that has been shared directly with the authenticated user, or shared with a study group where the authenticated user is an active member.

### Request Headers

- Cookie: `accessToken=jwt-token-value-here`

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
    "status": "ACTIVE",
    "createdAt": "2026-06-01T10:00:00",
    "canPreview": true,
    "canOpen": true,
    "canDownload": true,
    "canEdit": true,
    "canDelete": true,
    "canMove": true,
    "canShare": true
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

## GET `/api/documents/{id}/download`

Generates a secure download URL for the specified document and redirects (HTTP 302 Found) the requester to it. The request is authorized if:
- The authenticated user is the owner of the document.
- The document is actively shared directly with the authenticated user.
- The document is actively shared with a study group where the authenticated user is an active member.
- The document is located inside a folder tree that has been shared directly with the authenticated user, or shared with a study group where the authenticated user is an active member.

### Request Headers

- Cookie: `accessToken=jwt-token-value-here`

### Success Response

- Status: `302 Found`
- Headers:
  - `Location`: `https://res.cloudinary.com/demo/raw/upload/v123456/ai-study-hub/documents/1/swr-lecture-1.pdf`

### Error Response - Unauthorized (401)

```json
{
  "success": false,
  "message": "Your session has expired. Please log in again.",
  "data": null
}
```

### Error Response - Forbidden (403)

If the user is not authorized, or their share has been revoked:

```json
{
  "success": false,
  "message": "Access denied",
  "data": null
}
```

### Error Response - Not Found (404)

If the document does not exist or has been soft-deleted (status is `DELETED`):

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

### Request Headers

- Cookie: `accessToken=jwt-token-value-here`

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

### Request Headers

- Cookie: `accessToken=jwt-token-value-here`

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
> All Folder and Trash/Restore APIs require cookie-based authentication. A missing or expired accessToken cookie returns `401 Unauthorized` with the message: `"Your session has expired. Please log in again."`.

## 6.1. Create Folder API

## POST `/api/folders`

Creates a new folder for the currently authenticated user.

### Request Headers

- Cookie: `accessToken=jwt-token-value-here`
- Content-Type: `application/json`

### Request Body (Subfolder)

```json
{
  "folderName": "Week 1",
  "description": "Lecture documents",
  "parentFolderId": 1
}
```

### Request Body (Root Folder)

```json
{
  "folderName": "SWT301",
  "description": "Software Testing",
  "parentFolderId": null
}
```

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Folder created successfully",
  "data": {
    "folderId": 1,
    "folderName": "Week 1",
    "description": "Lecture documents",
    "parentFolderId": 1,
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

### Error Response - Duplicate Name (409 Conflict)

If the user already has an active folder with the same name under the same parent folder (or at root level):

```json
{
  "success": false,
  "message": "A folder with the same name already exists in this location.",
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

Retrieves active folders owned by the currently authenticated user. Only folders with `status = 'ACTIVE'` are returned.

### Request Headers

- Cookie: `accessToken=jwt-token-value-here`

### Query Parameters

| Parameter        | Type    | Required | Description                                                                                                                                                 |
| :--------------- | :------ | :------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `parentFolderId` | Integer | No       | If empty or not provided, returns folders at the root level (`parentFolderId = null`). If provided, returns the immediate subfolders of the given folder. |

### Access Rules

- Users can only view folders they own.
- If a user passes a `parentFolderId` belonging to another user, the backend must return `403 Forbidden` or `404 Not Found` (to avoid leaking existence).

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Folders retrieved successfully",
  "data": [
    {
      "folderId": 1,
      "folderName": "Math Notes",
      "description": "Calculus and Algebra notes",
      "parentFolderId": null,
      "fileCount": 5,
      "subfolderCount": 2,
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

*(Note: To construct the breadcrumb path on the frontend, the frontend can recursively fetch the folder details using `GET /api/folders/{id}` to traverse parent folders via `parentFolderId` until `parentFolderId` is `null` representing the root level.)*

### Request Headers

- Cookie: `accessToken=jwt-token-value-here`

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Folder retrieved successfully",
  "data": {
    "folderId": 1,
    "folderName": "Math Notes",
    "description": "Calculus and Algebra notes",
    "parentFolderId": null,
    "fileCount": 5,
    "subfolderCount": 2,
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

Updates the name and description of a specific folder owned by the authenticated user.

### Request Headers

- Cookie: `accessToken=jwt-token-value-here`
- Content-Type: `application/json`

### Request Body

```json
{
  "folderName": "Calculus Notes",
  "description": "Advanced Calculus notes"
}
```

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Folder updated successfully",
  "data": {
    "folderId": 1,
    "folderName": "Calculus Notes",
    "description": "Advanced Calculus notes",
    "parentFolderId": null,
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

### Error Response - Duplicate Name (409 Conflict)

If the user already has an active folder with the new name under the same parent folder (or at root level):

```json
{
  "success": false,
  "message": "A folder with the same name already exists in this location.",
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

Soft-deletes an empty folder owned by the authenticated user. This changes its `status` to `'DELETED'` in MySQL and records `deletedAt`. If the folder is not empty (i.e., contains active documents or active subfolders), the backend must reject the deletion request.

### Request Headers

- Cookie: `accessToken=jwt-token-value-here`

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Folder deleted successfully",
  "data": null
}
```

### Error Response - Folder Not Empty (400)

If the folder contains active documents or active subfolders:

```json
{
  "success": false,
  "message": "Folder must be empty before deleting.",
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

### Request Headers

- Cookie: `accessToken=jwt-token-value-here`
- Content-Type: `application/json`

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

### Request Headers

- Cookie: `accessToken=jwt-token-value-here`

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Trash items retrieved successfully",
  "data": {
    "folders": [
      {
        "folderId": 1,
        "folderName": "Math Notes",
        "description": "Calculus and Algebra notes",
        "parentFolderId": null,
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

Restores a soft-deleted empty folder. This sets the folder's `status` back to `'ACTIVE'` and resets `deletedAt` to `null`.

### Request Headers

- Cookie: `accessToken=jwt-token-value-here`

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Folder restored successfully",
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

### Request Headers

- Cookie: `accessToken=jwt-token-value-here`

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

Permanently deletes a soft-deleted empty folder from the database.

### Request Headers

- Cookie: `accessToken=jwt-token-value-here`

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Folder permanently deleted",
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

### Request Headers

- Cookie: `accessToken=jwt-token-value-here`

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

---

# 8. Study Group and Sharing APIs (Step 6A)

## 8.1. Create Group API
## POST `/api/groups`
Creates a new study group. The creator is automatically added as the `OWNER`.
- **Request Body**:
  ```json
  {
    "groupName": "Java Developers",
    "description": "Group for studying Java and Spring Boot"
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Study group created successfully",
    "data": {
      "groupId": 1,
      "groupName": "Java Developers",
      "description": "Group for studying Java and Spring Boot",
      "inviteCode": "A1B2C3D4",
      "ownerId": 5,
      "status": "ACTIVE",
      "createdAt": "2026-06-19T13:30:00"
    }
  }
  ```

## 8.2. Get My Groups API
## GET `/api/groups/my`
Retrieves all groups that the current user belongs to (either as OWNER or MEMBER).
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Groups retrieved successfully",
    "data": [
      {
        "groupId": 1,
        "groupName": "Java Developers",
        "description": "Group for studying Java and Spring Boot",
        "inviteCode": "A1B2C3D4",
        "ownerId": 5,
        "status": "ACTIVE",
        "role": "OWNER"
      }
    ]
  }
  ```

## 8.3. Get Group Detail API
## GET `/api/groups/{id}`
Retrieves detailed information of a group, including member list. Access is allowed only to active members of the group.
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Group details retrieved successfully",
    "data": {
      "groupId": 1,
      "groupName": "Java Developers",
      "description": "Group for studying Java and Spring Boot",
      "inviteCode": "A1B2C3D4",
      "ownerId": 5,
      "status": "ACTIVE",
      "members": [
        {
          "memberId": 1,
          "userId": 5,
          "email": "owner@gmail.com",
          "fullName": "Owner Name",
          "role": "OWNER",
          "status": "ACTIVE",
          "joinedAt": "2026-06-19T13:30:00"
        }
      ]
    }
  }
  ```

## 8.4. Join Group API
## POST `/api/groups/join`
Joins a group using an invite code.
- **Request Body**:
  ```json
  {
    "inviteCode": "A1B2C3D4"
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Joined group successfully",
    "data": {
      "groupId": 1,
      "groupName": "Java Developers",
      "role": "MEMBER"
    }
  }
  ```

## 8.5. Leave Group API
## POST `/api/groups/{id}/leave`
Leaves a group. Only group members can leave. Owners must delete the group instead.
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Left group successfully",
    "data": null
  }
  ```

## 8.6. Update Group API
## PUT `/api/groups/{id}`
Updates group name and description. Only the OWNER is allowed to perform this action.
- **Request Body**:
  ```json
  {
    "groupName": "Updated Name",
    "description": "Updated Description"
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Group updated successfully",
    "data": {
      "groupId": 1,
      "groupName": "Updated Name",
      "description": "Updated Description"
    }
  }
  ```

## 8.7. Delete Group API
## DELETE `/api/groups/{id}`
Soft deletes the group (status = DELETED). Only group OWNER is allowed.
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Group deleted successfully",
    "data": null
  }
  ```

## 8.8. Remove Member API
## DELETE `/api/groups/{id}/members/{userId}`
Removes a member from the group. Only group OWNER is allowed.
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Member removed successfully",
    "data": null
  }
  ```

## 8.9. Direct Share Document API
## POST `/api/documents/{id}/shares/users`
Shares a document directly to another user by email. Only the document owner can share it.
- **Request Body**:
  ```json
  {
    "email": "recipient@gmail.com"
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Document shared successfully",
    "data": {
      "shareId": 1,
      "documentId": 10,
      "sharedByEmail": "owner@gmail.com",
      "sharedWithEmail": "recipient@gmail.com",
      "permission": "VIEW",
      "status": "ACTIVE",
      "createdAt": "2026-06-19T13:40:00"
    }
  }
  ```

## 8.10. Shared With Me API
## GET `/api/documents/shared-with-me`
Retrieves all documents shared directly with the current user. Trashed or deleted documents are excluded.
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Shared documents retrieved successfully",
    "data": [
      {
        "shareId": 1,
        "documentId": 10,
        "title": "Introduction to AI",
        "fileType": "pdf",
        "fileSize": 1024,
        "fileUrl": "https://res.cloudinary.com/...",
        "sharedByEmail": "owner@gmail.com",
        "createdAt": "2026-06-19T13:40:00"
      }
    ]
  }
  ```

## 8.11. List Document Share Info API
## GET `/api/documents/{id}/shares`
Lists all active direct user shares and group shares of a document. Only the document owner can view this.
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Share records retrieved successfully",
    "data": {
      "userShares": [
        {
          "shareId": 1,
          "documentId": 10,
          "title": "Introduction to AI",
          "fileType": "pdf",
          "fileSize": 1024,
          "fileUrl": "https://res.cloudinary.com/...",
          "sharedByEmail": "owner@gmail.com",
          "sharedWithEmail": "recipient@gmail.com",
          "permission": "VIEW",
          "status": "ACTIVE",
          "createdAt": "2026-06-19T13:40:00"
        }
      ],
      "groupShares": [
        {
          "shareId": 1,
          "documentId": 10,
          "title": "Introduction to AI",
          "fileType": "pdf",
          "fileSize": 1024,
          "fileUrl": "https://res.cloudinary.com/...",
          "groupId": 1,
          "sharedByEmail": "owner@gmail.com",
          "permission": "VIEW",
          "status": "ACTIVE",
          "createdAt": "2026-06-19T13:45:00",
          "canRevoke": true
        }
      ]
    }
  }
  ```

## 8.12. Revoke Direct Share API
## DELETE `/api/document-shares/{shareId}`
Revokes a direct share (status = REVOKED). Only the document owner can perform this.
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Share revoked successfully",
    "data": null
  }
  ```

## 8.13. Share Document to Group API
## POST `/api/documents/{id}/shares/groups`
Shares a document into a study group. Only the document owner can share, and they must be an active member of the group.
- **Request Body**:
  ```json
  {
    "groupId": 1
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Document shared to group successfully",
    "data": {
      "shareId": 1,
      "documentId": 10,
      "groupId": 1,
      "sharedByEmail": "member@gmail.com",
      "permission": "VIEW",
      "status": "ACTIVE",
      "createdAt": "2026-06-19T13:45:00"
    }
  }
  ```

## 8.14. Get Group Documents API
## GET `/api/groups/{id}/documents`
Lists documents shared in a group. User must be an active member of the group. Trashed or deleted documents are excluded.
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Group documents retrieved successfully",
    "data": [
      {
        "shareId": 1,
        "documentId": 10,
        "title": "Introduction to AI",
        "fileType": "pdf",
        "fileSize": 1024,
        "fileUrl": "https://res.cloudinary.com/...",
        "groupId": 1,
        "sharedByEmail": "member@gmail.com",
        "permission": "VIEW",
        "status": "ACTIVE",
        "createdAt": "2026-06-19T13:45:00",
        "canRevoke": true
      }
    ]
  }
  ```

## 8.15. Revoke Group Share API
## DELETE `/api/group-document-shares/{shareId}`
Revokes a group document share (status = REVOKED). Document owner or Group Owner can revoke.
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Group share revoked successfully",
    "data": null
  }
  ```

## 8.16. Scope & Exclusions of Step 6A
- **Documents Only**: Direct sharing and the `Shared With Me` API only support sharing **Documents** in Step 6A. Folder sharing is completely out of scope and will be introduced in Step 6B.
- **Regenerate inviteCode**: Re-generating the unique invitation code for a group is not supported in Step 6A.
- **Transfer Group Owner**: Group ownership transfer is not supported. The group creator remains the OWNER permanently, unless the group is deleted.
- **Group Chat**: Communication features within groups are excluded.
- **Notifications**: Email or in-app notifications for sharing actions or group actions are excluded.
- **Public Links**: Shared links accessible by unauthenticated users are not supported. Only authenticated direct shares or group memberships can access shared documents.

## 8.17. Common Error Responses for Sharing & Groups

Below are typical error payloads returned by group management and sharing APIs:

### 400 Bad Request
- **Self-Sharing**: Attempting to share a document with oneself.
  ```json
  {
    "success": false,
    "message": "You cannot share a document with yourself",
    "data": null
  }
  ```
- **Owner Leaving Group**: Attempting to leave a group as the OWNER.
  ```json
  {
    "success": false,
    "message": "Group owner cannot leave the group. Please delete the group instead.",
    "data": null
  }
  ```

### 403 Forbidden
- **Unauthorized Share**: Sharing a document that is not owned by the current user.
  ```json
  {
    "success": false,
    "message": "Only the document owner can share this document",
    "data": null
  }
  ```
- **Non-member Access**: Tries to view detail/documents of a group without being an active member.
  ```json
  {
    "success": false,
    "message": "You must be an active member of this group to view group documents",
    "data": null
  }
  ```

### 404 Not Found
- **Document/Group Trashed or Deleted**: Referencing an item that does not exist or has `status = 'DELETED'`.
  ```json
  {
    "success": false,
    "message": "Document not found or in trash",
    "data": null
  }
  ```

### 409 Conflict
- **Duplicate Direct Share**: Share record already exists with status `ACTIVE`.
  ```json
  {
    "success": false,
    "message": "Document is already shared with this user",
    "data": null
  }
  ```
- **Duplicate Group Share**: Group document share record already exists with status `ACTIVE`.
  ```json
  {
    "success": false,
    "message": "Document is already shared in this group",
    "data": null
  }
  ```

---

# 9. Folder Sharing and Sharing UX Completion (Step 6B)

This section details the REST APIs introduced in Step 6B to enable Folder Sharing (direct and group) along with recursive access enforcement.

## 9.1. Direct Share Folder to User API

## POST `/api/folders/{id}/shares/users`

Shares a folder directly with another user using their email address.

### Request Headers
- Cookie: `accessToken=jwt-token-value-here`
- Content-Type: `application/json`

### Request Body
```json
{
  "email": "recipient@gmail.com"
}
```

### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Folder shared successfully",
  "data": {
    "shareId": 1,
    "folderId": 5,
    "folderName": "SWP391",
    "sharedWithEmail": "recipient@gmail.com",
    "permission": "VIEW",
    "status": "ACTIVE",
    "createdAt": "2026-06-21T14:50:00"
  }
}
```

### Error Response - Duplicate Share (409 Conflict)
If the folder is already actively shared with this user:
```json
{
  "success": false,
  "message": "Folder is already shared with this user",
  "data": null
}
```

---

## 9.2. Get Shared With Me Folders API

## GET `/api/folders/shared-with-me`

Retrieves the list of root folders that have been directly shared with the currently authenticated user. Does not return subfolders of shared trees.

### Request Headers
- Cookie: `accessToken=jwt-token-value-here`

### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Shared folders retrieved successfully",
  "data": [
    {
      "folderId": 5,
      "folderName": "SWP391",
      "description": "Software Project Materials",
      "ownerName": "User A",
      "ownerEmail": "usera@gmail.com",
      "sharedByName": "User A",
      "sharedByEmail": "usera@gmail.com",
      "permission": "VIEW",
      "status": "ACTIVE",
      "createdAt": "2026-06-21T14:50:00"
    }
  ]
}
```

---

## 9.3. List Folder Share Info API

## GET `/api/folders/{id}/shares`

Retrieves all direct and group shares associated with a folder. Only allowed for the folder owner.

### Request Headers
- Cookie: `accessToken=jwt-token-value-here`

### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Folder shares retrieved successfully",
  "data": {
    "userShares": [
      {
        "shareId": 1,
        "folderId": 5,
        "sharedWithEmail": "recipient@gmail.com",
        "permission": "VIEW",
        "status": "ACTIVE",
        "createdAt": "2026-06-21T14:50:00"
      }
    ],
    "groupShares": [
      {
        "shareId": 2,
        "folderId": 5,
        "groupId": 10,
        "groupName": "SWT301 Group",
        "permission": "VIEW",
        "status": "ACTIVE",
        "createdAt": "2026-06-21T14:55:00"
      }
    ]
  }
}
```

---

## 9.4. Revoke Direct Folder Share API

## DELETE `/api/folder-shares/{shareId}`

Revokes a direct folder sharing record by changing its status to `REVOKED`. Only allowed for the folder owner.

### Request Headers
- Cookie: `accessToken=jwt-token-value-here`

### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Folder share revoked successfully",
  "data": null
}
```

---

## 9.5. Share Folder to Group API

## POST `/api/folders/{id}/shares/groups`

Shares a folder to a study group. Only the folder owner, who must be an active member of the group, can perform this action.

### Request Headers
- Cookie: `accessToken=jwt-token-value-here`
- Content-Type: `application/json`

### Request Body
```json
{
  "groupId": 10
}
```

### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Folder shared to group successfully",
  "data": {
    "shareId": 2,
    "folderId": 5,
    "groupId": 10,
    "groupName": "SWT301 Group",
    "permission": "VIEW",
    "status": "ACTIVE",
    "createdAt": "2026-06-21T14:55:00"
  }
}
```

---

## 9.6. Get Group Folders API

## GET `/api/groups/{id}/folders`

Retrieves all root folders shared directly into a study group. Only accessible by active members of the group.

### Request Headers
- Cookie: `accessToken=jwt-token-value-here`

### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Group shared folders retrieved successfully",
  "data": [
    {
      "shareId": 2,
      "folderId": 5,
      "folderName": "SWP391",
      "description": "Software Project Materials",
      "ownerName": "User A",
      "ownerEmail": "usera@gmail.com",
      "sharedByName": "User A",
      "sharedByEmail": "usera@gmail.com",
      "permission": "VIEW",
      "status": "ACTIVE",
      "createdAt": "2026-06-21T14:55:00",
      "canRevoke": true
    }
  ]
}
```

---

## 9.7. Revoke Group Folder Share API

## DELETE `/api/group-folder-shares/{shareId}`

Revokes a group folder sharing record by changing its status to `REVOKED`. Allowed for the folder owner OR the group owner.

### Request Headers
- Cookie: `accessToken=jwt-token-value-here`

### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Group folder share revoked successfully",
  "data": null
}
```

---

## 9.8. Get Shared Folder Content API

## GET `/api/folders/{id}/shared-content`

Retrieves the direct subfolders and documents inside a shared folder that the current user has access to. Enforces recursive parent folder access rules, and returns breadcrumbs starting strictly from the shared root folder.

### Request Headers
- Cookie: `accessToken=jwt-token-value-here`

### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Shared folder content retrieved successfully",
  "data": {
    "breadcrumb": [
      {
        "folderId": 5,
        "folderName": "SWP391"
      },
      {
        "folderId": 6,
        "folderName": "Lab"
      }
    ],
    "currentFolder": {
      "folderId": 6,
      "folderName": "Lab",
      "ownerName": "User A",
      "ownerEmail": "usera@gmail.com"
    },
    "subfolders": [
      {
        "folderId": 7,
        "folderName": "Week 1",
        "description": "Week 1 materials",
        "fileCount": 1,
        "subfolderCount": 0
      }
    ],
    "documents": [
      {
        "documentId": 12,
        "title": "lab-guidelines.pdf",
        "description": "Lab description and rules",
        "fileType": "pdf",
        "fileSize": 102400,
        "fileUrl": "http://cloudinary.com/lab-guidelines.pdf",
        "folderId": 6,
        "folderName": "Lab",
        "uploadedBy": "usera@gmail.com",
        "status": "ACTIVE",
        "createdAt": "2026-06-21T15:00:00"
      }
    ],
    "permission": "VIEW",
    "isSharedView": true,
    "canUpload": false,
    "canEdit": false,
    "canDelete": false,
    "canMove": false
  }
}
```

### Error Response - Access Denied (403 Forbidden)
If the user does not have access to this folder or any of its ancestors:
```json
{
  "success": false,
  "message": "Access denied",
  "data": null
}
```

---

# 10. Frontend-Backend Integration Conventions

These rules govern page routing on the frontend and operational behaviors between the client and API:

## 10.1. Folder Page URL Format

- The frontend must route users using the folder ID query parameter exclusively:
  `folders.html?folderId=<id>`
- The parameter `parentFolderId` must **never** be used in browser URLs to represent folder details. It is reserved solely as a query parameter for backend REST API calls.

## 10.2. Trash Protection Rules

- Any folder or document that has been soft-deleted (`status = 'DELETED'`) is considered in the trash.
- Under no circumstances should the frontend or backend allow a user to **view/open** the contents, details, or **download** the actual file of a trashed item until it has been explicitly restored.
- The UI must hide any "Open File", "View Details", or similar download buttons for items shown in the trash list, and the backend must deny access to fetch details or retrieve the file URL for trashed assets.

## 10.3. Root Folder Terminology

- On the user interface, a `folderId = null` or unassigned folder hierarchy must be consistently labeled **"My Documents"**.
- Hardcoded technical terms like "root", "no folder", or "unassigned" are deprecated and must not appear in user-facing labels.

---

# 11. Sharing Permission Rules (Direct, Group, Folder, Trash, Member Removal)

To ensure secure data isolation and access control, the following permission rules must be strictly enforced on both frontend and backend:

## 11.1. Direct Document & Folder Sharing Rules
- **Sharing Action**: Only the owner of the document or folder is permitted to share it directly with another user by email.
- **Recipient Verification**: The recipient user must exist in the database and have an `ACTIVE` status.
- **Self-Sharing Restriction**: Users cannot share a document or folder with themselves (`400 Bad Request`).
- **Duplicate Prevention**: Attempting to share a document or folder that is already actively shared with the target user is blocked (`409 Conflict`). If a previous share record exists but has a `REVOKED` status, the backend must reactivate it (update status to `ACTIVE`) instead of inserting a new row.

## 11.2. Group Document & Folder Sharing Rules
- **Sharing Action**: Only the owner of the document or folder is permitted to share it into a study group.
- **Membership Requirement**: The owner of the document/folder must be an active member (`OWNER` or `MEMBER` with `status = 'ACTIVE'`) of the target group.
- **Group Verification**: The target study group must exist and be active (`status = 'ACTIVE'`).
- **Duplicate Prevention**: Attempting to share a document or folder that is already actively shared in the group is blocked (`409 Conflict`). If a previous group share record exists as `REVOKED`, it will be updated to `ACTIVE` upon re-sharing.

## 11.3. Document & Folder Access Rules
- A user is authorized to view or download a document or view a folder's contents if any of the following conditions are met:
  1. The user is the owner of the document or folder.
  2. The document/folder has an active direct share to this user.
  3. The document/folder is shared actively with a study group in which the user is an active member.
  4. (For documents/subfolders) The item is located within a folder tree where an ancestor folder satisfies condition 2 or 3.
- If none of these conditions are met, the request must fail with `403 Forbidden` ("Access denied").
- **Read-Only Access**: Users with shared access (direct, group, or inherited through folders) are restricted to read-only actions (open, download, view content). They are blocked from editing metadata, moving, deleting, or permanently deleting the shared resources. Any such requests return `403 Forbidden`.

## 11.4. Revocation Rules
- **Direct Shares**: A direct share record (for a document or folder) can only be revoked by the owner of that resource.
- **Group Shares**: A group share record can be revoked by either the owner of the shared resource OR the owner of the study group. Standard group members cannot revoke shares created by other group members.
- **Action**: Revoking changes the sharing record status from `ACTIVE` to `REVOKED`. The recipient immediately loses access.

## 11.5. Trash, Restore, and Move Impact
- **Trash Exclusion**: Any document or folder that is soft-deleted (`status = 'DELETED'`) is considered in the trash. Trashed items are immediately excluded from all shared listings, including the "Shared With Me" list, group details, and group shared documents/folders list.
- **No Access in Trash**: Access to get detail, open, or download a trashed item is denied (`404 Not Found`) until it is explicitly restored.
- **Restoration**: Restoring an item returns its status to `ACTIVE`. If there are active sharing records associated with the item, it automatically reappears in shared listings.
- **Move Impact**: Moving a document out of a shared folder tree immediately revokes the inherited permissions. If the document has no direct share or group share, users who previously had access via the shared folder tree will lose access to it immediately.

## 11.6. Group Member Removal/Leaving Impact
- **Membership Loss**: A user who leaves a group (`status = 'LEFT'`) or is removed by the group owner (`status = 'REMOVED'`) immediately loses access to all documents and folders shared within that group.
- **Share Revocation**: All active group document shares and group folder shares created by that user inside that specific group must be automatically set to `REVOKED`. This ensures that they cannot continue to share materials into a group they are no longer a part of.
- **Non-Interference**: Documents or folders shared into the group by other active members are unaffected and remain active.
