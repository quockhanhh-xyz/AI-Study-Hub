# Tier & Entitlement Test Cases - Step 13

This document defines the backend validation, database migration, and entitlement enforcement test cases for the Tier & Entitlement Foundation.

---

## 1. Database Migration and Schema Enforcement

### 1.1. Migration & Backfill Checks

| TC | Scenario | Action | Expected Behavior |
|---|---|---|---|
| TC-TIER-001 | Flyway Migration | Run SQL script `V13__tier_entitlement.sql` | - Column `tier_expires_at` is added to `users` table.<br>- Table `ai_usage_reservations` is created with unique request constraints and indexes.<br>- Passes without breaking existing data records. |
| TC-TIER-002 | FREE User Expiration | Query newly migrated or registered FREE user | `tier_expires_at` must be `NULL` by default. |
| TC-TIER-003 | PREMIUM User Backfill | Query existing PREMIUM users after migration | `tier_expires_at` is backfilled to a future date (e.g., `NOW() + 30 days`), preserving their PREMIUM membership. |

### 1.2. Effective Tier Expiration Checks

| TC | User Tier | `tier_expires_at` Configuration | Expected Effective Tier | Behavior |
|---|---|---|---|---|
| TC-TIER-004 | `PREMIUM` | Null (or in the future, e.g. `NOW() + 1 hour`) | `PREMIUM` | Access to PREMIUM resources is allowed. |
| TC-TIER-005 | `PREMIUM` | Past timestamp (e.g., `NOW() - 1 minute`) | `FREE` | Automatically falls back to FREE tier rules. |
| TC-TIER-006 | `ULTRA` | Null (or in the future, e.g. `NOW() + 5 days`) | `ULTRA` | Access to ULTRA resources is allowed. |
| TC-TIER-007 | `ULTRA` | Past timestamp (e.g., `NOW() - 10 minutes`) | `FREE` | Automatically falls back to FREE tier rules. |

---

## 2. Resource Boundary and Quota Enforcement

### 2.1. File Size Limits (Boundary Checking)

| TC | Effective Tier | File Size Uploaded | Expected HTTP | Expected Action |
|---|---|---|---|---|
| TC-TIER-010 | FREE | 10 MB (`10,485,760` bytes) | 200 OK | File upload is accepted. |
| TC-TIER-011 | FREE | 10 MB + 1 byte (`10,485,761` bytes) | 400 Bad Request | Blocked with code `QUOTA_FILE_SIZE_EXCEEDED`. |
| TC-TIER-012 | PREMIUM | 50 MB (`52,428,800` bytes) | 200 OK | File upload is accepted. |
| TC-TIER-013 | PREMIUM | 50 MB + 1 byte (`52,428,801` bytes) | 400 Bad Request | Blocked with code `QUOTA_FILE_SIZE_EXCEEDED`. |

### 2.2. Documents Count & Storage Boundary Limits

| TC | Effective Tier | Current Document Count / Size | Action | Expected HTTP | Expected Behavior |
|---|---|---|---|---|---|
| TC-TIER-020 | FREE | 29 active documents, total size 90MB | Upload 1MB file | 200 OK | Upload accepted. |
| TC-TIER-021 | FREE | 30 active documents, total size 90MB | Upload 1MB file | 403 Forbidden | Blocked with code `QUOTA_DOCUMENTS_EXCEEDED`. |
| TC-TIER-022 | FREE | 10 active documents, total size 99.5MB | Upload 1MB file | 403 Forbidden | Blocked with code `QUOTA_STORAGE_EXCEEDED` (even though documents count limit is not reached). |
| TC-TIER-023 | FREE | 30 active documents, total size 90MB | Move 1 active document to Trash; then upload 1MB file | 403 Forbidden | Blocked with code `QUOTA_DOCUMENTS_EXCEEDED` (soft-deleted files in Trash still count towards the quota). |
| TC-TIER-024 | FREE | 30 documents (some active, some in Trash) | Permanently delete 1 document from Trash; then upload 1MB file | 200 OK | Upload accepted (permanent deletion releases quota). |

### 2.3. Folder Restore & Depth Limit Check

| TC | Effective Tier | Subtree Configuration | Action | Expected HTTP | Expected Behavior |
|---|---|---|---|---|---|
| TC-TIER-030 | FREE | Folder `F` in Trash contains 5 subfolders and 3 documents | Restore Folder `F` when user has 18 folders and 28 documents | 403 Forbidden | Blocked with code `QUOTA_FOLDERS_EXCEEDED` or `QUOTA_DOCUMENTS_EXCEEDED`. The entire descendant tree is evaluated before permitting restore. |
| TC-TIER-031 | FREE | Folder `F` in Trash has depth of 2. User attempts to restore under Folder `G` (depth 2) | Restore Folder `F` under `G` | 400 Bad Request | Blocked with code `QUOTA_DEPTH_EXCEEDED` (cumulative depth of restored tree `2 + 2 = 4` levels exceeds FREE limit of 3). |

---

## 3. AI daily Usage & Reservations

### 3.1. Question Length and Selector Enforcement

| TC | Effective Tier | Question Payload | Expected HTTP | Expected Action |
|---|---|---|---|---|
| TC-TIER-040 | FREE | 500 characters | 200 OK | Sent to `gemini-1.5-flash` model. |
| TC-TIER-041 | FREE | 501 characters | 400 Bad Request | Blocked with code `QUOTA_AI_QUESTION_CHARS_EXCEEDED`. |
| TC-TIER-042 | PREMIUM | 2,000 characters | 200 OK | Sent to `gemini-1.5-pro` model. |
| TC-TIER-043 | PREMIUM | 2,001 characters | 400 Bad Request | Blocked with code `QUOTA_AI_QUESTION_CHARS_EXCEEDED`. |

### 3.2. AI Reservation State Transitions

| TC | Initial State | AI Provider Outcome | Expected Final Reservation Status | Quota Effect |
|---|---|---|---|---|
| TC-TIER-050 | User submits Q&A | AI API call initiated | `RESERVED` | Temporarily decrements remaining questions quota. |
| TC-TIER-051 | `RESERVED` | AI call returns success (200) | `CONFIRMED` | Confirmed as a permanent daily count decrement. |
| TC-TIER-052 | `RESERVED` | AI Provider throws exception (e.g. timeout) | `RELEASED` | Daily quota decrement is reversed immediately. |
| TC-TIER-053 | `RESERVED` | No provider response, time exceeds 60s | Expired in DB | Ignored in active daily quota counts, freeing up the slot. |

---

## 4. Entitlements and Usage API Integration

### 4.1. Account Entitlements Endpoint (GET /api/account/entitlements)

| TC | Scenario | Expected HTTP | Expected JSON Payload |
|---|---|---|---|
| TC-TIER-060 | Authenticated request (Effective Tier = PREMIUM) | 200 OK | Returns `"tier": "PREMIUM"`, `"effectiveTier": "PREMIUM"`, valid `tierExpiresAt` date, and correct max limit bounds matching the PREMIUM policy. |
| TC-TIER-061 | Unauthenticated request | 401 Unauthorized | Returns `{"success":false,"message":"Unauthorized"}`. |

### 4.2. Usage Statistics Endpoint (GET /api/account/usage)

| TC | Scenario | Expected HTTP | Expected JSON Payload |
|---|---|---|---|
| TC-TIER-070 | Authenticated request (FREE user with 2 documents, 4.5MB space used) | 200 OK | Returns used, limit, and remaining counters for `storage` (used: `4718592`, limit: `104857600`), `documents` (used: 2, limit: 30), and other stats correctly. |
