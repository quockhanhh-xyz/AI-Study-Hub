# Sharing Regression Test Cases - Step 6C (Document & Group Sharing)

## Scope

This document details the test cases for verifying direct document sharing, group document sharing, and the corresponding access control rules, revocation behavior, trash impact, and group membership changes.

---

## Common Preconditions
- Backend is running at `http://localhost:8080`.
- Frontend is running at `http://localhost:5500`.
- MySQL database `ai_study_hub` is active.
- Verified active users:
  - **User A** (`usera@gmail.com`) - Owner of files.
  - **User B** (`userb@gmail.com`) - Recipient/Member.
  - **User C** (`userc@gmail.com`) - Non-member / outside user.
- All requests include proper authentication cookies.

---

## Test Cases

### TC-SHARE-001 - Share Document to Active User (Success)
- **Precondition**: User A owns active Document ID `10`. User B (`userb@gmail.com`) is an active user. No share record exists between Document `10` and User B.
- **Steps**:
  1. Login as User A.
  2. Send `POST /api/documents/10/shares/users` with body: `{"email": "userb@gmail.com"}`.
- **Expected Result**:
  - Response status is `200 OK` and `success=true`.
  - Data contains `shareId`, `documentId`=10, `sharedWithEmail`="userb@gmail.com", and `status`="ACTIVE".
  - Login as User B and fetch shared documents via `GET /api/documents/shared-with-me`.
  - Document ID `10` is listed in User B's shared documents.
- **Status**: `Not Run`

---

### TC-SHARE-002 - Share Document into Active Group (Success)
- **Precondition**: User A owns active Document ID `10` and is an active member of active Group ID `5`.
- **Steps**:
  1. Login as User A.
  2. Send `POST /api/documents/10/shares/groups` with body: `{"groupId": 5}`.
- **Expected Result**:
  - Response status is `200 OK` and `success=true`.
  - Data contains `shareId`, `documentId`=10, `groupId`=5, and `status`="ACTIVE".
  - Login as User B (active member of Group 5) and send `GET /api/groups/5/documents`.
  - Document ID `10` is listed in the group documents.
- **Status**: `Not Run`

---

### TC-SHARE-003 - Revoke Direct Document Share (Success)
- **Precondition**: User A actively shares Document ID `10` with User B (Share ID `1`).
- **Steps**:
  1. Login as User A.
  2. Send `DELETE /api/document-shares/1`.
- **Expected Result**:
  - Response status is `200 OK` and `success=true`.
  - Login as User B and send `GET /api/documents/shared-with-me`. Document ID `10` is not listed.
  - User B attempts to view details: `GET /api/documents/10` -> returns `403 Forbidden`.
- **Status**: `Not Run`

---

### TC-SHARE-004 - Revoke Group Document Share (Success)
- **Precondition**: User A actively shares Document ID `10` to Group ID `5` (Group Share ID `2`). User B is the Group Owner.
- **Steps**:
  1. Login as User B (Group Owner).
  2. Send `DELETE /api/group-document-shares/2`.
- **Expected Result**:
  - Response status is `200 OK` and `success=true`.
  - Members of Group 5 send `GET /api/groups/5/documents` -> Document ID `10` is no longer returned.
  - User A (Document Owner) can also revoke their own share successfully.
- **Status**: `Not Run`

---

### TC-SHARE-005 - Duplicate Direct Sharing Prevention (409 Conflict)
- **Precondition**: User A already has an active direct share of Document ID `10` with User B.
- **Steps**:
  1. Login as User A.
  2. Send `POST /api/documents/10/shares/users` with body: `{"email": "userb@gmail.com"}`.
- **Expected Result**:
  - Response status is `409 Conflict` and `success=false`.
  - Message states: "Document is already shared with this user".
  - Database count of shares for Document `10` and User B remains 1.
- **Status**: `Not Run`

---

### TC-SHARE-006 - Self-Sharing Blocked (400 Bad Request)
- **Precondition**: User A owns Document ID `10`.
- **Steps**:
  1. Login as User A.
  2. Send `POST /api/documents/10/shares/users` with body: `{"email": "usera@gmail.com"}`.
- **Expected Result**:
  - Response status is `400 Bad Request` and `success=false`.
  - Message states: "You cannot share a document with yourself".
- **Status**: `Not Run`

---

### TC-SHARE-007 - Share Document Not Owned by Self Blocked (403 Forbidden)
- **Precondition**: User A owns Document ID `10`. User B does not own it.
- **Steps**:
  1. Login as User B.
  2. Send `POST /api/documents/10/shares/users` with body: `{"email": "userc@gmail.com"}`.
- **Expected Result**:
  - Response status is `403 Forbidden` and `success=false`.
  - Message states: "Only the document owner can share this document".
- **Status**: `Not Run`

---

### TC-SHARE-012 - Share Document into Group as Non-member Blocked (403 Forbidden)
- **Precondition**: User A owns Document ID `10` but is NOT a member of Group ID `6`.
- **Steps**:
  1. Login as User A.
  2. Send `POST /api/documents/10/shares/groups` with body: `{"groupId": 6}`.
- **Expected Result**:
  - Response status is `403 Forbidden` and `success=false`.
  - Message states: "You must be an active member of the group to share to it".
- **Status**: `Not Run`

---

### TC-SHARE-008 - Shared User Blocked from Edit/Delete/Move (403 Forbidden)
- **Precondition**: User A actively shares Document ID `10` with User B.
- **Steps**:
  1. Login as User B.
  2. Attempt to update: `PUT /api/documents/10` with body: `{"title": "Hacked Title"}`.
  3. Attempt to move: `PUT /api/documents/10/move` with body: `{"folderId": 2}`.
  4. Attempt to delete: `DELETE /api/documents/10`.
- **Expected Result**:
  - Each request fails with `403 Forbidden` and `success=false`.
  - Message indicates "Access denied" or permissions violation.
- **Status**: `Not Run`

---

### TC-SHARE-009 - Non-member Blocked from Viewing Group Documents (403 Forbidden)
- **Precondition**: User C is not a member of Group ID `5`.
- **Steps**:
  1. Login as User C.
  2. Send `GET /api/groups/5/documents`.
- **Expected Result**:
  - Response status is `403 Forbidden` and `success=false`.
  - Message states: "You must be an active member of this group to view group documents".
- **Status**: `Not Run`

---

### TC-SHARE-010 - Trashed Document Impact
- **Precondition**: User A actively shares Document ID `10` directly with User B and also shares it into Group ID `5`.
- **Steps**:
  1. Login as User A.
  2. Delete Document ID `10` -> `DELETE /api/documents/10` (sets status to `DELETED`).
  3. Login as User B -> fetch shared list `GET /api/documents/shared-with-me`.
  4. Login as User B -> fetch group list `GET /api/groups/5/documents`.
  5. Login as User B -> fetch detail `GET /api/documents/10`.
- **Expected Result**:
  - Document ID `10` is NOT returned in the "Shared With Me" list.
  - Document ID `10` is NOT returned in the Group documents list.
  - `GET /api/documents/10` returns `404 Not Found`.
- **Status**: `Not Run`

---

### TC-SHARE-011 - Restore Trashed Document Re-activates Sharing
- **Precondition**: Document ID `10` is trashed (status `DELETED`) but has active sharing records.
- **Steps**:
  1. Login as User A.
  2. Restore Document ID `10` -> `POST /api/trash/documents/10/restore` (sets status to `ACTIVE`).
  3. Login as User B -> check `GET /api/documents/shared-with-me`.
  4. Login as User B -> check `GET /api/groups/5/documents`.
- **Expected Result**:
  - Document ID `10` is successfully returned in "Shared With Me" and Group documents.
  - User B can view detail `GET /api/documents/10` successfully.
- **Status**: `Not Run`

---

### TC-SHARE-013 - Remove Member from Group Revokes Sharing Impact
- **Precondition**: User B is a member of Group ID `5`. User B shared Document ID `10` (which User B owns) into Group ID `5` (Group Share ID `2`). User A is the Group Owner.
- **Steps**:
  1. Login as User A (Group Owner).
  2. Remove User B -> `DELETE /api/groups/5/members/{userBId}`.
  3. Login as User A -> fetch group documents `GET /api/groups/5/documents`.
  4. Query database table `group_document_shares` for Share ID `2`.
- **Expected Result**:
  - User B is successfully removed from the group (membership status `REMOVED`).
  - Document ID `10` is no longer returned in the Group documents list.
  - Share ID `2` in `group_document_shares` has `status = 'REVOKED'`.
  - Active group document shares by other members remain active and visible.
- **Status**: `Not Run`
