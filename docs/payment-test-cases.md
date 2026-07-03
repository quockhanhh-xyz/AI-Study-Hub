# Mock Payment and Account Tier MVP Test Cases - Step 11

This document defines the backend contract test cases for the Mock Payment and Account Tier MVP implementation.

---

## 1. Get Plans — GET /api/payments/plans

### 1.1. Permissions and Response Validation

| TC | Actor | Request Headers / Conditions | Expected HTTP | Expected Data Fields |
|---|---|---|---|---|
| TC-PAY-001 | Guest | No auth cookies | 200 OK | Returns list of plans containing `PREMIUM` details. |
| TC-PAY-002 | FREE User | Authenticated | 200 OK | Returns plans. `PREMIUM` price must be `199000 VND`, `billingLabel = "month"`, and `aiDailyLimit = 50`. |

---

## 2. Create Mock Payment — POST /api/payments/mock/create

### 2.1. Input Validation and Permissions

| TC | Actor | planCode | Expected HTTP | Expected Behavior / Fields |
|---|---|---|---|---|
| TC-PAY-010 | Guest | `"PREMIUM"` | 401 Unauthorized | Blocked from creating payment. |
| TC-PAY-011 | FREE User | `"PREMIUM"` | 200 OK | Creates a new order. `status = "PENDING"`, `amount = 199000`, `currency = "VND"`. |
| TC-PAY-012 | FREE User | `"FREE"` | 400 Bad Request | Plan code `FREE` cannot be upgraded to. |
| TC-PAY-013 | FREE User | `"INVALID_CODE"` | 400 Bad Request | Invalid plan code validation. |
| TC-PAY-014 | FREE User | `null` / Empty | 400 Bad Request | Validation error on missing field. |
| TC-PAY-015 | PREMIUM User | `"PREMIUM"` | 409 Conflict | Already upgraded users cannot create new PREMIUM payments. |
| TC-PAY-016 | FREE User | `"PREMIUM"` with extra parameters (`amount`, `currency`, `tier` sent in body) | 200 OK | Backend ignores user-provided values and forces price/currency/tier from `PlanService`. |

---

## 3. Confirm Success — POST /api/payments/mock/{paymentId}/success

### 3.1. Confirmation Validation and Post-Conditions

| TC | Actor | Payment State / Owner | Expected HTTP | Post-Condition (User Tier / Order Status / timestamps) |
|---|---|---|---|---|
| TC-PAY-020 | Guest | Existing PENDING order | 401 Unauthorized | No state changes. |
| TC-PAY-021 | FREE User | Payment order does not exist | 404 Not Found | No state changes. |
| TC-PAY-022 | FREE User | Payment order belongs to another user | 404 Not Found | No state changes (do not return 403 to prevent exposing order existence). |
| TC-PAY-023 | FREE User | Payment order already `SUCCESS` | 409 Conflict | No changes. Response returns `status = SUCCESS`, user remains `PREMIUM`. |
| TC-PAY-024 | FREE User | Payment order already `FAILED` | 409 Conflict | No changes. User tier remains `FREE`. |
| TC-PAY-025 | FREE User | Payment order already `CANCELLED` | 409 Conflict | No changes. User tier remains `FREE`. |
| TC-PAY-026 | FREE User | Payment order `PENDING`, owned by current user | 200 OK | User tier becomes `PREMIUM`. Order status becomes `SUCCESS`. `paidAt` is set to the current timestamp. |
| TC-PAY-027 | PREMIUM User | Payment order `PENDING` (created when user was FREE, user upgraded since then) | 409 Conflict | Blocked from completing. Already PREMIUM users cannot confirm old pending payments. |
| TC-PAY-028 | FREE User | Double-click: 2 concurrent requests on the same `PENDING` payment ID | 200 OK / 409 Conflict | First request succeeds (200 OK, upgrades user, sets `SUCCESS`). Second request returns 409 Conflict (already SUCCESS). |

---

## 4. Confirm Fail — POST /api/payments/mock/{paymentId}/fail

### 4.1. Failure Confirmation Logic

| TC | Actor | Payment State / Owner | Expected HTTP | Post-Condition (User Tier / Order Status / timestamps) |
|---|---|---|---|---|
| TC-PAY-030 | Guest | Existing PENDING order | 401 Unauthorized | No state changes. |
| TC-PAY-031 | FREE User | Payment order does not belong to current user | 404 Not Found | No state changes. |
| TC-PAY-032 | FREE User | Payment order already `SUCCESS` | 409 Conflict | No changes. User tier remains `PREMIUM`. |
| TC-PAY-033 | FREE User | Payment order `PENDING`, owned by current user | 200 OK | Order status becomes `FAILED`. User tier remains `FREE`. `paidAt` remains `null`. Response returns `tier = "FREE"`. |
| TC-PAY-034 | PREMIUM User | Payment order `PENDING` (from when user was FREE) | 200 OK | Order status becomes `FAILED`. User tier remains `PREMIUM` (already upgraded by other means). `paidAt` remains `null`. Response returns `tier = "PREMIUM"`. |

---

## 5. Cancel Payment — POST /api/payments/mock/{paymentId}/cancel

### 5.1. Cancellation Logic

| TC | Actor | Payment State / Owner | Expected HTTP | Post-Condition (User Tier / Order Status / timestamps) |
|---|---|---|---|---|
| TC-PAY-040 | Guest | Existing PENDING order | 401 Unauthorized | No state changes. |
| TC-PAY-041 | FREE User | Payment order does not belong to current user | 404 Not Found | No state changes. |
| TC-PAY-042 | FREE User | Payment order already `SUCCESS` | 409 Conflict | No changes. User tier remains `PREMIUM`. |
| TC-PAY-043 | FREE User | Payment order `PENDING`, owned by current user | 200 OK | Order status becomes `CANCELLED`. User tier remains `FREE`. `paidAt` remains `null`. Response returns `tier = "FREE"`. |
| TC-PAY-044 | PREMIUM User | Payment order `PENDING` (from when user was FREE) | 200 OK | Order status becomes `CANCELLED`. User tier remains `PREMIUM`. `paidAt` remains `null`. Response returns `tier = "PREMIUM"`. |

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
