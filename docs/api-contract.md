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

Logs in a user account. Only users with status `ACTIVE` can log in.

### Request Body

```json
{
  "email": "user@gmail.com",
  "password": "12345678"
}
```

### Success Response

```json
{
  "success": true,
  "message": "Login successfully",
  "data": {
    "userId": 1,
    "fullName": "Nguyen Van A",
    "email": "user@gmail.com",
    "role": "USER",
    "status": "ACTIVE",
    "token": "sample-token"
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

Returns the current logged-in user's information.

### Headers

```text
Authorization: Bearer sample-token
```

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

### Backend & Frontend Integration Rules

- **Owner Resolution**: The backend must resolve the owner from the JWT token / security session. The frontend must **not** send `ownerId` or `userId`.
- **Content-Type Header**: The frontend must send upload data with `FormData` and must **not** manually set `Content-Type` headers in JavaScript (allowing the browser to calculate the multipart boundary).
- **Validation**: The backend must validate the file type and file size before uploading to Cloudinary.
- **Allowed File Types**: `pdf`, `doc`, `docx`, `ppt`, `pptx`, `xls`, `xlsx`, `txt`, `jpg`, `jpeg`, `png` (case-insensitive).
- **Maximum File Size**: **10MB** (10,485,760 bytes).
- **Storage Target**: The real file is stored in Cloudinary Storage.
- **Metadata Storage**: MySQL stores document metadata only.
- **Secrets Management**: Under NO circumstances should any Cloudinary API Key, Secret, or credentials be pushed to Git or exposed to the frontend.
- **Subject Code & Name Integration (Step 3)**: Any API that returns document data (upload, get my documents, get detail, update) must include the following subject DTO fields in `data`:
  - `subjectId` (Integer, nullable)
  - `subjectCode` (String, nullable)
  - `subjectName` (String, nullable)
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
    "uploadedBy": "user@gmail.com",
    "createdAt": "2026-06-01T10:00:00"
  }
}
```

### Error Response - Unauthorized (401)

```json
{
  "success": false,
  "message": "Tài khoản chưa đăng nhập hoặc phiên làm việc đã hết hạn!",
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
  "message": "Tài khoản chưa đăng nhập hoặc phiên làm việc đã hết hạn!",
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
  "message": "Tài khoản chưa đăng nhập hoặc phiên làm việc đã hết hạn!",
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
    "uploadedBy": "user@gmail.com",
    "createdAt": "2026-06-01T10:00:00"
  }
}
```

### Error Response - Unauthorized (401)

```json
{
  "success": false,
  "message": "Tài khoản chưa đăng nhập hoặc phiên làm việc đã hết hạn!",
  "data": null
}
```

### Error Response - Forbidden (403)

If the document exists but belongs to another user:

```json
{
  "success": false,
  "message": "Bạn không có quyền truy cập tài liệu này",
  "data": null
}
```

### Error Response - Not Found (404)

If the document does not exist or has been soft-deleted:

```json
{
  "success": false,
  "message": "Không tìm thấy tài liệu",
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
  "message": "Bạn không có quyền chỉnh sửa tài liệu này",
  "data": null
}
```

### Error Response - Not Found (404)

```json
{
  "success": false,
  "message": "Không tìm thấy tài liệu",
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
  "message": "Bạn không có quyền xóa tài liệu này",
  "data": null
}
```

### Error Response - Not Found (404)

```json
{
  "success": false,
  "message": "Không tìm thấy tài liệu",
  "data": null
}
```
