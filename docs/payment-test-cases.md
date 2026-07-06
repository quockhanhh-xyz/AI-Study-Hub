# Mock Payment and Account Tier MVP Test Cases - Step 11

This document defines the backend contract test cases for the Mock Payment and Account Tier MVP implementation.

---

## 1. Get Plans — GET /api/payments/plans

### 1.1. Permissions and Response Validation

| TC | Actor | Request Headers / Conditions | Expected HTTP | Expected Data Fields |
|---|---|---|---|---|
| TC-PAY-001 | Guest | No auth cookies | 200 OK | Returns list of plans containing `FREE`, `PREMIUM`, and `ULTRA` details. |
| TC-PAY-002 | Current User | Authenticated | 200 OK | Returns 3 plans. `FREE`: `price = 0`, `targetTier = "FREE"`, `billingLabel = "free"`, `durationMonths = 0`, `aiDailyLimit = 5`. `PREMIUM`: `price = 199000`, `targetTier = "PREMIUM"`, `billingLabel = "1 month"`, `durationMonths = 1`, `aiDailyLimit = 50`. `ULTRA`: `price = 399000`, `targetTier = "ULTRA"`, `billingLabel = "1 month"`, `durationMonths = 1`, `aiDailyLimit = 200`. |
| TC-PAY-003 | Current User | Authenticated, request an unknown/invalid plan code directly via `PlanService.getPrice()` (internal) | N/A (service-level) | Throws `400 Bad Request` — never silently returns a `0` price for an unrecognized plan code. |

---

## 2. Create Mock Payment — POST /api/payments/mock/create

### 2.1. Input Validation and Permissions

| TC | Actor | planCode | Expected HTTP | Expected Behavior / Fields |
|---|---|---|---|---|
| TC-PAY-010 | Guest | `"PREMIUM"` | 401 Unauthorized | Blocked from creating payment. |
| TC-PAY-011 | FREE User | `"PREMIUM"` | 200 OK | Creates a new order. `status = "PENDING"`, `amount = 199000`, `currency = "VND"`, `billingLabel = "1 month"`, `paymentMethod = "MOCK"`. |
| TC-PAY-011b | FREE User | `"ULTRA"` | 200 OK | Creates a new order. `status = "PENDING"`, `amount = 399000`, `currency = "VND"`, `billingLabel = "1 month"`, `paymentMethod = "MOCK"`. |
| TC-PAY-012 | FREE User | `"FREE"` | 400 Bad Request | Plan code `FREE` cannot be purchased ("Cannot create payment for FREE plan"). |
| TC-PAY-013 | FREE User | `"INVALID_CODE"` | 400 Bad Request | Invalid plan code validation. |
| TC-PAY-014 | FREE User | `null` / Empty | 400 Bad Request | Validation error on missing field. |
| TC-PAY-015 | PREMIUM User (effective tier PREMIUM, not expired) | `"PREMIUM"` | 200 OK | **Renewal, not blocked.** Creates a new PENDING order; on confirmation, extends the existing `tierExpiresAt` by one month. |
| TC-PAY-015b | PREMIUM User (effective tier PREMIUM, not expired) | `"ULTRA"` | 200 OK | **Upgrade, allowed.** Creates a new PENDING order for Ultra. |
| TC-PAY-015c | ULTRA User (effective tier ULTRA, not expired) | `"ULTRA"` | 200 OK | **Renewal, not blocked.** Creates a new PENDING order for Ultra. |
| TC-PAY-015d | ULTRA User (effective tier ULTRA, not expired) | `"PREMIUM"` | 409 Conflict | **Downgrade, blocked.** Response reason: "Downgrade from ULTRA to PREMIUM is not supported." |
| TC-PAY-015e | Expired PREMIUM User (raw tier = PREMIUM but `tierExpiresAt` in the past, so effective tier = FREE) | `"PREMIUM"` or `"ULTRA"` | 200 OK | Treated as a FREE user for upgrade-path purposes; the expired downgrade guard does NOT apply since effective tier is FREE, not ULTRA. |
| TC-PAY-016 | FREE User | `"PREMIUM"` with extra parameters (`amount`, `currency`, `targetTier`, `durationMonths` sent in body) | 200 OK | Backend ignores user-provided values and forces price/currency/target tier/duration from `PlanService`, based solely on `planCode`. |

---

## 3. Confirm Success — POST /api/payments/mock/{paymentId}/success

### 3.1. Confirmation Validation and Post-Conditions

| TC | Actor | Payment State / Owner | Expected HTTP | Post-Condition (User Tier / Order Status / timestamps) |
|---|---|---|---|---|
| TC-PAY-020 | Guest | Existing PENDING order | 401 Unauthorized | No state changes. |
| TC-PAY-021 | Current User | Payment order does not exist | 404 Not Found | No state changes. |
| TC-PAY-022 | Current User | Payment order belongs to another user | 404 Not Found | No state changes (do not return 403 to prevent exposing order existence). |
| TC-PAY-023 | Any User | Payment order already `SUCCESS` | 409 Conflict | No changes. Idempotent: confirming the same successful order twice never re-applies the renewal/upgrade. |
| TC-PAY-024 | Current User | Payment order already `FAILED` | 409 Conflict | No changes. User tier remains at its current state. |
| TC-PAY-025 | Current User | Payment order already `CANCELLED` | 409 Conflict | No changes. User tier remains at its current state. |
| TC-PAY-026 | FREE User | `PENDING` order, `planCode = "PREMIUM"` | 200 OK | User tier becomes `PREMIUM` atomically. `tierExpiresAt = now + 1 month`. Order status becomes `SUCCESS`. `paidAt` set to current timestamp. |
| TC-PAY-026b | FREE User | `PENDING` order, `planCode = "ULTRA"` | 200 OK | User tier becomes `ULTRA`. `tierExpiresAt = now + 1 month`. Order status becomes `SUCCESS`. |
| TC-PAY-026c | PREMIUM User (effective tier PREMIUM, expiring in 10 days) | `PENDING` order, `planCode = "PREMIUM"` | 200 OK | Renewal: `tierExpiresAt` becomes `oldExpiresAt + 1 month` (extends from existing expiry, not from now). Tier stays `PREMIUM`. |
| TC-PAY-026d | ULTRA User (effective tier ULTRA, expiring in 5 days) | `PENDING` order, `planCode = "ULTRA"` | 200 OK | Renewal: `tierExpiresAt` becomes `oldExpiresAt + 1 month`. Tier stays `ULTRA`. |
| TC-PAY-026e | PREMIUM User (effective tier PREMIUM, 20 days remaining) | `PENDING` order, `planCode = "ULTRA"` | 200 OK | Upgrade: tier becomes `ULTRA`, `tierExpiresAt = now + 1 month`. The remaining 20 days of Premium are **discarded**, not carried over. |
| TC-PAY-027 | ULTRA User (effective tier ULTRA, not expired) | `PENDING` order, `planCode = "PREMIUM"` (e.g. an old order created before the user upgraded to Ultra) | 409 Conflict | Blocked as a downgrade attempt. Reason: "Downgrade from ULTRA to PREMIUM is not supported." Order remains `PENDING`; user tier/expiry unchanged. |
| TC-PAY-027b | Expired PREMIUM/ULTRA User (raw tier set but `tierExpiresAt` in the past) | `PENDING` order, `planCode = "PREMIUM"` | 200 OK | Since effective tier is `FREE` (expired), treated as a fresh purchase: tier becomes `PREMIUM`, `tierExpiresAt = now + 1 month`. |
| TC-PAY-028 | Current User | Double-click: 2 concurrent requests confirming the SAME `PENDING` payment ID | 200 OK / 409 Conflict | First request succeeds (200 OK, upgrades user, sets `SUCCESS`). Second request returns 409 Conflict (already SUCCESS). |
| TC-PAY-029 | Current User | 2 concurrent requests confirming TWO DIFFERENT `PENDING` payment orders for the SAME user, same tier (e.g. two `PREMIUM` renewal orders) | 200 OK / 200 OK | Both succeed. The user row is locked during expiry calculation so BOTH one-month extensions apply — final `tierExpiresAt` reflects two renewals (~now + 2 months), never just one (no lost update). |
| TC-PAY-029b | Current User | 2 concurrent requests confirming TWO DIFFERENT `PENDING` payment orders for the SAME user, mixed tiers (one `PREMIUM`, one `ULTRA`) | Order-dependent | Whichever commits first determines the outcome: if `PREMIUM` commits first, the user becomes `PREMIUM` then `ULTRA` (final tier = `ULTRA`); if `ULTRA` commits first, the subsequent `PREMIUM` confirmation is rejected as a downgrade (409) and stays `PENDING`. In both cases, the user must **never** end up on `PREMIUM` after an `ULTRA` payment has succeeded. |

---

## 4. Confirm Fail — POST /api/payments/mock/{paymentId}/fail

### 4.1. Failure Confirmation Logic

| TC | Actor | Payment State / Owner | Expected HTTP | Post-Condition (User Tier / Order Status / timestamps) |
|---|---|---|---|---|
| TC-PAY-030 | Guest | Existing PENDING order | 401 Unauthorized | No state changes. |
| TC-PAY-031 | Current User | Payment order does not belong to current user | 404 Not Found | No state changes. |
| TC-PAY-032 | Any User | Payment order already `SUCCESS` | 409 Conflict | No changes. User's effective tier is unaffected. |
| TC-PAY-033 | FREE User | Payment order `PENDING`, owned by current user | 200 OK | Order status becomes `FAILED`. User tier remains `FREE`. `paidAt` remains `null`. Response returns `tier = "FREE"`. |
| TC-PAY-034 | Upgraded User (already PREMIUM via another payment) | Payment order `PENDING` (from when user was FREE) | 200 OK | Order status becomes `FAILED`. User tier remains `PREMIUM` (unaffected by this failed order). `paidAt` remains `null`. Response returns `tier = "PREMIUM"` — this is the user's current **Effective Tier**, not the raw stored value. |
| TC-PAY-035 | Expired PREMIUM User (raw tier PREMIUM, `tierExpiresAt` in the past) | Payment order `PENDING` | 200 OK | Response returns `tier = "FREE"` (Effective Tier), even though the raw `users.tier` column may still say `PREMIUM` until the next login/refresh. |

---

## 5. Cancel Payment — POST /api/payments/mock/{paymentId}/cancel

### 5.1. Cancellation Logic

| TC | Actor | Payment State / Owner | Expected HTTP | Post-Condition (User Tier / Order Status / timestamps) |
|---|---|---|---|---|
| TC-PAY-040 | Guest | Existing PENDING order | 401 Unauthorized | No state changes. |
| TC-PAY-041 | Current User | Payment order does not belong to current user | 404 Not Found | No state changes. |
| TC-PAY-042 | Any User | Payment order already `SUCCESS` | 409 Conflict | No changes. User's effective tier is unaffected. |
| TC-PAY-043 | FREE User | Payment order `PENDING`, owned by current user | 200 OK | Order status becomes `CANCELLED`. User tier remains `FREE`. `paidAt` remains `null`. Response returns `tier = "FREE"`. |
| TC-PAY-044 | Upgraded User (already PREMIUM via another payment) | Payment order `PENDING` (from when user was FREE) | 200 OK | Order status becomes `CANCELLED`. User tier remains `PREMIUM`. `paidAt` remains `null`. Response returns `tier = "PREMIUM"` (Effective Tier). |

---

## 6. Get My Payments — GET /api/payments/my

### 6.1. Retrieve History

| TC | Actor | Request Headers / Conditions | Expected HTTP | Expected Data / Ordering |
|---|---|---|---|---|
| TC-PAY-050 | Guest | No auth cookies | 401 Unauthorized | Blocked from viewing. |
| TC-PAY-051 | User A | Authenticated | 200 OK | Returns history belonging ONLY to User A. Order is sorted by `createdAt` descending (newest first). |
| TC-PAY-052 | User A | Has orders with statuses: PENDING, SUCCESS, FAILED, CANCELLED | 200 OK | Returns all orders. None of the orders are deleted (no hard deletes). |

---

## 7. Account Tier & AI Quota Integration

### 7.1. User Profile and Quota Limit Checks

| TC | Endpoint | User Status / Pre-condition | Expected HTTP | Expected Quota Limit / Tier |
|---|---|---|---|---|
| TC-PAY-060 | GET `/api/auth/me` | Before payment (status FREE) | 200 OK | Response contains `"tier": "FREE"` |
| TC-PAY-061 | GET `/api/ai/usage/me` | Before payment (status FREE) | 200 OK | Response contains `"tier": "FREE"`, `"dailyLimit": 5`, `"remainingQuestions": 5` (or remaining count) |
| TC-PAY-062 | GET `/api/auth/me` | After payment SUCCESS (status PREMIUM) | 200 OK | Response contains `"tier": "PREMIUM"` |
| TC-PAY-063 | GET `/api/ai/usage/me` | After payment SUCCESS (status PREMIUM) | 200 OK | Response contains `"tier": "PREMIUM"`, `"dailyLimit": 50` (upgraded daily AI quota) |
| TC-PAY-064 | GET `/api/auth/me` | After payment SUCCESS (status ULTRA) | 200 OK | Response contains `"tier": "ULTRA"` |
| TC-PAY-065 | GET `/api/ai/usage/me` | After payment SUCCESS (status ULTRA) | 200 OK | Response contains `"tier": "ULTRA"`, `"dailyLimit": 200` |
| TC-PAY-066 | GET `/api/account/entitlements` | User's raw tier is `PREMIUM`/`ULTRA` but `tierExpiresAt` is in the past | 200 OK | Response contains `"tier": "PREMIUM"` (raw, unchanged) but `"effectiveTier": "FREE"` — entitlement limits applied are FREE-tier limits until the user renews. |