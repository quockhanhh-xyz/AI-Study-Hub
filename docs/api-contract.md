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

| Field         | Type   | Required | Description                         |
| :------------ | :----- | :------- | :---------------------------------- |
| `file`        | File   | Yes      | Uploaded study document             |
| `title`       | String | Yes      | User-facing document title          |
| `description` | String | No       | Optional document description       |

### Backend & Frontend Integration Rules

- **Owner Resolution**: The backend must resolve the owner from the JWT token / security session. The frontend must **not** send `ownerId` or `userId`.
- **Content-Type Header**: The frontend must send upload data with `FormData` and must **not** manually set `Content-Type` headers in JavaScript (allowing the browser to calculate the multipart boundary).
- **Validation**: The backend must validate the file type and file size before uploading to Cloudinary.
- **Allowed File Types**: `pdf`, `doc`, `docx`, `ppt`, `pptx`, `xls`, `xlsx`, `txt`, `jpg`, `jpeg`, `png` (case-insensitive).
- **Maximum File Size**: **10MB** (10,485,760 bytes).
- **Storage Target**: The real file is stored in Cloudinary Storage.
- **Metadata Storage**: MySQL stores document metadata only.
- **Secrets Management**: Under NO circumstances should any Cloudinary API Key, Secret, or credentials be pushed to Git or exposed to the frontend.

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
    "uploadedBy": "user@gmail.com",
    "createdAt": "2026-06-01T10:00:00"
  }
}
```

### Error Response - Unauthorized (401)

```json
{
  "success": false,
  "message": "Unauthorized",
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

---

## 3.2. Get My Documents API

## GET `/api/documents/my`

Returns documents owned by the currently authenticated user.

### Headers

```text
Authorization: Bearer sample-token
```

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
  "message": "Unauthorized",
  "data": null
}
```
