# Document Detail Access & Download Test Cases - Step 7 (BE3)

## Scope
Step 7 covers the security check for document details and secure file downloads.
It includes permission flags mapping in the GET details endpoint and verifying that users with revoked shares or files in the trash cannot view details or download.

In scope:
- `GET /api/documents/{id}` (Retrieves metadata with 7 permission flags)
- `GET /api/documents/{id}/download` (Secure file redirection download endpoint)
- Dynamic permission flags: `canPreview`, `canOpen`, `canDownload`, `canEdit`, `canDelete`, `canMove`, `canShare`.
- Restricting downloads on deleted, trash, and revoked shared documents.

Out of scope:
- Cloudinary storage CRUD operations on deletion.
- Frontend rendering of the download button logic (handled in FE).

---

## Common Preconditions
- Backend is running at `http://localhost:8080`.
- An authenticated user session is active (via secure HTTP-Only cookie `accessToken`).
- Test accounts:
  - Owner: `owner@test.com` (UserId: 1)
  - Authorized Share User: `shareuser@test.com` (UserId: 2)
  - Study Group Member: `groupmember@test.com` (UserId: 3)
  - Unauthorized User: `hacker@test.com` (UserId: 4)

---

## Document Access & Download Test Cases

### TC-DOC-PREV-001 - Owner Access Document Detail
**Precondition**:
- User is logged in as `owner@test.com`.
- Document (ID: 100) is owned by `owner@test.com` with status `ACTIVE`.

**Steps**:
1. Send `GET /api/documents/100`.

**Expected Result**:
- Response status is `200 OK`.
- Response contains `success=true`.
- Response `data` includes all details and the following permission flags:
  - `"canPreview": true`
  - `"canOpen": true`
  - `"canDownload": true`
  - `"canEdit": true`
  - `"canDelete": true`
  - `"canMove": true`
  - `"canShare": true`

**Status**: `Not Run`

---

### TC-DOC-PREV-002 - Directly Shared User Access Document Detail
**Precondition**:
- User is logged in as `shareuser@test.com`.
- Document (ID: 100) is owned by `owner@test.com` and has an `ACTIVE` share record with `shareuser@test.com`.

**Steps**:
1. Send `GET /api/documents/100`.

**Expected Result**:
- Response status is `200 OK`.
- Response contains `success=true`.
- Response `data` includes all details and the following permission flags:
  - `"canPreview": true`
  - `"canOpen": true`
  - `"canDownload": true`
  - `"canEdit": false`
  - `"canDelete": false`
  - `"canMove": false`
  - `"canShare": false`

**Status**: `Not Run`

---

### TC-DOC-PREV-003 - Group Shared User Access Document Detail
**Precondition**:
- User is logged in as `groupmember@test.com`.
- Document (ID: 100) is shared with a study group (ID: 10) in status `ACTIVE`.
- `groupmember@test.com` is an `ACTIVE` member of study group 10.

**Steps**:
1. Send `GET /api/documents/100`.

**Expected Result**:
- Response status is `200 OK`.
- Response contains `success=true`.
- Response `data` includes details and the following permission flags:
  - `"canPreview": true`
  - `"canOpen": true`
  - `"canDownload": true`
  - `"canEdit": false`
  - `"canDelete": false`
  - `"canMove": false`
  - `"canShare": false`

**Status**: `Not Run`

---

### TC-DOC-PREV-004 - Folder Shared User Access Document Detail
**Precondition**:
- User is logged in as `shareuser@test.com`.
- Document (ID: 100) is in folder (ID: 200).
- Folder 200 is shared directly with `shareuser@test.com` with status `ACTIVE`.

**Steps**:
1. Send `GET /api/documents/100`.

**Expected Result**:
- Response status is `200 OK`.
- Response `data` includes the details and permission flags:
  - `"canPreview": true`
  - `"canOpen": true`
  - `"canDownload": true`
  - `"canEdit": false`
  - `"canDelete": false`
  - `"canMove": false`
  - `"canShare": false`

**Status**: `Not Run`

---

### TC-DOC-PREV-005 - Unauthorized User Access Document Detail
**Precondition**:
- User is logged in as `hacker@test.com`.
- Document (ID: 100) is owned by `owner@test.com` and has NO shares configured.

**Steps**:
1. Send `GET /api/documents/100`.

**Expected Result**:
- Response status is `403 Forbidden`.
- Response `success=false` and `message="Access denied"`.

**Status**: `Not Run`

---

### TC-DOC-PREV-006 - Download Document by Owner
**Precondition**:
- User is logged in as `owner@test.com`.
- Document (ID: 100) is owned by `owner@test.com` with status `ACTIVE`.

**Steps**:
1. Send `GET /api/documents/100/download`.

**Expected Result**:
- Response status is `302 Found`.
- Response header `Location` matches the document's `fileUrl`.

**Status**: `Not Run`

---

### TC-DOC-PREV-007 - Download Document by Shared User
**Precondition**:
- User is logged in as `shareuser@test.com`.
- Document (ID: 100) is shared directly with `shareuser@test.com` (status `ACTIVE`).

**Steps**:
1. Send `GET /api/documents/100/download`.

**Expected Result**:
- Response status is `302 Found`.
- Response header `Location` matches the document's `fileUrl`.

**Status**: `Not Run`

---

### TC-DOC-PREV-008 - Download Document by Unauthorized User
**Precondition**:
- User is logged in as `hacker@test.com`.
- Document (ID: 100) is owned by `owner@test.com` with no active shares.

**Steps**:
1. Send `GET /api/documents/100/download`.

**Expected Result**:
- Response status is `403 Forbidden`.
- Response `success=false` and `message="Access denied"`.

**Status**: `Not Run`

---

### TC-DOC-PREV-009 - Access Soft-Deleted/Trash Document
**Precondition**:
- User is logged in as `owner@test.com`.
- Document (ID: 100) has status `DELETED` (in Trash).

**Steps**:
1. Send `GET /api/documents/100`.
2. Send `GET /api/documents/100/download`.

**Expected Result**:
- Both endpoints return `404 Not Found`.
- Response `success=false` and `message="Document not found"`.

**Status**: `Not Run`

---

### TC-DOC-PREV-010 - Access Revoked Share Document
**Precondition**:
- User is logged in as `shareuser@test.com`.
- Document (ID: 100) is owned by `owner@test.com`.
- A share record for `shareuser@test.com` exists but its status has been changed to `REVOKED`.

**Steps**:
1. Send `GET /api/documents/100`.
2. Send `GET /api/documents/100/download`.

**Expected Result**:
- Both endpoints return `403 Forbidden`.
- Response `success=false` and `message="Access denied"`.

**Status**: `Not Run`
