# Test Cases - AI Document Processing Foundation (Step 9)

This document defines the test suite validating the backend AI document processing foundation.

## 1. Status Transitions & Concurrency

### TC-IP-01: Upload metadata auto-creation
- **Objective**: Verify that uploading a new document successfully creates an associated `DocumentContent` record in `PENDING` state.
- **Action**: Call `POST /api/documents/upload` with a valid text file.
- **Expected**:
  - HTTP 200 OK.
  - A `document_contents` record exists for the new document.
  - Status is `PENDING`.
  - Character, word, and chunk counts are 0.

### TC-IP-02: Normal processing transition
- **Objective**: Verify that requesting processing transitions the status to `PROCESSING` and triggers background execution.
- **Action**: Call `POST /api/documents/{id}/process` on a `PENDING` document.
- **Expected**:
  - HTTP 202 Accepted.
  - Response shows `processingStatus: PROCESSING`.
  - Database row status is `PROCESSING`.
  - Background worker is triggered.

### TC-IP-03: Concurrency protection (409 Conflict)
- **Objective**: Verify that concurrent processing requests for the same document are rejected.
- **Action**: Issue two simultaneous `POST /api/documents/{id}/process` requests.
- **Expected**:
  - First request succeeds with HTTP 202.
  - Second request fails with HTTP 409 Conflict ("Document is already being processed").

### TC-IP-04: Process on COMPLETED document rejection
- **Objective**: Verify that `/process` cannot be called on an already completed document.
- **Action**: Call `POST /api/documents/{id}/process` when status is `COMPLETED`.
- **Expected**:
  - HTTP 409 Conflict ("Document is already processed. Use reprocess instead.").

---

## 2. Text Extraction & Chunking Outcomes

### TC-IP-05: Successful text extraction and chunking
- **Objective**: Verify that a successful parsing worker execution populates content and chunks correctly.
- **Action**: Let the worker finish extraction on a TXT file.
- **Expected**:
  - Status transitions to `COMPLETED`.
  - `extracted_text` in DB is populated.
  - Word count, character count, and timestamps are recorded.
  - Corresponding `document_chunks` rows are saved, ordered by `chunk_index` starting from 0.

### TC-IP-06: Unsupported file format detection
- **Objective**: Verify that the worker marks the document as `UNSUPPORTED` for unsupported files.
- **Action**: Upload a PPTX file and trigger processing.
- **Expected**:
  - Polling or status query returns `UNSUPPORTED`.
  - No chunks are saved.

### TC-IP-07: Empty file text parsing
- **Objective**: Verify that files containing no text transition to `EMPTY_CONTENT`.
- **Action**: Upload a file that yields no text (e.g. empty txt file) and trigger processing.
- **Expected**:
  - Status transitions to `EMPTY_CONTENT`.

---

## 3. Reprocessing & Rollbacks

### TC-IP-08: Safe reprocessing success
- **Objective**: Verify that reprocessing a completed document successfully cleans old chunks and inserts new ones.
- **Action**: Call `POST /api/documents/{id}/reprocess` on a `COMPLETED` document, then complete extraction.
- **Expected**:
  - Old chunks are fully deleted.
  - New chunks are saved.
  - Status returns to `COMPLETED`.

### TC-IP-09: Reprocess failure rollback preservation
- **Objective**: Verify that if reprocessing fails, the previous successful snapshot is kept intact.
- **Action**: Call `POST /api/documents/{id}/reprocess` on a `COMPLETED` document, and trigger an extraction error.
- **Expected**:
  - Previous successful `extracted_text` and chunks are preserved.
  - `processingStatus` stays or reverts to `COMPLETED`.
  - `lastAttemptStatus` is set to `FAILED`.
  - `lastAttemptError` contains the error message.

---

## 4. Permissions & Security Matrix

### TC-IP-10: Triggering operations authorization
- **Objective**: Verify that only the document owner can trigger processing or reprocessing.
- **Action**: Call `POST /api/documents/{id}/process` as a shared user.
- **Expected**:
  - HTTP 403 Forbidden.

### TC-IP-11: Full content access restriction
- **Objective**: Verify that only the owner can fetch full extracted content.
- **Action**: Call `GET /api/documents/{id}/content` as a shared user or group member.
- **Expected**:
  - HTTP 403 Forbidden.

### TC-IP-12: Processing status access
- **Objective**: Verify that direct shared users and active group members can check processing status.
- **Action**: Call `GET /api/documents/{id}/processing-status` as a shared user/group member.
- **Expected**:
  - HTTP 200 OK returning the processing status.

---

## 5. Lifecycle, Stale Jobs & N+1 Queries

### TC-IP-13: Trash state enforcement
- **Objective**: Verify that moving a document to trash blocks processing and content queries.
- **Action**: Soft-delete a document (move to Trash), then attempt `/process` or `/content`.
- **Expected**:
  - HTTP 404 Not Found (or 403 / hidden resource block).

### TC-IP-14: Permanent deletion cascade
- **Objective**: Verify that permanent deletion cascade-deletes content and chunks.
- **Action**: Permanently delete a document.
- **Expected**:
  - `document_contents` and `document_chunks` rows with that `document_id` are completely removed from DB.

### TC-IP-15: Stale PROCESSING job recovery
- **Objective**: Verify that processing tasks stuck in `PROCESSING` for more than 10 minutes are recovered.
- **Action**: Call `/processing-status` on a document with `PROCESSING` status where `processing_started_at` is > 10 minutes ago.
- **Expected**:
  - The check recovers the state: status is changed to `FAILED` with an interrupted error message.
