# Demo Checklist - Document & Group sharing

This checklist defines the step-by-step verification flow to demonstrate direct sharing, group sharing, trash/restore rules, and group membership revocation impacts.

---

## 1. Setup & Preconditions

- [ ] Register and verify three active user accounts:
  - User A: `usera@gmail.com`
  - User B: `userb@gmail.com`
  - User C: `userc@gmail.com`
- [ ] Log in as User A and upload a document (e.g., "Demo-Guide.pdf", Document ID `10`).
- [ ] Log in as User A and create a Study Group (e.g., "Study Group X", Group ID `5`, Invite Code `INVITE55`).
- [ ] Log in as User B and join Group 5 using invite code `INVITE55`.
- [ ] Ensure User C is NOT a member of Group 5.

---

## 2. Flow 1: Direct Document Sharing & Permissions

- [ ] **Step 1.1**: Log in as User A and share Document `10` with User B (`POST /api/documents/10/shares/users` -> `"email": "userb@gmail.com"`).
  - *Expected*: Returns `200 OK`, `success: true`.
- [ ] **Step 1.2**: Log in as User B and retrieve shared documents (`GET /api/documents/shared-with-me`).
  - *Expected*: Document `10` is listed.
- [ ] **Step 1.3**: Log in as User B and fetch detail/download URL (`GET /api/documents/10`).
  - *Expected*: Returns `200 OK`, `success: true` containing metadata and `fileUrl`.
- [ ] **Step 1.4**: Log in as User B and attempt to edit, move, or delete Document `10`:
  - `PUT /api/documents/10` -> *Expected*: `403 Forbidden`.
  - `PUT /api/documents/10/move` -> *Expected*: `403 Forbidden`.
  - `DELETE /api/documents/10` -> *Expected*: `403 Forbidden`.
- [ ] **Step 1.5**: Log in as User A and revoke direct share for User B (`DELETE /api/document-shares/{shareId}`).
  - *Expected*: Returns `200 OK`.
- [ ] **Step 1.6**: Log in as User B and attempt to retrieve Document `10` (`GET /api/documents/10`).
  - *Expected*: `403 Forbidden`.

---

## 3. Flow 2: Group Sharing & Permissions

- [ ] **Step 2.1**: Log in as User A and share Document `10` into Group 5 (`POST /api/documents/10/shares/groups` -> `"groupId": 5`).
  - *Expected*: Returns `200 OK`, `success: true`.
- [ ] **Step 2.2**: Log in as User B (member) and view group documents (`GET /api/groups/5/documents`).
  - *Expected*: Document `10` is listed.
- [ ] **Step 2.3**: Log in as User C (non-member) and view group documents (`GET /api/groups/5/documents`).
  - *Expected*: `403 Forbidden` ("You must be an active member of this group to view group documents").
- [ ] **Step 2.4**: Log in as User B (member but not document owner) and try to revoke User A's share (`DELETE /api/group-document-shares/{shareId}`).
  - *Expected*: `403 Forbidden` ("You do not have permission to revoke this group document share").
- [ ] **Step 2.5**: Log in as User A (group owner OR document owner) and revoke share (`DELETE /api/group-document-shares/{shareId}`).
  - *Expected*: `200 OK` (revocation successful).

---

## 4. Flow 3: Trash & Restore Impact

- [ ] **Step 3.1**: Log in as User A and share Document `10` directly to User B and to Group 5.
- [ ] **Step 3.2**: Log in as User A and trash Document `10` (`DELETE /api/documents/10`).
- [ ] **Step 3.3**: Log in as User B and verify:
  - `GET /api/documents/shared-with-me` -> *Expected*: Document `10` is hidden.
  - `GET /api/groups/5/documents` -> *Expected*: Document `10` is hidden.
  - `GET /api/documents/10` -> *Expected*: `404 Not Found` (cannot view detail of a trashed document).
- [ ] **Step 3.4**: Log in as User A and restore Document `10` (`POST /api/trash/documents/10/restore`).
- [ ] **Step 3.5**: Log in as User B and verify that Document `10` is visible again in:
  - `GET /api/documents/shared-with-me`
  - `GET /api/groups/5/documents`
  - `GET /api/documents/10` (returns metadata and fileUrl).

---

## 5. Flow 4: Member Removal / Leaving Impact

- [ ] **Step 4.1**: Log in as User B (member of Group 5) and upload Document `11`. Share it to Group 5.
- [ ] **Step 4.2**: Log in as User A (Group Owner) and share Document `10` to Group 5.
- [ ] **Step 4.3**: Log in as User A (Group Owner) and remove User B from Group 5 (`DELETE /api/groups/5/members/{userBId}`).
  - *Expected*: Returns `200 OK`.
- [ ] **Step 4.4**: Log in as User A and verify Group 5 documents list (`GET /api/groups/5/documents`):
  - *Expected*: Document `11` (shared by removed User B) is gone (status changed to `REVOKED` in db).
  - *Expected*: Document `10` (shared by owner User A) is still active and listed in the group.
- [ ] **Step 4.5**: Log in as User B (removed) and attempt to view Group 5 documents:
  - *Expected*: `403 Forbidden`.

---

## 6. Flow 5: Public Community Library

- [ ] **Step 5.1**: Log in as User A and publish Document `10` (`PUT /api/documents/10/publish`).
  - *Expected*: Returns `200 OK`, `success: true`. Visibility is updated to `'PUBLIC'` and approvalStatus is `'APPROVED'`.
- [ ] **Step 5.2**: Perform unauthenticated (Guest) query to community search (`GET /api/documents/public?keyword=Demo`).
  - *Expected*: Returns `200 OK` listing Document `10`.
- [ ] **Step 5.3**: Perform unauthenticated (Guest) request to view Document `10` detail (`GET /api/documents/public/10`).
  - *Expected*: Returns `200 OK`. `viewCount` in response is incremented. `canPreview`, `canOpen`, and `canDownload` are `true`; modification flags (`canEdit`, `canDelete`, `canMove`, `canShare`) are `false`.
- [ ] **Step 5.4**: Perform unauthenticated (Guest) request to download Document `10` (`GET /api/documents/public/10/download`).
  - *Expected*: Returns file download stream (or secure redirect), and updates `downloadCount` in database.
- [ ] **Step 5.5**: Perform unauthenticated (Guest) request to get detail for a private Document (`GET /api/documents/public/11`).
  - *Expected*: `404 Not Found` or `403 Forbidden` (metadata access denied).
- [ ] **Step 5.6**: Log in as User A and unpublish Document `10` (`PUT /api/documents/10/unpublish`).
  - *Expected*: Returns `200 OK`. Visibility is updated to `'PRIVATE'`.
- [ ] **Step 5.7**: Perform unauthenticated (Guest) request to view Document `10` detail (`GET /api/documents/public/10`).
  - *Expected*: `404 Not Found` or `403 Forbidden` (access denied).
- [ ] **Step 5.8**: Log in as User A, publish Document `10` again, then delete it (`DELETE /api/documents/10`).
- [ ] **Step 5.9**: Perform unauthenticated (Guest) search (`GET /api/documents/public`).
  - *Expected*: Document `10` is not listed (hidden in trash).

---

## 7. Flow 6: AI Document Processing Foundation

- [ ] **Step 6.1**: Upload a new text document (`POST /api/documents/upload` with a TXT file).
  - *Expected*: Returns `200 OK`, `success: true`. Response data includes `"processingStatus": "PENDING"`.
- [ ] **Step 6.2**: Check the document detail (`GET /api/documents/{id}`).
  - *Expected*: Returns `200 OK` with `"processingStatus": "PENDING"`.
- [ ] **Step 6.3**: Request document processing (`POST /api/documents/{id}/process`) as owner.
  - *Expected*: Returns `202 Accepted`, `success: true`, status is `"PROCESSING"`. Async processing worker starts.
- [ ] **Step 6.4**: Make a concurrent request (`POST /api/documents/{id}/process`) during worker execution.
  - *Expected*: Returns `409 Conflict`, error message indicating document is already processing.
- [ ] **Step 6.5**: Poll the status endpoint (`GET /api/documents/{id}/processing-status`) as owner until terminal status is reached.
  - *Expected*: Returns `200 OK`. Eventually status transitions to `"COMPLETED"`.
- [ ] **Step 6.6**: Fetch extracted content (`GET /api/documents/{id}/content`) as owner.
  - *Expected*: Returns `200 OK` with the full mock text of the document.
- [ ] **Step 6.7**: Fetch processing status (`GET /api/documents/{id}/processing-status`) as a Direct Shared User.
  - *Expected*: Returns `200 OK` with `"processingStatus": "COMPLETED"`.
- [ ] **Step 6.8**: Fetch extracted content (`GET /api/documents/{id}/content`) as a Direct Shared User.
  - *Expected*: Returns `403 Forbidden` (only owner can read full content).
- [ ] **Step 6.9**: Trigger reprocessing (`POST /api/documents/{id}/reprocess`) as owner.
  - *Expected*: Returns `202 Accepted`, resets status to `"PROCESSING"`, and updates content successfully to `"COMPLETED"`.
- [ ] **Step 6.10**: Check stale job recovery (Simulate job stuck in `PROCESSING` for >10 mins by updating `processing_started_at` in DB, then query `/processing-status`).
  - *Expected*: Status transitions to `"FAILED"` and registers error in `lastAttemptError`.
