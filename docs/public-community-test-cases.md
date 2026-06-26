# Test Cases - Public Community Library (Step 8)

This document contains 18 test cases to verify unauthenticated (guest) access, logged-in non-owner permissions, owner publishing features, trash constraints, and stats counter increments.

---

## 1. Guest Access & Read-Only Permissions

### Test Case 1: Guest Page Navigation
- **Preconditions**: User is not logged in (no authorization cookies).
- **Actions**: Request `community.html` in browser.
- **Expected Result**: Page loads successfully; no redirection to login page is triggered.

### Test Case 2: Guest Search Public Documents
- **Preconditions**:
  - Unauthenticated request.
  - At least one document with `status = 'ACTIVE'`, `visibility = 'PUBLIC'`, and `approvalStatus = 'APPROVED'` exists.
- **Actions**: Call `GET /api/documents/public?keyword=physics`.
- **Expected Result**: Returns `200 OK` listing the matching public documents.

### Test Case 3: Guest View Public Document Detail
- **Preconditions**: Unauthenticated request. Document ID `25` is public and approved.
- **Actions**: Call `GET /api/documents/public/25`.
- **Expected Result**: Returns `200 OK` with full document metadata.

### Test Case 4: Guest Preview Public Document
- **Preconditions**: Unauthenticated request. Document ID `25` is a public approved PDF.
- **Actions**: Check the `canPreview` property in the response of `GET /api/documents/public/25`.
- **Expected Result**: `canPreview` is `true`.

### Test Case 5: Guest Open Public Document
- **Preconditions**: Unauthenticated request. Document ID `25` is a public approved document.
- **Actions**: Check the `canOpen` property in the response of `GET /api/documents/public/25`.
- **Expected Result**: `canOpen` is `true`.

### Test Case 6: Guest Download Public Document
- **Preconditions**: Unauthenticated request. Document ID `25` is a public approved document.
- **Actions**: Check the `canDownload` property in the response of `GET /api/documents/public/25`.
- **Expected Result**: `canDownload` is `true`.

---

## 2. Guest Boundary Violations & Blocks

### Test Case 7: Guest Access to Private Document Details
- **Preconditions**: Unauthenticated request. Document ID `30` is private (`visibility = 'PRIVATE'`).
- **Actions**: Call `GET /api/documents/public/30`.
- **Expected Result**: Returns `404 Not Found` or `403 Forbidden`; no metadata is returned to the guest.

### Test Case 8: Guest Download Private Document
- **Preconditions**: Unauthenticated request. Document ID `30` is private.
- **Actions**: Call `GET /api/documents/public/30/download`.
- **Expected Result**: Returns `404 Not Found` or `403 Forbidden`; file download is blocked.

### Test Case 9: Guest View Trashed Public Document Details
- **Preconditions**: Unauthenticated request. Document ID `35` is public, but soft-deleted (`status = 'DELETED'`).
- **Actions**: Call `GET /api/documents/public/35`.
- **Expected Result**: Returns `404 Not Found`; metadata is blocked.

### Test Case 10: Guest View Unpublished Public Document Details
- **Preconditions**: Unauthenticated request. Document ID `40` has `visibility = 'PUBLIC'` but `approvalStatus = 'PENDING'` (or is unpublished / private).
- **Actions**: Call `GET /api/documents/public/40`.
- **Expected Result**: Returns `404 Not Found` or `403 Forbidden`; metadata is blocked.

### Test Case 11: Guest Modification Actions Visibility
- **Preconditions**: Unauthenticated request. Document ID `25` is a public approved document.
- **Actions**: Request metadata via `GET /api/documents/public/25` and check action permission flags.
- **Expected Result**: `canEdit`, `canDelete`, `canMove`, and `canShare` are all strictly `false`.

---

## 3. Logged-In User Actions

### Test Case 12: Logged-in Non-Owner Actions on Public Document
- **Preconditions**: Logged in as User B. Document ID `25` is owned by User A, but visibility is public and approved.
- **Actions**: Call `GET /api/documents/25` or `GET /api/documents/public/25` and examine capability flags.
- **Expected Result**: `canPreview = true` (if supported), `canOpen = true`, `canDownload = true`. All other flags (`canEdit`, `canDelete`, `canMove`, `canShare`) are `false`.

### Test Case 13: Owner Publishes Document
- **Preconditions**: Logged in as User A (owner of Document `25`).
- **Actions**: Call `PUT /api/documents/25/publish`.
- **Expected Result**: Returns `200 OK`. `visibility` is updated to `'PUBLIC'` and `approvalStatus` changes to `'APPROVED'`.

### Test Case 14: Owner Unpublishes Document
- **Preconditions**: Logged in as User A (owner of Document `25`, currently public).
- **Actions**: Call `PUT /api/documents/25/unpublish`.
- **Expected Result**: Returns `200 OK`. `visibility` is reset to `'PRIVATE'`.

---

## 4. Trash & Restore Rules

### Test Case 15: Trashed Public Document Disappears from Community Library
- **Preconditions**: Document `25` is public and approved. Owner soft-deletes it (`DELETE /api/documents/25`).
- **Actions**: Call `GET /api/documents/public` (Community listing).
- **Expected Result**: Document `25` is no longer returned in the public listing.

### Test Case 16: Restoring Trashed Public Document Restores Community Visibility
- **Preconditions**: Document `25` is public/approved but currently soft-deleted. Owner restores it (`POST /api/trash/documents/25/restore`).
- **Actions**: Call `GET /api/documents/public` (Community listing).
- **Expected Result**: Document `25` is successfully restored and appears back in the public listing.

---

## 5. Counter Increments

### Test Case 17: View Count Increment
- **Preconditions**: Document ID `25` is public and approved. Current `viewCount` is `15`.
- **Actions**: Call `GET /api/documents/public/25` successfully.
- **Expected Result**: `viewCount` in the returned payload (and database record) is updated to `16`.

### Test Case 18: Download Count Increment
- **Preconditions**: Document ID `25` is public and approved. Current `downloadCount` is `5`.
- **Actions**: Call `GET /api/documents/public/25/download` successfully.
- **Expected Result**: The request redirects to the Cloudinary file URL, and the document record in database updates `downloadCount` to `6`.
