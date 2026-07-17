# Admin Features Test Cases

This document describes the test cases to verify the implementation of the Admin Security, Dashboard, Document Moderation, and Export APIs.

## Group 1: Access Control & Security
### TC-SEC-01: Unauthenticated request to /api/admin/** gets 401
- **Preconditions**: User is not logged in.
- **Action**: Call `GET /api/admin/dashboard/summary`.
- **Expected Result**: Response status is `401 Unauthorized`.

### TC-SEC-02: Normal USER request to /api/admin/** gets 403
- **Preconditions**: User is logged in as standard `USER`.
- **Action**: Call `GET /api/admin/dashboard/summary`.
- **Expected Result**: Response status is `403 Forbidden`.

### TC-SEC-03: ADMIN request to /api/admin/** succeeds
- **Preconditions**: User is logged in as `ADMIN`.
- **Action**: Call `GET /api/admin/dashboard/summary`.
- **Expected Result**: Response status is `200 OK`.

---

## Group 2: Admin Dashboard API
### TC-DB-01: Summary counters are populated
- **Preconditions**: DB has users, payments, documents, and AI usage logs.
- **Action**: Call `GET /api/admin/dashboard/summary` as ADMIN.
- **Expected Result**:
  - Response matches `AdminDashboardResponse` format.
  - `totalUsers` count matches DB users.
  - `totalDocuments` count matches DB active documents.
  - `pendingPublicDocuments` count matches DB active public documents with approval status `PENDING`.
  - `totalRevenue` is the sum of all payments with status `SUCCESS` (excluding PENDING, FAILED, etc.).
  - `usersByTier` groups user counts by free, premium, ultra.
  - `documentsByApprovalStatus` groups document counts by approval status (`PENDING`, `APPROVED`, `REJECTED`).
  - `revenueByMonth` groups successful payment revenues by month (e.g. `"2026-07"`).
  - `aiRequestsToday` counts successful logs since start of UTC day.
  - `aiRequestsThisMonth` counts successful logs since start of UTC month.
  - `aiUsageByFeature` groups AI usage log counts by feature (`AI_QA`, `AI_SUMMARY`, `AI_QUIZ`, `AI_FLASHCARD`).

---

## Group 3: Document Moderation API
### TC-MOD-01: Get public documents list with filters
- **Preconditions**: DB contains public documents of various subjects and file types.
- **Action**: Call `GET /api/admin/documents/public` with pagination, title search keyword, approval status filter, file type filter, and subject filter.
- **Expected Result**:
  - Documents matching all search/filter criteria are returned.
  - Response contains pagination details (`page`, `size`, `totalItems`, `totalPages`).

### TC-MOD-02: Approve document
- **Preconditions**: A document exists with visibility `PUBLIC` and approval status `PENDING`.
- **Action**: Call `PATCH /api/admin/documents/{id}/approve` as ADMIN.
- **Expected Result**:
  - Response is `200 OK`.
  - The document's `approvalStatus` in DB becomes `APPROVED`.
  - `publishedAt` is set to the current UTC timestamp.
  - The document is now displayed in the Community Library.

### TC-MOD-03: Reject document
- **Preconditions**: A document exists with visibility `PUBLIC` and approval status `PENDING`.
- **Action**: Call `PATCH /api/admin/documents/{id}/reject` as ADMIN.
- **Expected Result**:
  - Response is `200 OK`.
  - The document's `approvalStatus` in DB becomes `REJECTED`.
  - The document's original file is not deleted.
  - The document record is not deleted from DB.
  - The document is not displayed in the Community Library.

### TC-MOD-04: Unpublish document
- **Preconditions**: A document exists with visibility `PUBLIC` and approval status `APPROVED`.
- **Action**: Call `PATCH /api/admin/documents/{id}/unpublish` as ADMIN.
- **Expected Result**:
  - Response is `200 OK`.
  - The document's `visibility` in DB becomes `PRIVATE`.
  - The document's original file and record are not deleted.
  - The document is not displayed in the Community Library.

---

## Group 4: Export to Excel
### TC-EXP-01: Export public documents to XLSX file
- **Preconditions**: DB has public documents.
- **Action**: Call `GET /api/admin/documents/public/export` as ADMIN.
- **Expected Result**:
  - Response headers include:
    - `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
    - `Content-Disposition: attachment; filename="public_documents.xlsx"`
  - Response body contains valid binary Excel (.xlsx) file data.
  - Exported data contains correct document metadata (IDs, titles, subjects, view/download counts, created/published dates, etc.).
  - Sensitive information (passwords, tokens, API keys, secrets) is not exposed.
