# Tier & Entitlement Test Cases - Step 13

This document defines the backend validation, database migration, and entitlement enforcement test cases for the Tier & Entitlement Foundation.

---

## 1. Database Migration and Schema Enforcement

### 1.1. Migration & Backfill Checks

| TC | Scenario | Action | Expected Behavior |
|---|---|---|---|
| TC-TIER-001 | Manual SQL Migration | Run SQL script `V13__tier_entitlement.sql` | - Column `tier_expires_at` is added to `users` table.<br>- Column `tier` type is modified to `VARCHAR(20) NOT NULL DEFAULT 'FREE'`.<br>- Table `ai_usage_reservations` is created with unique request constraints and indexes.<br>- Passes without breaking existing data records. |
| TC-TIER-002 | String to Enum UserTier Check | Attempt to load existing users with string values 'FREE' or 'PREMIUM' into Hibernate User entity using new `UserTier` Enum | Legacy string values map correctly to Enum constants `UserTier.FREE` and `UserTier.PREMIUM` without throwing mapping exceptions. |
| TC-TIER-003 | FREE User Expiration | Query newly migrated or registered FREE user | `tier_expires_at` must be `NULL` by default. |
| TC-TIER-004 | PREMIUM User Backfill | Query existing PREMIUM users after migration | `tier_expires_at` is backfilled to a future date (UTC-based) using `DATE_ADD(UTC_TIMESTAMP(), INTERVAL 30 DAY)`, preserving active paid status. |

### 1.2. Effective Tier Expiration Checks

| TC | User Tier | `tier_expires_at` Configuration | Expected Effective Tier | Behavior |
|---|---|---|---|---|
| TC-TIER-005 | `PREMIUM` | Null | `FREE` | **Null Expiry Resolved to FREE**: Users with paid tier but NULL expiration dates are treated as expired to prevent permanent free upgrades. |
| TC-TIER-006 | `PREMIUM` | Future UTC timestamp (e.g. `UTC_TIMESTAMP() + 1 hour`) | `PREMIUM` | Active status verified; access to PREMIUM resources is allowed. |
| TC-TIER-007 | `PREMIUM` | Past UTC timestamp (e.g., `UTC_TIMESTAMP() - 1 minute`) | `FREE` | Automatically falls back to FREE tier rules. |
| TC-TIER-008 | `ULTRA` | Null | `FREE` | Reverts to `FREE` effective tier. |
| TC-TIER-009 | `ULTRA` | Future UTC timestamp (e.g. `UTC_TIMESTAMP() + 5 days`) | `ULTRA` | Active status verified; access to ULTRA resources is allowed. |
| TC-TIER-010 | `ULTRA` | Past UTC timestamp (e.g., `UTC_TIMESTAMP() - 10 minutes`) | `FREE` | Automatically falls back to FREE tier rules. |

---

## 2. Resource Boundary and Quota Enforcement

### 2.1. File Size Limits (Boundary Checking)

| TC | Effective Tier | File Size Uploaded | Expected HTTP | Expected Action / Error Code |
|---|---|---|---|---|
| TC-TIER-011 | FREE | 10 MB (`10,485,760` bytes) | 200 OK | File upload is accepted. |
| TC-TIER-012 | FREE | 10 MB + 1 byte (`10,485,761` bytes) | 400 Bad Request | Blocked with code `FILE_SIZE_LIMIT_EXCEEDED`. |
| TC-TIER-013 | PREMIUM | 50 MB (`52,428,800` bytes) | 200 OK | File upload is accepted. |
| TC-TIER-014 | PREMIUM | 50 MB + 1 byte (`52,428,801` bytes) | 400 Bad Request | Blocked with code `FILE_SIZE_LIMIT_EXCEEDED`. |
| TC-TIER-015 | ULTRA | 100 MB (`104,857,600` bytes) | 200 OK | File upload is accepted. |
| TC-TIER-016 | ULTRA | 100 MB + 1 byte (`104,857,601` bytes) | 400 Bad Request | Blocked with code `FILE_SIZE_LIMIT_EXCEEDED`. |

### 2.2. Owned Groups & Members Quotas

| TC | Effective Tier | Current Groups / Members count | Action | Expected HTTP | Expected Action / Error Code |
|---|---|---|---|---|---|
| TC-TIER-020 | FREE | Owns 3 active study groups | Create new study group | 403 Forbidden | Blocked with code `GROUP_LIMIT_EXCEEDED`. |
| TC-TIER-021 | FREE | Group has 10 members | Invite or add member to group | 403 Forbidden | Blocked with code `GROUP_MEMBER_LIMIT_EXCEEDED`. |
| TC-TIER-022 | PREMIUM | Owns 30 active study groups | Create new study group | 403 Forbidden | Blocked with code `GROUP_LIMIT_EXCEEDED`. |
| TC-TIER-023 | PREMIUM | Group has 100 members | Invite or add member to group | 403 Forbidden | Blocked with code `GROUP_MEMBER_LIMIT_EXCEEDED`. |
| TC-TIER-024 | ULTRA | Owns 100 active study groups | Create new study group | 403 Forbidden | Blocked with code `GROUP_LIMIT_EXCEEDED`. |
| TC-TIER-025 | ULTRA | Group has 300 members | Invite or add member to group | 403 Forbidden | Blocked with code `GROUP_MEMBER_LIMIT_EXCEEDED`. |

### 2.3. Active Share Limits (Covers 4 active share types)

| TC | Effective Tier | Current Active Shares | Action | Expected HTTP | Expected Action / Error Code |
|---|---|---|---|---|---|
| TC-TIER-030 | FREE | 30 active shares (combination of direct document shares, group document shares, direct folder shares, and group folder shares) | Share another resource | 403 Forbidden | Blocked with code `SHARE_LIMIT_EXCEEDED`. |
| TC-TIER-031 | PREMIUM | 1,000 active shares | Share another resource | 403 Forbidden | Blocked with code `SHARE_LIMIT_EXCEEDED`. |
| TC-TIER-032 | ULTRA | 5,000 active shares | Share another resource | 403 Forbidden | Blocked with code `SHARE_LIMIT_EXCEEDED`. |

### 2.4. Documents Count & Storage Limits

| TC | Effective Tier | Current Document Count / Size | Action | Expected HTTP | Expected Behavior / Error Code |
|---|---|---|---|---|---|
| TC-TIER-033 | FREE | 30 active documents | Upload 1MB file | 403 Forbidden | Blocked with code `DOCUMENT_LIMIT_EXCEEDED`. |
| TC-TIER-034 | FREE | 10 active documents, total size 99.5MB | Upload 1MB file | 403 Forbidden | Blocked with code `STORAGE_LIMIT_EXCEEDED`. |
| TC-TIER-035 | FREE | 30 active documents, total size 90MB | Move 1 active document to Trash; then upload 1MB file | 403 Forbidden | Blocked with code `DOCUMENT_LIMIT_EXCEEDED` (soft-deleted files in Trash still count towards the limit). |
| TC-TIER-036 | FREE | 30 documents (some active, some in Trash) | Permanently delete 1 document from Trash; then upload 1MB file | 200 OK | Upload accepted (permanent deletion releases quota). |

### 2.5. Folder Restore & Depth Limit Check

| TC | Effective Tier | Subtree Configuration | Action | Expected HTTP | Expected Behavior / Error Code |
|---|---|---|---|---|---|
| TC-TIER-040 | FREE | Folder `F` in Trash contains 5 subfolders and 3 documents | Restore Folder `F` when user has 18 folders and 28 documents | 403 Forbidden | Blocked with code `FOLDER_LIMIT_EXCEEDED` or `DOCUMENT_LIMIT_EXCEEDED`. The entire descendant tree is evaluated before permitting restore. |
| TC-TIER-041 | FREE | Folder `F` in Trash has depth of 2. User attempts to restore under Folder `G` (depth 2) | Restore Folder `F` under `G` | 400 Bad Request | Blocked with code `FOLDER_DEPTH_LIMIT_EXCEEDED` (cumulative depth of restored tree `2 + 2 = 4` levels exceeds FREE limit of 3). |

### 2.6. Cloudinary Cleanup on DB Save Failure

| TC | Effective Tier | Current State | Action | Expected Behavior |
|---|---|---|---|---|
| TC-TIER-045 | FREE | 30 documents uploaded | Upload a valid 1MB file. The file is uploaded to Cloudinary, but when saving metadata to MySQL DB, quota limit check fails. | - DB transaction rolls back.<br>- Backend catches exception and calls Cloudinary SDK to immediately delete/destroy the uploaded file by public ID.<br>- Storage quota is not occupied. |

### 2.7. Concurrency Protection Tests

| TC | Action | Concurrent Requests | Expected Outcome |
|---|---|---|---|
| TC-TIER-046 | Concurrent Folder Creation | Submit 5 concurrent folder creation requests for a FREE user with 19 active folders. | Exactly 1 folder creation succeeds, other 4 requests fail with `FOLDER_LIMIT_EXCEEDED` (403). |
| TC-TIER-047 | Concurrent Document Uploads | Submit 3 concurrent document uploads for a FREE user with 29 active documents. | Exactly 1 upload succeeds, other 2 requests roll back and trigger Cloudinary file deletion; returns `DOCUMENT_LIMIT_EXCEEDED` (403). |
| TC-TIER-048 | Concurrent Group Creation | Submit 4 concurrent group creation requests for a FREE user with 2 active groups. | Exactly 1 group succeeds, other 3 requests fail with `GROUP_LIMIT_EXCEEDED` (403). |
| TC-TIER-049 | Concurrent Group Joins | Submit 5 concurrent group join requests to a group that has 9 members. | Exactly 1 join succeeds, other 4 requests fail with `GROUP_MEMBER_LIMIT_EXCEEDED` (403). |
| TC-TIER-050 | Concurrent Share Creation | Submit 3 concurrent share creation requests for a FREE user with 29 active shares. | Exactly 1 share succeeds, other 2 requests fail with `SHARE_LIMIT_EXCEEDED` (403). |
| TC-TIER-051 | Concurrent AI Questions | Submit 3 concurrent AI question requests for a FREE user who has asked 4 questions. | Exactly 1 question is successfully reserved and resolved; other 2 requests fail with `AI_QUOTA_EXCEEDED` (403). |

---

## 3. AI daily Usage & Reservations

### 3.1. Question Length and Selector Enforcement

| TC | Effective Tier | Question Payload | Expected Model Route | Expected HTTP | Expected Action / Error Code |
|---|---|---|---|---|---|
| TC-TIER-052 | FREE | 500 characters | `gemini-2.5-flash-lite` | 200 OK | Question resolved via `DefaultAiModelSelector` calling `TierPolicyService`. |
| TC-TIER-053 | FREE | 501 characters | - | 400 Bad Request | Blocked with code `AI_QUESTION_CHARS_LIMIT_EXCEEDED`. |
| TC-TIER-054 | PREMIUM | 2,000 characters | `gemini-2.5-flash` | 200 OK | Question resolved via `DefaultAiModelSelector` calling `TierPolicyService`. |
| TC-TIER-055 | PREMIUM | 2,001 characters | - | 400 Bad Request | Blocked with code `AI_QUESTION_CHARS_LIMIT_EXCEEDED`. |
| TC-TIER-056 | ULTRA | 5,000 characters | `gemini-2.5-flash` | 200 OK | Question resolved via `DefaultAiModelSelector` calling `TierPolicyService`. |
| TC-TIER-057 | ULTRA | 5,001 characters | - | 400 Bad Request | Blocked with code `AI_QUESTION_CHARS_LIMIT_EXCEEDED`. |

### 3.2. Detailed AI limit boundaries

| TC | Effective Tier | Limit Type | Quota Configuration | Action | Expected Outcome |
|---|---|---|---|---|---|
| TC-TIER-060 | FREE | AI Chat Sessions | 3 sessions owned | Create 4th chat session | Blocked with `AI_SESSIONS_LIMIT_EXCEEDED` (403). |
| TC-TIER-061 | FREE | Messages/Session | 30 messages in session | Send 31st message | Blocked with `SESSION_MESSAGES_LIMIT_EXCEEDED` (403). |
| TC-TIER-062 | FREE | Summary quota | 3 summaries/day | Request 4th summary | Blocked with `SUMMARY_QUOTA_EXCEEDED` (403). |
| TC-TIER-063 | FREE | Flashcard quota | 2 card sets/day | Create 3rd card set | Blocked with `FLASHCARD_QUOTA_EXCEEDED` (403). |
| TC-TIER-064 | FREE | Quiz quota | 2 quiz sets/day | Create 3rd quiz set | Blocked with `QUIZ_QUOTA_EXCEEDED` (403). |
| TC-TIER-065 | FREE | Items per set | 5 items in set | Add 6th item to set | Blocked with `ITEM_LIMIT_EXCEEDED` (400). |
| TC-TIER-066 | PREMIUM | AI Chat Sessions | 30 sessions owned | Create 31st chat session | Blocked with `AI_SESSIONS_LIMIT_EXCEEDED` (403). |
| TC-TIER-067 | PREMIUM | Messages/Session | 300 messages in session | Send 301st message | Blocked with `SESSION_MESSAGES_LIMIT_EXCEEDED` (403). |
| TC-TIER-068 | PREMIUM | Summary quota | 20 summaries/day | Request 21st summary | Blocked with `SUMMARY_QUOTA_EXCEEDED` (403). |
| TC-TIER-069 | PREMIUM | Flashcard quota | 15 card sets/day | Create 16th card set | Blocked with `FLASHCARD_QUOTA_EXCEEDED` (403). |
| TC-TIER-070 | PREMIUM | Quiz quota | 15 quiz sets/day | Create 16th quiz set | Blocked with `QUIZ_QUOTA_EXCEEDED` (403). |
| TC-TIER-071 | PREMIUM | Items per set | 15 items in set | Add 16th item to set | Blocked with `ITEM_LIMIT_EXCEEDED` (400). |
| TC-TIER-072 | ULTRA | AI Chat Sessions | 100 sessions owned | Create 101st chat session | Blocked with `AI_SESSIONS_LIMIT_EXCEEDED` (403). |
| TC-TIER-073 | ULTRA | Messages/Session | 1000 messages in session | Send 1001st message | Blocked with `SESSION_MESSAGES_LIMIT_EXCEEDED` (403). |
| TC-TIER-074 | ULTRA | Summary quota | 50 summaries/day | Request 51st summary | Blocked with `SUMMARY_QUOTA_EXCEEDED` (403). |
| TC-TIER-075 | ULTRA | Flashcard quota | 40 card sets/day | Create 41st card set | Blocked with `FLASHCARD_QUOTA_EXCEEDED` (403). |
| TC-TIER-076 | ULTRA | Quiz quota | 40 quiz sets/day | Create 41st quiz set | Blocked with `QUIZ_QUOTA_EXCEEDED` (403). |
| TC-TIER-077 | ULTRA | Items per set | 30 items in set | Add 31st item to set | Blocked with `ITEM_LIMIT_EXCEEDED` (400). |

### 3.3. AI Reservation State Transitions

| TC | Initial State | Action / Expiry Check | Expected State | Quota Counting Effect |
|---|---|---|---|---|
| TC-TIER-080 | User submits Q&A | Create reservation | `RESERVED` | Temporarily decrements remaining questions quota. |
| TC-TIER-081 | `RESERVED` | AI Provider returns success | `CONFIRMED` | Confirmed as a permanent daily count decrement. |
| TC-TIER-082 | `RESERVED` | AI Provider throws exception | `RELEASED` | Daily quota reservation is reversed immediately. |
| TC-TIER-083 | `RESERVED` | No provider response, time exceeds 60s | Ignored / `EXPIRED` | **Ignored in active quota checks**: Logic counting daily usage filters out reservations where `status = 'RESERVED' AND expiresAt <= NOW()`, freeing up the daily questions slot without needing database updates. Reservation record may also be marked as `EXPIRED` in DB during cron garbage collection. |

---

## 4. Entitlements and Usage API Integration

### 4.1. Account Entitlements Endpoint (GET /api/account/entitlements)

| TC | Scenario | Expected HTTP | Expected JSON Payload |
|---|---|---|---|
| TC-TIER-090 | Authenticated request (Effective Tier = PREMIUM) | 200 OK | Returns `"tier": "PREMIUM"`, `"effectiveTier": "PREMIUM"`, `"tierExpiresAt": "2026-08-04T10:00:00Z"` (with timezone suffix), and correct max limit bounds matching the PREMIUM policy (including `maxAiSessionsPerDocument = 30`, `maxMessagesPerSession = 300`, `maxSummaryQuotaPerDay = 20`, `maxContextChunks = 8`, `maxOutputTokens = 1500`, `aiModel = "gemini-2.5-flash"`). |
| TC-TIER-091 | Unauthenticated request | 401 Unauthorized | Returns `{"success":false,"message":"Unauthorized"}`. |

### 4.2. Usage Statistics Endpoint (GET /api/account/usage)

| TC | Scenario | Expected HTTP | Expected JSON Payload |
|---|---|---|---|
| TC-TIER-100 | Authenticated request (FREE user with 2 documents, 4.5MB space used) | 200 OK | Returns correct `used`, `limit`, `remaining` (`max(limit - used, 0)`), `overLimit` (`used > limit`), and `overBy` (`max(used - limit, 0)`) stats for all resources. |
| TC-TIER-101 | PREMIUM user expired back to FREE, with 150 documents remaining | 200 OK | Returns: `"documents": {"used": 150, "limit": 30, "remaining": 0, "overLimit": true, "overBy": 120}`. (Verifies that user is flagged as over-limit but existing files are not deleted). |
