# Test Cases - Step 6A: Study Group & Document Sharing

This document defines the test suite for Step 6A (Study Group Management & Document Sharing) on the AI Study Hub backend.

---

## 1. Setup & Prerequisite Data

For all test cases, assume the following active users and database records exist:
- **User A** (`owner@gmail.com`): Active User, owner of Document A.
- **User B** (`recipient@gmail.com`): Active User, owner of Document B.
- **User C** (`external@gmail.com`): Active User, not in any group by default.
- **Document A** (`documentId = 10`): Owned by User A, status is `ACTIVE`.
- **Document B** (`documentId = 20`): Owned by User B, status is `ACTIVE`.
- **Document C** (`documentId = 30`): Owned by User A, status is `DELETED` (in Trash).

---

## 2. Test Case Index

| TC ID | Category | Test Case Description | Expected Status |
| :--- | :--- | :--- | :--- |
| **TC-GRP-01** | Groups | Create study group successfully | `200 OK` |
| **TC-GRP-02** | Groups | Join group using a valid `inviteCode` | `200 OK` |
| **TC-GRP-03** | Groups | Join group when already an active member | `400 Bad Request` |
| **TC-GRP-04** | Groups | Get My Groups list | `200 OK` |
| **TC-GRP-05** | Groups | Get group detail (Member access) | `200 OK` |
| **TC-GRP-06** | Groups | Get group detail (Non-member access denied) | `403 Forbidden` |
| **TC-GRP-07** | Groups | MEMBER leaves group successfully | `200 OK` |
| **TC-GRP-08** | Groups | OWNER soft-deletes group successfully | `200 OK` |
| **TC-GRP-09** | Groups | OWNER removes a member successfully | `200 OK` |
| **TC-SHR-01** | Sharing | Share document directly to user by email | `200 OK` |
| **TC-SHR-02** | Sharing | Share document to oneself is blocked | `400 Bad Request` |
| **TC-SHR-03** | Sharing | Share document not owned by the current user | `403 Forbidden` |
| **TC-SHR-04** | Sharing | Share a soft-deleted (DELETED/trashed) document | `404 Not Found` |
| **TC-SHR-05** | Sharing | Duplicate direct document-user sharing is blocked | `409 Conflict` |
| **TC-SHR-06** | Sharing | Shared With Me returns only ACTIVE documents | `200 OK` |
| **TC-SHR-07** | Sharing | Document owner revokes direct share successfully | `200 OK` |
| **TC-GSH-01** | Group Sharing | Share document into group (OWNER shares) | `200 OK` |
| **TC-GSH-02** | Group Sharing | Share document into group (MEMBER shares) | `200 OK` |
| **TC-GSH-03** | Group Sharing | Non-member sharing document to group is blocked | `403 Forbidden` |
| **TC-GSH-04** | Group Sharing | Share document into soft-deleted group is blocked | `404 Not Found` |
| **TC-GSH-05** | Group Sharing | Duplicate document-group sharing is blocked | `409 Conflict` |
| **TC-GSH-06** | Group Sharing | Active member views group documents list | `200 OK` |
| **TC-GSH-07** | Group Sharing | Non-member viewing group documents is blocked | `403 Forbidden` |
| **TC-GSH-08** | Group Sharing | Document Owner revokes group document share | `200 OK` |
| **TC-GSH-09** | Group Sharing | Group OWNER revokes any group document share | `200 OK` |
| **TC-GSH-10** | Group Sharing | Group MEMBER cannot revoke other member's share | `403 Forbidden` |
| **TC-TRH-01** | Trash / Soft Delete | Document moved to trash is hidden from shares | `200 OK` |
| **TC-TRH-02** | Trash / Soft Delete | Restoring document displays active share again | `200 OK` |

---

## 3. Detailed Test Cases

### 3.1. Group Management (TC-GRP)

#### TC-GRP-01: Create study group successfully
- **Actor**: User A (`owner@gmail.com`)
- **HTTP Request**: `POST /api/groups`
- **Request Body**:
  ```json
  {
    "groupName": "Java Developers",
    "description": "Study Spring Boot and Hibernate"
  }
  ```
- **Expected Result**:
  - Response Status: `200 OK`
  - Response JSON: `success: true`
  - Database: A new group is created in `study_groups` with status `ACTIVE`, and a random unique 8-character uppercase `invite_code`. User A is added to `study_group_members` with status `ACTIVE` and role `OWNER`.

#### TC-GRP-02: Join group using a valid inviteCode
- **Actor**: User B (`recipient@gmail.com`)
- **HTTP Request**: `POST /api/groups/join`
- **Request Body**:
  ```json
  {
    "inviteCode": "ABCD1234"
  }
  ```
- **Expected Result**:
  - Response Status: `200 OK`
  - Response JSON: `success: true`
  - Database: A new row in `study_group_members` is created for User B with status `ACTIVE` and role `MEMBER`.

#### TC-GRP-03: Join group when already an active member
- **Actor**: User B (already active member)
- **HTTP Request**: `POST /api/groups/join`
- **Request Body**:
  ```json
  {
    "inviteCode": "ABCD1234"
  }
  ```
- **Expected Result**:
  - Response Status: `400 Bad Request`
  - Response JSON: `success: false`, `message: "You are already a member of this group"`

#### TC-GRP-04: Get My Groups list
- **Actor**: User B (member of Group 1)
- **HTTP Request**: `GET /api/groups/my`
- **Expected Result**:
  - Response Status: `200 OK`
  - Response JSON: Returns list of groups User B belongs to, each item containing `groupId`, `groupName`, `role: "MEMBER"`.

#### TC-GRP-05: Get group detail (Member access)
- **Actor**: User B (active member of Group 1)
- **HTTP Request**: `GET /api/groups/1`
- **Expected Result**:
  - Response Status: `200 OK`
  - Response JSON: Returns group metadata including member list showing User A (OWNER) and User B (MEMBER).

#### TC-GRP-06: Get group detail (Non-member access denied)
- **Actor**: User C (`external@gmail.com`, not in Group 1)
- **HTTP Request**: `GET /api/groups/1`
- **Expected Result**:
  - Response Status: `403 Forbidden`
  - Response JSON: `success: false`, `message: "You are not a member of this group"`

#### TC-GRP-07: MEMBER leaves group successfully
- **Actor**: User B (`recipient@gmail.com`, role `MEMBER`)
- **HTTP Request**: `POST /api/groups/1/leave`
- **Expected Result**:
  - Response Status: `200 OK`
  - Response JSON: `success: true`
  - Database: User B's membership status in `study_group_members` transitions to `LEFT`.

#### TC-GRP-08: OWNER soft-deletes group successfully
- **Actor**: User A (`owner@gmail.com`, role `OWNER`)
- **HTTP Request**: `DELETE /api/groups/1`
- **Expected Result**:
  - Response Status: `200 OK`
  - Response JSON: `success: true`
  - Database: Group's status in `study_groups` transitions to `DELETED`. Memberships transition to `LEFT`.

#### TC-GRP-09: OWNER removes a member successfully
- **Actor**: User A (`owner@gmail.com`, role `OWNER`)
- **HTTP Request**: `DELETE /api/groups/1/members/{userIdOfUserB}`
- **Expected Result**:
  - Response Status: `200 OK`
  - Response JSON: `success: true`
  - Database: User B's membership status transitions to `REMOVED`.

---

### 3.2. Direct Document Sharing (TC-SHR)

#### TC-SHR-01: Share document directly to user by email
- **Actor**: User A (owner of Document A)
- **HTTP Request**: `POST /api/documents/10/shares/users`
- **Request Body**:
  ```json
  {
    "email": "recipient@gmail.com"
  }
  ```
- **Expected Result**:
  - Response Status: `200 OK`
  - Response JSON: `success: true` and mapping data with `shareId`.
  - Database: New row created in `document_shares` with status `ACTIVE` and permission `VIEW`.

#### TC-SHR-02: Share document to oneself is blocked
- **Actor**: User A (owner of Document A)
- **HTTP Request**: `POST /api/documents/10/shares/users`
- **Request Body**:
  ```json
  {
    "email": "owner@gmail.com"
  }
  ```
- **Expected Result**:
  - Response Status: `400 Bad Request`
  - Response JSON: `success: false`, `message: "You cannot share a document with yourself"`

#### TC-SHR-03: Share document not owned by the current user
- **Actor**: User B (does not own Document A)
- **HTTP Request**: `POST /api/documents/10/shares/users`
- **Request Body**:
  ```json
  {
    "email": "external@gmail.com"
  }
  ```
- **Expected Result**:
  - Response Status: `403 Forbidden`
  - Response JSON: `success: false`, `message: "Only the document owner can share this document"`

#### TC-SHR-04: Share a soft-deleted (DELETED/trashed) document
- **Actor**: User A (owner of Document C which is in Trash, status `DELETED`)
- **HTTP Request**: `POST /api/documents/30/shares/users`
- **Request Body**:
  ```json
  {
    "email": "recipient@gmail.com"
  }
  ```
- **Expected Result**:
  - Response Status: `404 Not Found`
  - Response JSON: `success: false`, `message: "Document not found or in trash"`

#### TC-SHR-05: Duplicate direct document-user sharing is blocked
- **Actor**: User A (owner of Document A)
- **HTTP Request**: `POST /api/documents/10/shares/users`
- **Request Body**:
  ```json
  {
    "email": "recipient@gmail.com"
  }
  ```
- **Prerequisite**: Share record already exists with status `ACTIVE`.
- **Expected Result**:
  - Response Status: `409 Conflict`
  - Response JSON: `success: false`, `message: "Document is already shared with this user"`

#### TC-SHR-06: Shared With Me returns only ACTIVE documents
- **Actor**: User B (`recipient@gmail.com`)
- **HTTP Request**: `GET /api/documents/shared-with-me`
- **Expected Result**:
  - Response Status: `200 OK`
  - Response JSON: Returns shared documents. Trashed documents or revoked shares are excluded.

#### TC-SHR-07: Document owner revokes direct share successfully
- **Actor**: User A (owner of Document A)
- **HTTP Request**: `DELETE /api/document-shares/1`
- **Expected Result**:
  - Response Status: `200 OK`
  - Response JSON: `success: true`
  - Database: Share status changes to `REVOKED`. Document no longer displays in User B's Shared With Me list.

---

### 3.3. Group Document Sharing (TC-GSH)

#### TC-GSH-01: Share document into group (OWNER shares)
- **Actor**: User A (owner of Document A, and OWNER of Group 1)
- **HTTP Request**: `POST /api/documents/10/shares/groups`
- **Request Body**:
  ```json
  {
    "groupId": 1
  }
  ```
- **Expected Result**:
  - Response Status: `200 OK`
  - Database: Row in `group_document_shares` created with status `ACTIVE`.

#### TC-GSH-02: Share document into group (MEMBER shares)
- **Actor**: User B (owner of Document B, and MEMBER of Group 1)
- **HTTP Request**: `POST /api/documents/20/shares/groups`
- **Request Body**:
  ```json
  {
    "groupId": 1
  }
  ```
- **Expected Result**:
  - Response Status: `200 OK`
  - Database: Row in `group_document_shares` created with status `ACTIVE`.

#### TC-GSH-03: Non-member sharing document to group is blocked
- **Actor**: User C (owner of Document B, but not a member of Group 1)
- **HTTP Request**: `POST /api/documents/20/shares/groups`
- **Request Body**:
  ```json
  {
    "groupId": 1
  }
  ```
- **Expected Result**:
  - Response Status: `403 Forbidden`
  - Response JSON: `success: false`, `message: "You must be an active member of the group to share to it"`

#### TC-GSH-04: Share document into soft-deleted group is blocked
- **Actor**: User B (active member of Group 1, but Group 1 has status `DELETED`)
- **HTTP Request**: `POST /api/documents/20/shares/groups`
- **Request Body**:
  ```json
  {
    "groupId": 1
  }
  ```
- **Expected Result**:
  - Response Status: `404 Not Found`
  - Response JSON: `success: false`, `message: "Group not found or deleted"`

#### TC-GSH-05: Duplicate document-group sharing is blocked
- **Actor**: User A (owner of Document A)
- **HTTP Request**: `POST /api/documents/10/shares/groups`
- **Request Body**:
  ```json
  {
    "groupId": 1
  }
  ```
- **Prerequisite**: Document A is already shared to Group 1 with status `ACTIVE`.
- **Expected Result**:
  - Response Status: `409 Conflict`
  - Response JSON: `success: false`, `message: "Document is already shared in this group"`

#### TC-GSH-06: Active member views group documents list
- **Actor**: User B (active member of Group 1)
- **HTTP Request**: `GET /api/groups/1/documents`
- **Expected Result**:
  - Response Status: `200 OK`
  - Response JSON: Returns list of documents shared inside Group 1.

#### TC-GSH-07: Non-member viewing group documents is blocked
- **Actor**: User C (not in Group 1)
- **HTTP Request**: `GET /api/groups/1/documents`
- **Expected Result**:
  - Response Status: `403 Forbidden`
  - Response JSON: `success: false`, `message: "You must be an active member of this group to view group documents"`

#### TC-GSH-08: Document Owner revokes group document share
- **Actor**: User B (owner of Document B which was shared in Group 1)
- **HTTP Request**: `DELETE /api/group-document-shares/2`
- **Expected Result**:
  - Response Status: `200 OK`
  - Database: Share status changes to `REVOKED`.

#### TC-GSH-09: Group OWNER revokes any group document share
- **Actor**: User A (Group OWNER, but does not own Document B which was shared in Group 1 by User B)
- **HTTP Request**: `DELETE /api/group-document-shares/2`
- **Expected Result**:
  - Response Status: `200 OK`
  - Database: Share status changes to `REVOKED`.

#### TC-GSH-10: Group MEMBER cannot revoke other member's share
- **Actor**: User B (Group MEMBER, tries to revoke Document A shared by Group Owner User A)
- **HTTP Request**: `DELETE /api/group-document-shares/1`
- **Expected Result**:
  - Response Status: `403 Forbidden`
  - Response JSON: `success: false`, `message: "You do not have permission to revoke this group document share"`

---

### 3.4. Trash / Soft Delete Impact (TC-TRH)

#### TC-TRH-01: Document moved to trash is hidden from shares
- **Action**: User A moves Document A to trash (updates Document A status = `DELETED`).
- **Test Endpoint**: `GET /api/documents/shared-with-me` (requested by User B) OR `GET /api/groups/1/documents` (requested by active member)
- **Expected Result**:
  - Response Status: `200 OK`
  - Response JSON: Document A does **not** appear in the list.

#### TC-TRH-02: Restoring document displays active share again
- **Action**: User A restores Document A from trash (updates Document A status = `ACTIVE`). The share record is still `ACTIVE`.
- **Test Endpoint**: `GET /api/documents/shared-with-me` (requested by User B) OR `GET /api/groups/1/documents` (requested by active member)
- **Expected Result**:
  - Response Status: `200 OK`
  - Response JSON: Document A is visible again.
