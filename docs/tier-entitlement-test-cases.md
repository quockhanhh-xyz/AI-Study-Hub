# Tier & Entitlement Test Cases - Step 13

This document defines the backend validation, database migration, and entitlement enforcement test cases for the Tier & Entitlement Foundation.

---

## 1. Database Migration and Schema Enforcement

### 1.1. Migration & Backfill Checks

| TC | Scenario | Action | Expected Behavior |
|---|---|---|---|
| TC-TIER-001 | Manual SQL Migration | Run SQL script `V13__tier_entitlement.sql` | - Column `tier_expires_at` is added to `users` table.<br>- Table `ai_usage_reservations` is created with unique request constraints and indexes.<br>- Passes without breaking existing data records. |
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
| TC-TIER-020 | FREE | Owns 3 active study groups | Create new study group | 403 Forbidden | Blocked with code `GROUPS_LIMIT_EXCEEDED`. |
| TC-TIER-021 | FREE | Group has 10 members | Invite or add member to group | 403 Forbidden | Blocked with code `GROUP_MEMBERS_LIMIT_EXCEEDED`. |
| TC-TIER-022 | PREMIUM | Owns 30 active study groups | Create new study group | 403 Forbidden | Blocked with code `GROUPS_LIMIT_EXCEEDED`. |
| TC-TIER-023 | PREMIUM | Group has 100 members | Invite or add member to group | 403 Forbidden | Blocked with code `GROUP_MEMBERS_LIMIT_EXCEEDED`. |
| TC-TIER-024 | ULTRA | Owns 100 active study groups | Create new study group | 403 Forbidden | Blocked with code `GROUPS_LIMIT_EXCEEDED`. |
| TC-TIER-025 | ULTRA | Group has 300 members | Invite or add member to group | 403 Forbidden | Blocked with code `GROUP_MEMBERS_LIMIT_EXCEEDED`. |

### 2.3. Active Share Limits (Covers all 4 share types)

| TC | Effective Tier | Current Active Shares | Action | Expected HTTP | Expected Action / Error Code |
|---|---|---|---|---|---|
| TC-TIER-030 | FREE | 30 active shares (combination of document public publishing, folder shares, subject shares, group shares) | Share another resource | 403 Forbidden | Blocked with code `SHARES_LIMIT_EXCEEDED`. |
| TC-TIER-031 | PREMIUM | 1,000 active shares | Share another resource | 403 Forbidden | Blocked with code `SHARES_LIMIT_EXCEEDED`. |
| TC-TIER-032 | ULTRA | 5,000 active shares | Share another resource | 403 Forbidden | Blocked with code `SHARES_LIMIT_EXCEEDED`. |

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
| TC-TIER-041 | FREE | Folder `F` in Trash has depth of 2. User attempts to restore under Folder `G` (depth 2) | Restore Folder `F` under `G` | 400 Bad Request | Blocked with code `DEPTH_LIMIT_EXCEEDED` (cumulative depth of restored tree `2 + 2 = 4` levels exceeds FREE limit of 3). |

### 2.6. Cloudinary Cleanup on DB Save Failure

| TC | Effective Tier | Current State | Action | Expected Behavior |
|---|---|---|---|---|
| TC-TIER-045 | FREE | 30 documents uploaded | Upload a valid 1MB file. The file is uploaded to Cloudinary, but when saving metadata to MySQL DB, quota limit check fails. | - DB transaction rolls back.<br>- Backend catches exception and calls Cloudinary SDK to immediately delete/destroy the uploaded file by public ID.<br>- Storage quota is not occupied. |

### 2.7. Concurrency Protection Tests

| TC | Scenario | Concurrent Actions | Expected Outcome |
|---|---|---|---|
| TC-TIER-048 | Concurrent Requests | Submit 5 concurrent folder creation requests for a FREE user with 19 active folders. | Exactly 1 folder creation succeeds, other 4 requests fail and return `403 Forbidden` with code `FOLDER_LIMIT_EXCEEDED`. |

---

## 3. AI daily Usage & Reservations

### 3.1. Question Length and Selector Enforcement

| TC | Effective Tier | Question Payload | Expected Model Route | Expected HTTP | Expected Action / Error Code |
|---|---|---|---|---|---|
| TC-TIER-050 | FREE | 500 characters | `gemini-2.5-flash-lite` | 200 OK | Question resolved via `DefaultAiModelSelector` calling `TierPolicyService`. |
| TC-TIER-051 | FREE | 501 characters | - | 400 Bad Request | Blocked with code `AI_QUESTION_CHARS_LIMIT_EXCEEDED`. |
| TC-TIER-052 | PREMIUM | 2,000 characters | `gemini-2.5-flash` | 200 OK | Question resolved via `DefaultAiModelSelector` calling `TierPolicyService`. |
| TC-TIER-053 | PREMIUM | 2,001 characters | - | 400 Bad Request | Blocked with code `AI_QUESTION_CHARS_LIMIT_EXCEEDED`. |
| TC-TIER-054 | ULTRA | 5,000 characters | `gemini-2.5-flash` | 200 OK | Question resolved via `DefaultAiModelSelector` calling `TierPolicyService`. |
| TC-TIER-055 | ULTRA | 5,001 characters | - | 400 Bad Request | Blocked with code `AI_QUESTION_CHARS_LIMIT_EXCEEDED`. |

### 3.2. AI Reservation State Transitions

| TC | Initial State | Action / Expiry Check | Expected State | Quota Counting Effect |
|---|---|---|---|---|
| TC-TIER-060 | User submits Q&A | Create reservation | `RESERVED` | Temporarily decrements remaining questions quota. |
| TC-TIER-061 | `RESERVED` | AI Provider returns success | `CONFIRMED` | Confirmed as a permanent daily count decrement. |
| TC-TIER-062 | `RESERVED` | AI Provider throws exception | `RELEASED` | Daily quota reservation is reversed immediately. |
| TC-TIER-063 | `RESERVED` | Expired in DB (`expiresAt <= NOW()`) | Still `RESERVED` | **Ignored in active quota checks**: Logic counting daily usage filters out expired reservations, freeing up the daily questions slot without needing database updates. |

---

## 4. Entitlements and Usage API Integration

### 4.1. Account Entitlements Endpoint (GET /api/account/entitlements)

| TC | Scenario | Expected HTTP | Expected JSON Payload |
|---|---|---|---|
| TC-TIER-070 | Authenticated request (Effective Tier = PREMIUM) | 200 OK | Returns `"tier": "PREMIUM"`, `"effectiveTier": "PREMIUM"`, valid `tierExpiresAt` date, and correct max limit bounds matching the PREMIUM policy (including `maxAiSessionsPerDocument = 20`, `maxMessagesPerSession = 100`, `aiModel = "gemini-2.5-flash"`). |
| TC-TIER-071 | Unauthenticated request | 401 Unauthorized | Returns `{"success":false,"message":"Unauthorized"}`. |

### 4.2. Usage Statistics Endpoint (GET /api/account/usage)

| TC | Scenario | Expected HTTP | Expected JSON Payload |
|---|---|---|---|
| TC-TIER-080 | Authenticated request (FREE user with 2 documents, 4.5MB space used) | 200 OK | Returns correct `used`, `limit`, `remaining` (`max(limit - used, 0)`), `overLimit` (`used > limit`), and `overBy` (`max(used - limit, 0)`) stats for all resources. |
| TC-TIER-081 | PREMIUM user expired back to FREE, with 150 documents remaining | 200 OK | Returns: `"documents": {"used": 150, "limit": 30, "remaining": 0, "overLimit": true, "overBy": 120}`. (Verifies that user is flagged as over-limit but existing files are not deleted). |
