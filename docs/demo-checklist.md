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

---

## 7. Flow 7: AI Document Chat (Step 10)

### Prerequisites
- User A has uploaded a document (`Document ID = 25`) that has `processingStatus = COMPLETED`.
- User A has shared Document 25 with User B (direct share, ACTIVE).
- `AI_PROVIDER=mock` is set in application.properties for local demo.

### 7.1. Quota and Usage

- [ ] **Step 7.1.1**: Call `GET /api/ai/usage/me` as User A.
  - *Expected*: `200 OK` with `tier: "FREE"`, `dailyLimit: 5`, `usedToday: 0`, `remainingQuestions: 5`.
- [ ] **Step 7.1.2**: Call `GET /api/ai/usage/me` as guest (no auth).
  - *Expected*: `401 Unauthorized`.

### 7.2. Ask AI — Basic Flow

- [ ] **Step 7.2.1**: `POST /api/ai/documents/25/ask` as User A with `{"question": "Summarize this document"}`.
  - *Expected*: `200 OK`, `answer` non-empty, `sourceChunks` non-empty, `provider: "mock"` (or `"gemini"`), `remainingQuestions: 2`.
- [ ] **Step 7.2.2**: `GET /api/ai/usage/me` as User A.
  - *Expected*: `usedToday: 1`, `remainingQuestions: 2`.
- [ ] **Step 7.2.3**: Ask User A 2 more questions.
  - *Expected*: Third question returns `remainingQuestions: 0`.
- [ ] **Step 7.2.4**: Ask User A a 4th question (quota exhausted).
  - *Expected*: `403 Forbidden` with error code `AI_QUOTA_EXCEEDED`.

### 7.3. Ask AI — Permission Checks

- [ ] **Step 7.3.1**: Guest asks `POST /api/ai/documents/25/ask`.
  - *Expected*: `401 Unauthorized`.
- [ ] **Step 7.3.2**: User B (shared user) asks `POST /api/ai/documents/25/ask`.
  - *Expected*: `200 OK` (shared user has view permission).
- [ ] **Step 7.3.3**: User C (no access) asks.
  - *Expected*: `403 Forbidden`.

### 7.4. Ask AI — Document Status Checks

- [ ] **Step 7.4.1**: Ask about a document with `processingStatus = PENDING`.
  - *Expected*: `409 Conflict` with message `"document is not ready yet"`.
- [ ] **Step 7.4.2**: Ask about a document with `processingStatus = FAILED`.
  - *Expected*: `422 Unprocessable Entity` with message `"document has no usable AI content"`.
- [ ] **Step 7.4.3**: Ask about a deleted document (in Trash).
  - *Expected*: `404 Not Found`.

### 7.5. Input Validation

- [ ] **Step 7.5.1**: Ask with empty `question: ""`.
  - *Expected*: `400 Bad Request`.
- [ ] **Step 7.5.2**: Ask with question > 500 chars as FREE user.
  - *Expected*: `400 Bad Request`.

### 7.6. No-Context Fallback

- [ ] **Step 7.6.1**: Ask a question where no chunks match (e.g., "What is the color of the moon?").
  - *Expected*: `200 OK` with `answer: "I could not find this information in the selected document."`, `sourceChunks: []`, `provider: null`.
- [ ] **Step 7.6.2**: Verify quota was NOT consumed (call `/api/ai/usage/me`).
  - *Expected*: `usedToday` unchanged.

### 7.7. Chat History

- [ ] **Step 7.7.1**: `GET /api/ai/documents/25/chats` as User A after asking 1 question.
  - *Expected*: `200 OK` with `sessionId` non-null, `messages` length = 2 (USER + ASSISTANT).
- [ ] **Step 7.7.2**: `GET /api/ai/documents/25/chats` as User A before ever asking.
  - *Expected*: `200 OK` with `messages: []`.
- [ ] **Step 7.7.3**: `GET /api/ai/documents/25/chats` as User B (different user, same doc).
  - *Expected*: Returns User B's own chat only (not User A's).

### 7.8. Delete Chat

- [ ] **Step 7.8.1**: `DELETE /api/ai/chats/{sessionId}` as User A (own session).
  - *Expected*: `200 OK`.
- [ ] **Step 7.8.2**: `GET /api/ai/documents/25/chats` after delete.
  - *Expected*: `messages: []` (empty — deleted session not shown).
- [ ] **Step 7.8.3**: `DELETE /api/ai/chats/{sessionId}` as User B on User A's session.
  - *Expected*: `403 Forbidden`.

### 7.9. AI Configuration

- [ ] **Step 7.9.1**: With `AI_PROVIDER=mock`, ask any question.
  - *Expected*: Returns mock answer without needing API key.
- [ ] **Step 7.9.2** *(Optional)*: With `AI_PROVIDER=gemini` and no `GEMINI_API_KEY` set.
  - *Expected*: `503 Service Unavailable` — `"AI service is not configured"`.

---

## 8. Flow 8: Payment & Account Tier Upgrade (Step 11)

### Setup & Preconditions
- User A is registered and has `tier = "FREE"`.
- Central config/PlanService defines PREMIUM plan price as `199000 VND`, billingLabel = `"month"`, and daily limit = `50`.

### 8.1. Plan Inquiry & Unauthorized Access Check
- [ ] **Step 8.1**: Make an unauthenticated (Guest) request to view plans (`GET /api/payments/plans`).
  - *Expected*: `200 OK`. Returns two plans:
    - `FREE`: `price: 0`, `currency: "VND"`, `billingLabel: "free"`, `aiDailyLimit: 5`
    - `PREMIUM`: `price: 199000`, `currency: "VND"`, `billingLabel: "month"`, `aiDailyLimit: 50`.
- [ ] **Step 8.2**: Make an unauthenticated (Guest) request to create a payment order (`POST /api/payments/mock/create` with body `{"planCode": "PREMIUM"}`).
  - *Expected*: `401 Unauthorized`.

### 8.2. Create Payment & Mock Checkout Verification
- [ ] **Step 8.3**: Log in as User A (FREE) and attempt to create an order with planCode `FREE` or `INVALID`.
  - *Expected*: `400 Bad Request`.
- [ ] **Step 8.4**: Log in as User A (FREE) and create a valid PREMIUM order (`POST /api/payments/mock/create` with body `{"planCode": "PREMIUM"}`).
  - *Expected*: `200 OK`. Returns order with `paymentId = 15`, `planCode: "PREMIUM"`, `amount: 199000`, `currency: "VND"`, `billingLabel: "month"`, `paymentMethod: "MOCK"`, `status: "PENDING"`.
  - *Note*: Mock payment for MVP demo. No real subscription or expiration is applied.
- [ ] **Step 8.4.1**: (Mock Checkout Redirect) Verify that after creating the mock payment order, the frontend redirects the user to a mock VNPay-style checkout screen.
  - *Expected*: The mock screen shows QR code or mock checkout options. It is purely UI-only and does not call any external VNPay API.
  - *Expected*: Selecting "Confirm Success", "Confirm Fail", or "Cancel" on this mock screen calls the respective backend endpoints (`POST /api/payments/mock/15/success`, etc.).

### 8.3. Ownership & Status transition Checks
- [ ] **Step 8.5**: Log in as User B and attempt to mark User A's pending payment `15` as success (`POST /api/payments/mock/15/success`).
  - *Expected*: `404 Not Found` (Important: do not leak existence of User A's payment by returning 403).
- [ ] **Step 8.6**: Log in as User A and cancel the pending payment `15` (`POST /api/payments/mock/15/cancel`).
  - *Expected*: `200 OK`. Returns order with `status: "CANCELLED"`, `tier: "FREE"`, `paidAt: null`.
- [ ] **Step 8.7**: Log in as User A and attempt to cancel the cancelled payment `15` again.
  - *Expected*: `409 Conflict` (Order is no longer `PENDING`).

### 8.4. Upgrade to PREMIUM Flow
- [ ] **Step 8.8**: Log in as User A and create a new payment order (`POST /api/payments/mock/create` -> returns `paymentId = 16`).
- [ ] **Step 8.9**: Confirm payment success for order `16` (atomically updating order status and user tier) (`POST /api/payments/mock/16/success`).
  - *Expected*: `200 OK`. Returns order with `status: "SUCCESS"`, `tier: "PREMIUM"`, and `paidAt` set to the current timestamp.
- [ ] **Step 8.10**: Attempt to success order `16` again (Double-click prevention).
  - *Expected*: `409 Conflict` (status is no longer `PENDING`).

### 8.5. Post-Upgrade verification
- [ ] **Step 8.11**: Log in as User A, retrieve profile info (`GET /api/auth/me`).
  - *Expected*: `200 OK` with `"tier": "PREMIUM"`.
- [ ] **Step 8.12**: Retrieve AI usage limit (`GET /api/ai/usage/me`).
  - *Expected*: `200 OK` with `"tier": "PREMIUM"`, `"dailyLimit": 50` (daily limit successfully upgraded from 5 to 50 questions).
- [ ] **Step 8.13**: Attempt to create a new PREMIUM payment order (`POST /api/payments/mock/create` with body `{"planCode": "PREMIUM"}`).
  - *Expected*: `409 Conflict` (User is already `PREMIUM`).

### 8.6. Stale Order Management for Upgraded User
- [ ] **Step 8.14**: Create another order `17` as FREE user prior to upgrade. After User A is upgraded to PREMIUM, attempt to success order `17` (`POST /api/payments/mock/17/success`).
  - *Expected*: `409 Conflict` (User is already `PREMIUM`).
- [ ] **Step 8.15**: Attempt to fail order `17` (`POST /api/payments/mock/17/fail`).
  - *Expected*: `200 OK` with `status: "FAILED"`, `tier: "PREMIUM"`, `paidAt: null` (Already upgraded user can still fail/cancel old pending orders).

### 8.7. Retrieve Payment History
- [ ] **Step 8.16**: Retrieve payment history (`GET /api/payments/my`).
  - *Expected*: `200 OK`. Returns list containing orders `15`, `16`, and `17` with their respective final statuses, sorted by `createdAt` descending (newest first).

---

## 9. Flow 9: Persistent Study Group Chat MVP (Step 12)

### Setup & Preconditions
- User A is registered and is the **OWNER** of Study Group `10` (status = `ACTIVE`).
- User B is registered and is an **ACTIVE member** of Study Group `10`.
- User C is registered and is **not** a member of Study Group `10` (non-member).
- Study Group `11` is created but has been soft-deleted (status = `DELETED`).

### 9.1. Unauthorized and Access Controls
- [ ] **Step 9.1**: Make an unauthenticated (Guest) request to view group chat history (`GET /api/groups/10/messages`) and send a message (`POST /api/groups/10/messages`).
  - *Expected*: `401 Unauthorized`.
- [ ] **Step 9.2**: Log in as User C (non-member) and attempt to view Group `10` chat history OR send a message.
  - *Expected*: `403 Forbidden` (User has no active membership permission).
- [ ] **Step 9.3**: Log in as User A (owner) and attempt to view or send messages in deleted Group `11`.
  - *Expected*: `404 Not Found` (Group not found or DELETED).

### 9.2. Basic Chat & Realtime Polling
- [ ] **Step 9.4**: Log in as User A and view Group `10` chat history (`GET /api/groups/10/messages?limit=50`).
  - *Expected*: `200 OK` with an empty data array (`[]`).
- [ ] **Step 9.5**: Log in as User A and send a valid message:
  - `POST /api/groups/10/messages` with `{"content": "Welcome to Group 10!"}`
  - *Expected*: `200 OK`. Returns message DTO with `messageId = 1`, `groupId: 10`, `senderName: "User A"`, `senderRole: "OWNER"`, `content: "Welcome to Group 10!"`, `status: "ACTIVE"`, `isMine: true`, and `createdAt` as an ISO datetime string.
- [ ] **Step 9.6**: Log in as User B and open the Group `10` detail page.
  - *Expected*: UI loads successfully and fetches chat history. Shows User A's message with their name, role badge (`OWNER`), and locally formatted timestamp.
  - *Expected*: REST polling starts in the background every 5 seconds.
- [ ] **Step 9.7**: While logged in as User B, send a message: "Thanks for creating this group!".
  - *Expected*:
    - The input is validated: trailing/leading spaces are trimmed.
    - During submission, the Send button is disabled to prevent double submit.
    - Returns `200 OK` with `messageId = 2`, `isMine: true`.
    - Input box is cleared, message is appended to the UI list, and chat area auto-scrolls to the bottom.

### 9.3. Input Validation
- [ ] **Step 9.8**: Log in as User B and attempt to send an empty message or a message containing only whitespaces.
  - *Expected*: `400 Bad Request`.
- [ ] **Step 9.9**: Log in as User B and attempt to send a message exceeding 1000 characters.
  - *Expected*: `400 Bad Request`.

### 9.4. Polling Sync & Duplicate Prevention
- [ ] **Step 9.10**: Switch back to User A's active session. Wait for background polling (every 5 seconds) to trigger.
  - *Expected*: Polling retrieves latest messages. User B's message (`messageId = 2`, `isMine: false`) is rendered under User A's message in `createdAt` ascending order.
  - *Expected*: Frontend merges incoming messages by `messageId` to ensure no duplicates are rendered.
- [ ] **Step 9.11**: Log in as User A, refresh the group detail page.
  - *Expected*: Chat history loads both messages correctly in chronological order (`createdAt` ascending).

### 9.5. Revocation of Access
- [ ] **Step 9.12**: Log in as User A (owner) and remove User B from Group `10` (`DELETE /api/groups/10/members/{userBId}`).
  - *Expected*: `200 OK`.
- [ ] **Step 9.13**: Log in as User B (removed member) and attempt to view Group `10` chat history (`GET /api/groups/10/messages`) or send a message.
  - *Expected*: `403 Forbidden` (Removed members cannot access old chat history anymore).

---

## 10. Flow 10: Tier Limits and Entitlement Enforcement (Step 13)

### Setup & Preconditions
- User A is registered and has `tier = FREE` (Effective Tier = `FREE`).
- User B is registered and has `tier = PREMIUM` with `tier_expires_at` set to a future date (Effective Tier = `PREMIUM`).
- User C is registered and has `tier = ULTRA` with `tier_expires_at` set to a past date (Effective Tier = `FREE`).

### 10.1. Retrieve Entitlements and Usage
- [ ] **Step 10.1**: Log in as User A and query entitlements (`GET /api/account/entitlements`).
  - *Expected*: `200 OK`. Returns `"tier": "FREE"`, `"effectiveTier": "FREE"`, `"tierExpiresAt": null`, and FREE limits bounds (e.g., `maxStorageBytes = 104857600`, `maxDocuments = 30`).
- [ ] **Step 10.2**: Log in as User B and query entitlements.
  - *Expected*: `200 OK`. Returns `"tier": "PREMIUM"`, `"effectiveTier": "PREMIUM"`, `"tierExpiresAt": [future ISO datetime with Z suffix, e.g. 2026-08-04T10:00:00Z]`, and PREMIUM limits bounds (e.g., `maxStorageBytes = 2147483648`, `maxDocuments = 500`).
- [ ] **Step 10.3**: Log in as User C (expired ULTRA user) and query entitlements.
  - *Expected*: `200 OK`. Returns `"tier": "ULTRA"`, `"effectiveTier": "FREE"`, `"tierExpiresAt": [past ISO datetime with Z suffix, e.g. 2026-07-04T10:00:00Z]`, and FREE limits bounds. (Verifies that expired paid tiers automatically fallback to FREE limits).
- [ ] **Step 10.4**: Log in as User A and query resource usage (`GET /api/account/usage`).
  - *Expected*: `200 OK`. Returns a structured summary detailing the `used`, `limit`, `remaining` (`max(limit - used, 0)`), `overLimit` (`used > limit`), and `overBy` (`max(used - limit, 0)`) count for storage, documents, folders, ownedGroups, activeShares, and dailyAiQuestions.

### 10.2. Document and Storage Quota Enforcement
- [ ] **Step 10.5**: While logged in as User A (FREE, already has 30 active + trashed documents), attempt to upload a new document.
  - *Expected*: `403 Forbidden` with error code `DOCUMENT_LIMIT_EXCEEDED` (soft-deleted files still consume quota).
- [ ] **Step 10.6**: Permanently delete a document from Trash, then attempt to upload a new document.
  - *Expected*: `200 OK`. Document is uploaded successfully (permanent deletion frees up document count quota).
- [ ] **Step 10.7**: Attempt to upload a document exceeding 10 MB in size as User A (FREE).
  - *Expected*: `400 Bad Request` with error code `FILE_SIZE_LIMIT_EXCEEDED` (Single file size exceeds max FREE limit).

### 10.3. Folder Subtree and Restoration Guard
- [ ] **Step 10.8**: User A (FREE) has a folder `F` in Trash containing 5 subfolders. Restoring `F` would cause the user's total folder count to reach 21 (exceeding FREE limit of 20). Attempt to restore Folder `F`.
  - *Expected*: `403 Forbidden` with error code `FOLDER_LIMIT_EXCEEDED` (folder restoration evaluates entire descendant tree count).
- [ ] **Step 10.9**: User A (FREE) has a folder tree with a depth of 2 in Trash. User A attempts to restore this folder tree under active Folder `G` (which has depth 2).
  - *Expected*: `400 Bad Request` with error code `FOLDER_DEPTH_LIMIT_EXCEEDED` (total restored depth would be 4, exceeding FREE limit of 3).

### 10.4. AI daily limits and Reservations
- [ ] **Step 10.10**: Log in as User A (FREE) and attempt to ask an AI question exceeding 500 characters.
  - *Expected*: `400 Bad Request` with error code `AI_QUESTION_CHARS_LIMIT_EXCEEDED`.
- [ ] **Step 10.11**: Log in as User A (FREE) and submit a valid question.
  - *Expected*:
    - Backend creates a reservation record in the database with status `RESERVED`.
    - If the mock AI provider completes successfully, the status changes to `CONFIRMED` and user's daily questions used count increments.
- [ ] **Step 10.12**: Log in as User A (FREE). Mock the AI provider to throw an exception, then submit a question.
  - *Expected*:
    - Backend creates a reservation with status `RESERVED`.
    - Upon provider error, the reservation transitions to status `RELEASED` and the daily questions quota block is freed.
- [ ] **Step 10.13**: Log in as User A (FREE). after having reached the daily limit of 5 questions. Attempt to ask another question.
  - *Expected*: `403 Forbidden` with error code `AI_QUOTA_EXCEEDED`.

---

## 11. Flow 11: VNPay Sandbox Monthly Payment Integration (Step 13B)

### Preconditions
- User A is registered with raw tier `FREE` (Effective Tier = `FREE`).
- User B is registered with raw tier `PREMIUM` (Effective Tier = `PREMIUM`).
- Configuration variable `payment.mock-enabled = true` on start.

### 11.1. Plan API and Mock Checkout Creation
- [ ] **Step 11.1**: Call `GET /api/payments/plans` to fetch all available plans.
  - *Expected*: Returns `200 OK` listing `FREE`, `PREMIUM_1_MONTH` (199,000 VND), and `ULTRA_1_MONTH` (399,000 VND) plans. Each paid plan has `purchasable: true` and `aiDailyLimit` populated.
- [ ] **Step 11.2**: Log in as User A, request mock checkout creation (`POST /api/payments/mock/create` with body `{"planCode": "PREMIUM_1_MONTH"}`).
  - *Expected*: Returns `200 OK` with order details. `paymentMethod` is `MOCK`, `paymentProvider` is `MOCK`, `status` is `PENDING`, and `paymentUrl` is `null`.
- [ ] **Step 11.3**: Call the VNPay checkout creation endpoint with an invalid bank code (`POST /api/payments/vnpay/create` with body `{"planCode": "PREMIUM_1_MONTH", "bankCode": "INVALID"}`).
  - *Expected*: Returns `400 Bad Request` with code `INVALID_BANK_CODE`.

### 11.2. Mock Checkout Processing Flow
- [ ] **Step 11.4**: Call mock success confirmation endpoint (`POST /api/payments/mock/{paymentId}/success`) for the created mock order.
  - *Expected*: Returns `200 OK`. Order status becomes `SUCCESS`, user's tier becomes `PREMIUM`, and `paidAt` is updated. User tier duration increases by 1 calendar month (`plusMonths(1)`).
- [ ] **Step 11.5**: Attempt to confirm success for the same order again.
  - *Expected*: Returns `409 Conflict` with error code `ORDER_NOT_PENDING` (idempotency safety).
- [ ] **Step 11.6**: Call `POST /api/payments/mock/{paymentId}/fail` or `/cancel` on a different pending mock order.
  - *Expected*: Returns `200 OK` with order status transitioning to `FAILED` or `CANCELLED`. User tier remains `FREE`.

### 11.3. VNPay Checkout Order Creation
- [ ] **Step 11.7**: Log in as User A, request VNPay sandbox checkout creation (`POST /api/payments/vnpay/create` with body `{"planCode": "ULTRA_1_MONTH", "bankCode": "NCB"}`).
  - *Expected*: Returns `200 OK` with `paymentMethod = 'VNPAY'`, `paymentProvider = 'VNPAY_SANDBOX'`, `status = 'PENDING'`, and a signed `paymentUrl` targeting the VNPay sandbox checkout gateway.
- [ ] **Step 11.8**: With the previous order still pending, call checkout creation again.
  - *Expected*: Returns `409 Conflict` with code `PAYMENT_ALREADY_PENDING` containing the pending order `paymentProvider` and `paymentUrl` in the response payload.
- [ ] **Step 11.9**: Attempt to call the mock success confirmation endpoint (`POST /api/payments/mock/{paymentId}/success`) on this VNPay sandbox order.
  - *Expected*: Returns `400 Bad Request` with code `MOCK_CONFIRM_NOT_ALLOWED`.

### 11.4. Dynamic Order Expiration and EXPIRED Pay Transition
- [ ] **Step 11.10**: Wait 15 minutes for the pending order `expiredAt` to pass. Query details (`GET /api/payments/{paymentId}`).
  - *Expected*: Order status dynamically transitions to `EXPIRED` in the database. Returns `200 OK` with status `EXPIRED` and `paymentUrl = null`.
- [ ] **Step 11.11**: Trigger VNPay callback IPN with `vnp_ResponseCode = '00'` and pay date **before/equal** to the order `expiredAt` on the `EXPIRED` order.
  - *Expected*: Returns `{"RspCode":"00","Message":"Confirm success"}`. Order status transitions from `EXPIRED` to `SUCCESS` and user's tier is upgraded (exactly once).
- [ ] **Step 11.12**: Trigger VNPay callback IPN with `vnp_ResponseCode = '00'` and pay date **after** the order `expiredAt` on the `EXPIRED` order.
  - *Expected*: Returns `{"RspCode":"00","Message":"Confirm success"}`. Order status transitions to `REVIEW_REQUIRED` with `reviewReason = 'PAY_DATE_AFTER_EXPIRY'`. Tier remains unchanged.

### 11.5. VNPay Return URL and IPN Verification
- [ ] **Step 11.13**: Request client-side return URL with a mutated checksum parameter (`GET /api/payments/vnpay/return?vnp_SecureHash=invalid...`).
  - *Expected*: Redirects to `{FRONTEND_PAYMENT_RESULT_URL}?error=payment_return_invalid`. No database updates occur.
- [ ] **Step 11.14**: Request client-side return URL with a valid signature.
  - *Expected*: Redirects to `{FRONTEND_PAYMENT_RESULT_URL}?paymentId={paymentId}`. Database is processed and updated (payment order finalized and user tier upgraded) if the callback is valid and the order is still processable. If already terminal, returns current state idempotently.
- [ ] **Step 11.15**: Trigger VNPay callback IPN with an invalid signature (`GET /api/payments/vnpay/ipn?vnp_SecureHash=invalid...`).
  - *Expected*: Returns IPN payload `{"RspCode":"97","Message":"Invalid signature"}` (internally throwing `INVALID_PAYMENT_SIGNATURE`). No database updates occur.
- [ ] **Step 11.16**: Trigger VNPay callback IPN with a mismatched transaction amount.
  - *Expected*: Returns IPN payload `{"RspCode":"04","Message":"Invalid amount"}` (internally throwing `PAYMENT_AMOUNT_MISMATCH`).
- [ ] **Step 11.17**: Log in as User B (PREMIUM). Trigger a late concurrent VNPay callback IPN for a lower target tier (e.g. PREMIUM order callback arriving after user has upgraded to ULTRA).
  - *Expected*: Returns `{"RspCode":"00","Message":"Confirm success"}`. Order becomes `REVIEW_REQUIRED` with `reviewReason = 'TARGET_TIER_LOWER_THAN_CURRENT_TIER'`. User tier remains `ULTRA`.
- [ ] **Step 11.18**: For demo purposes, reset the `REVIEW_REQUIRED` order back to `PENDING` by executing the manual SQL script on target `payment_id`:
  ```sql
  -- Manual Reset REVIEW_REQUIRED script for Demo (Step 11.18)
  -- Reset status to PENDING and extend expired_at by 15 minutes to allow re-testing
  UPDATE payment_orders
  SET status = 'PENDING',
      review_reason = NULL,
      review_required_at = NULL,
      expired_at = DATE_ADD(NOW(), INTERVAL 15 MINUTE)
  WHERE payment_id = <target_payment_id> AND status = 'REVIEW_REQUIRED';
  ```
  After resetting, trigger a normal successful IPN callback again.
  - *Expected*: Returns `{"RspCode":"00","Message":"Confirm success"}`. Order transitions to `SUCCESS`. User tier is upgraded, and the new expiration date is calculated and saved in UTC using `plusMonths(1)`.

### 11.6. Configuration Disabling
- [ ] **Step 11.19**: Set `payment.mock-enabled = false` in `application.properties`. Call a mock checkout processing endpoint.
  - *Expected*: Returns `400 Bad Request` with code `PAYMENT_PROVIDER_DISABLED`.

---

# 12. AI Learning Tools (Step 14 + Step A)

Provides demo and verification steps for AI study tools.

> **Step A scope update**: The AI Tools panel now exposes **only Quiz and Flashcard**.
> - **Summary** has been moved to the AI Q&A panel as a quick-action chip ("Summarize this document for me").
> - **View Extracted Text** button has been removed from the UI (backend API still available).
> - Backend Summary APIs remain functional; only the UI entry point changed.

### 12.1. Document Readiness and Permission Guards
- [ ] **Step 12.1**: Log in as User A (FREE). Open a document with extraction status `COMPLETED` and request Summary generation.
  - *Expected*: Request succeeds (returns `200 OK`) and displays study overview, key points, terms, and suggested review questions.
- [ ] **Step 12.2**: Attempt to request Summary generation on a document with extraction status `PENDING` or `PROCESSING`.
  - *Expected*: Returns `400 Bad Request` with code `DOCUMENT_NOT_READY_FOR_AI` (or `DOCUMENT_PROCESSING`). Button is disabled or shows processing warning.
- [ ] **Step 12.3**: Attempt to request Summary generation on a document with extraction status `FAILED`.
  - *Expected*: Returns `400 Bad Request` with code `DOCUMENT_PROCESS_FAILED`. System prompts the user to trigger document re-extraction.
- [ ] **Step 12.4**: Log in as User B. Try to trigger or view Summary/Quiz/Flashcard generation on User A's private document (`documentId`).
  - *Expected*: Returns `403 Forbidden` with code `DOCUMENT_ACCESS_DENIED`.
- [ ] **Step 12.5**: Log in as User B. Trigger Quiz generation on User A's `PUBLIC` (approved) or shared document.
  - *Expected*: Request succeeds, generating multiple-choice quiz questions.

### 12.2. Content Separation and Ownership
- [ ] **Step 12.6**: Log in as User A and query generated quiz sets (`GET /api/ai/documents/{documentId}/quiz-sets`) for the document User B generated a quiz for.
  - *Expected*: Returns `200 OK` with an empty array or does not list User B's generated quiz. User B's generated quiz belongs strictly to User B.
- [ ] **Step 12.7**: Attempt to query details of User B's generated quiz set directly (`GET /api/ai/quiz-sets/{quizSetId}`) using User A's credentials.
  - *Expected*: Returns `404 Not Found` with code `QUIZ_SET_NOT_FOUND`.

### 12.3. Summary Regeneration (Immutability)
- [ ] **Step 12.8**: Trigger Summary generation twice for the same document under User A.
  - *Expected*: Both requests succeed. Checking the `ai_summaries` database table shows two separate records created with distinct `summary_id`s. Querying `GET /api/ai/documents/{documentId}/summaries/latest` returns the latest success summary.

### 12.4. Multiple Choice Quizzes & Flashcards
- [ ] **Step 12.9**: Generate a Quiz Set. Inspect the questions and frontend page display.
  - *Expected*: Quiz consists only of multiple-choice questions. Each question has exactly 4 options (keys A, B, C, D). Frontend hides correct options/explanations until the user picks an option.
- [ ] **Step 12.10**: Generate a Flashcard Set. Flipping/clicking cards on the UI.
  - *Expected*: Each card contains `frontText` and `backText` based on the document. Clicking rotates the card to display the back face.

### 12.5. Quota Constraints & Validation Range Limits
- [ ] **Step 12.11**: As User A (FREE), request flashcard sets 3 times on the same calendar day.
  - *Expected*: First 2 requests succeed; the 3rd request returns `403 Forbidden` with code `FLASHCARD_QUOTA_EXCEEDED`.
- [ ] **Step 12.12**: As User A (FREE), request Quiz generation with `questionCount = 6`.
  - *Expected*: Returns `400 Bad Request` with code `INVALID_QUIZ_QUESTION_COUNT` (FREE max limit is 5).
- [ ] **Step 12.13**: As User A (FREE), request Quiz generation without specifying `questionCount` parameter.
  - *Expected*: Generates a quiz with exactly 5 questions (FREE default value).

### 12.6. Invalid AI JSON Recovery
- [ ] **Step 12.14**: Inject malformed JSON mockup in test harness to simulate AI response parsing failure.
  - *Expected*: Backend catches error, attempts a single retry call to AI model. If retry fails, returns `502 Bad Gateway` with code `AI_OUTPUT_INVALID` and does not deduct quota.

### 12.7. Feature Restriction Check
- [ ] **Step 12.15**: Verify that no UI options or backend API endpoints exist for editing summary key points, deleting individual flashcard sets, or deleting quiz sets.
  - *Expected*: No modification/deletion routes are registered. Step 14 features are read-only.

---

# 13. Step A — Community AI Flags & Group Email Invite

### 13.1. Community Document Permission Flags
- [ ] **Step 13.1**: Call `GET /api/documents/public/{id}` **without authentication** (no token).
  - *Expected*: Response contains `canUseAiTools: false`, `canProcess: false`, `canReprocess: false`.
- [ ] **Step 13.2**: Call `GET /api/documents/public/{id}` **authenticated as a non-owner** for a document with `processingStatus: COMPLETED`.
  - *Expected*: `canUseAiTools: true`, `canProcess: false`, `canReprocess: false`.
- [ ] **Step 13.3**: Call `GET /api/documents/public/{id}` **authenticated as the owner** for a document with `processingStatus: COMPLETED`.
  - *Expected*: `canUseAiTools: true`, `canProcess: false`, `canReprocess: true`.
- [ ] **Step 13.4**: Call `GET /api/documents/public/{id}` **authenticated as the owner** for a document with `processingStatus: PENDING`.
  - *Expected*: `canUseAiTools: false`, `canProcess: true`, `canReprocess: false`.
- [ ] **Step 13.5**: Call `POST /api/documents/{id}/process` as a **non-owner** of the document.
  - *Expected*: Returns `403 Forbidden` with `code: DOCUMENT_PROCESS_FORBIDDEN`.

### 13.2. Group Email Invite
- [ ] **Step 13.6**: As group **owner**, call `POST /api/groups/{id}/invites/email` with a valid email.
  - *Expected*: Returns `200 OK` with `inviteCode` and `joinUrl`. Invite email sent to the address.
- [ ] **Step 13.7**: As group **member (non-owner)**, call `POST /api/groups/{id}/invites/email`.
  - *Expected*: Returns `403 Forbidden` with `code: GROUP_INVITE_FORBIDDEN`.
- [ ] **Step 13.8**: As group **owner**, invite the email of a user who is **already an ACTIVE member**.
  - *Expected*: Returns `400 Bad Request` with `code: GROUP_MEMBER_ALREADY_EXISTS`.
- [ ] **Step 13.9**: As group owner, invite with an **invalid email format** (e.g. `notanemail`).
  - *Expected*: Returns `400 Bad Request` (validation error).
- [ ] **Step 13.10**: Check the `joinUrl` in the response contains the group's `inviteCode` as a query param.
  - *Expected*: URL format: `{FRONTEND_BASE_URL}/frontend/groups.html?inviteCode=XXXXXXXX`.

## 14. Step 15A - Admin Security, Dashboard & Public Document Moderation (BE3)

### 14.1. Admin Security & Access Control
- [ ] **Step 14.1**: Call any admin API (e.g. `GET /api/admin/dashboard/summary`) **without authentication** (no token).
  - *Expected*: Returns `401 Unauthorized`.
- [ ] **Step 14.2**: Call any admin API (e.g. `GET /api/admin/dashboard/summary`) **authenticated as a standard USER**.
  - *Expected*: Returns `403 Forbidden`.
- [ ] **Step 14.3**: Call any admin API (e.g. `GET /api/admin/dashboard/summary`) **authenticated as an ADMIN**.
  - *Expected*: Returns `200 OK` with data.

### 14.2. Admin Dashboard summary
- [ ] **Step 14.4**: Call `GET /api/admin/dashboard/summary` as an **ADMIN**.
  - *Expected*: Returns `totalUsers`, `totalDocuments`, `pendingPublicDocuments`, `totalRevenue`, `successfulPayments`, `aiRequestsToday`, `aiRequestsThisMonth`, `usersByTier`, `documentsByApprovalStatus`, `revenueByMonth`, and `aiUsageByFeature`.
  - *Rule Check*: Verify that `totalRevenue` only sums successful payments (excluding PENDING, FAILED, etc.).
  - *Rule Check*: Verify that user tier and document approval states match their current DB values.

### 14.3. Public Document Moderation
- [ ] **Step 14.5**: Call `GET /api/admin/documents/public` with pagination and filters (search, subject, fileType).
  - *Expected*: Returns list of public documents matching filters with pagination controls.
- [ ] **Step 14.6**: Approve a pending public document: `PATCH /api/admin/documents/{id}/approve`.
  - *Expected*: `approvalStatus` updates to `APPROVED` and `publishedAt` is set to UTC now. The document now displays in the Community Library.
- [ ] **Step 14.7**: Reject a pending public document: `PATCH /api/admin/documents/{id}/reject`.
  - *Expected*: `approvalStatus` updates to `REJECTED`. The document does not display in Community Library, but its DB record and original file are not deleted.
- [ ] **Step 14.8**: Unpublish an approved public document: `PATCH /api/admin/documents/{id}/unpublish`.
  - *Expected*: `visibility` updates to `PRIVATE`. The document is hidden from the Community Library but remains intact in the DB.

### 14.4. Excel Export
- [ ] **Step 14.9**: Export public documents: `GET /api/admin/documents/public/export`.
  - *Expected*: Downloads a valid Excel spreadsheet (`public_documents.xlsx`) containing ID, title, owner, subject, counts, status, and dates. Verify that sensitive data is not exposed.

## 15. Step 15B - Admin Separation + Dashboard + Plan Config (BE3)

### 15.1. Authentication Block for Blocked Users
- [ ] **Step 15.1**: Call `POST /api/auth/login` using the credentials of a `BLOCKED` user account.
  - *Expected*: Returns `403 Forbidden` with `"code": "AUTH_ACCOUNT_BLOCKED"`.
- [ ] **Step 15.2**: Send any API request using an active session cookie of a user who has just been set to `BLOCKED` in the DB.
  - *Expected*: Returns `403 Forbidden` with `"code": "AUTH_ACCOUNT_BLOCKED"`.

### 15.2. Admin & User Workspace Separation
- [ ] **Step 15.3**: Authenticate as `ADMIN` and call any standard User workspace endpoint (e.g. upload personal doc: `POST /api/documents/upload`, create folder: `POST /api/folders`, or AI Q&A: `POST /api/ai/ask`).
  - *Expected*: Returns `403 Forbidden` with access denied.
- [ ] **Step 15.4**: Authenticate as `USER` and call any Admin API endpoint (e.g. `GET /api/admin/plans`).
  - *Expected*: Returns `403 Forbidden`.

### 15.3. Plan Configuration Management CRUD & DB limits check
- [ ] **Step 15.5**: Authenticate as `ADMIN` and retrieve all plan configurations: `GET /api/admin/plans`.
  - *Expected*: Returns list of seeded plans (`FREE`, `PREMIUM_1_MONTH`, `ULTRA_1_MONTH`) with pricing and quotas.
- [ ] **Step 15.6**: Update PREMIUM plan config (e.g. price to 249000, AI limit to 60): `PUT /api/admin/plans/PREMIUM_1_MONTH`.
  - *Expected*: Returns `200 OK` with updated configurations.
- [ ] **Step 15.7**: Query current limits for a Premium user: `GET /api/auth/me`.
  - *Expected*: AI Daily limit shows `60` instead of the old `50` limit.
- [ ] **Step 15.8**: Deactivate a plan config: `PATCH /api/admin/plans/ULTRA_1_MONTH/status?status=INACTIVE`.
  - *Expected*: Returns `200 OK`. The status updates to `INACTIVE`.
- [ ] **Step 15.9**: Call `GET /api/payments/plans` as a standard user.
  - *Expected*: The `ULTRA_1_MONTH` plan is excluded from the list.

### 15.4. Payment Order Snapshot Verification
- [ ] **Step 15.10**: Create a payment order for PREMIUM plan: `POST /api/payments/checkout/PREMIUM_1_MONTH`.
  - *Expected*: Returns payment URL and logs `amount`, `planName`, and `billingLabel` snapshot fields in `PaymentOrder` entity in DB.
- [ ] **Step 15.11**: As ADMIN, update the price of PREMIUM plan config in the database (e.g. to 299000).
- [ ] **Step 15.12**: Complete/Confirm the previously created checkout transaction.
  - *Expected*: The IPN matches amount against the snapshot amount (199000) instead of the new price (299000). Payment succeeds and user tier upgrades to PREMIUM based on the duration snapshot (1 month).

### 15.5. Export Plan Configurations to Excel
- [ ] **Step 15.13**: As ADMIN, export plan configurations: `GET /api/admin/plans/export`.
  - *Expected*: Downloads a valid Excel spreadsheet (`plans_configuration.xlsx`) containing all database fields of the plans.

