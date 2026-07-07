# VNPay Monthly Payment Test Cases (Step 13B)

This document specifies the complete test suite and verification scenarios for Step 13B: VNPay Sandbox Monthly Payment and Mock Monthly Payment integration.

---

## 1. Test Suite Scenarios

### 1.1. Plan Metadata API (`GET /api/payments/plans`)
* **TC-PLAN-01: Plan Structure Retrieval**
  * **Action**: Call `GET /api/payments/plans` without authentication.
  * **Expected Output**:
    * HTTP `200 OK`.
    * Response body contains `success: true` and an array of 3 plans: `FREE`, `PREMIUM_1_MONTH`, and `ULTRA_1_MONTH`.
    * Fields `planName`, `price`, `billingLabel`, and `aiDailyLimit` are returned and match central config.
* **TC-PLAN-02: FREE Plan Properties**
  * **Action**: Validate the `FREE` plan properties in the plan retrieval array.
  * **Expected Output**:
    * `purchasable` is `false`.
    * `durationMonths` is `0`.
    * `price` is `0`.
* **TC-PLAN-03: FE Client Compliance**
  * **Action**: Client requests checkout creation.
  * **Constraint**: The client MUST only submit `planCode` (e.g., `PREMIUM_1_MONTH`), never `targetTier` or `price`. The backend resolves prices and tiers dynamically.

---

### 1.2. Checkout Creation API
* **TC-CREATE-01: Create Mock Checkout**
  * **Action**: Request `POST /api/payments/mock/create` with body `{"planCode": "PREMIUM_1_MONTH"}`.
  * **Expected Output**:
    * HTTP `200 OK`.
    * A database order record is generated with `payment_method = 'MOCK'`, `payment_provider = 'MOCK'`, `status = 'PENDING'`, and `paymentUrl = null`.
* **TC-CREATE-02: Create VNPay Sandbox Checkout**
  * **Action**: Request `POST /api/payments/vnpay/create` with body `{"planCode": "PREMIUM_1_MONTH", "bankCode": "NCB"}`.
  * **Expected Output**:
    * HTTP `200 OK`.
    * A database order record is generated with `payment_method = 'VNPAY'`, `payment_provider = 'VNPAY_SANDBOX'`, `status = 'PENDING'`, and `paymentUrl` pointing to the VNPay Sandbox gateway with valid signed query parameters.
* **TC-CREATE-03: VNPay Invalid Bank Code**
  * **Action**: Request `POST /api/payments/vnpay/create` with body `{"planCode": "PREMIUM_1_MONTH", "bankCode": "INVALID_BANK"}`.
  * **Expected Output**:
    * HTTP `400 Bad Request`.
    * Error payload contains code `INVALID_BANK_CODE`.
* **TC-CREATE-04: Mock Provider Disabling**
  * **Action**: Set `payment.mock-enabled = false` in config. Call `POST /api/payments/mock/create`.
  * **Expected Output**:
    * HTTP `400 Bad Request`.
    * Error payload contains code `PAYMENT_PROVIDER_DISABLED`.
* **TC-CREATE-05: Downgrade Attempt Rejection**
  * **Action**: Upgrade user to `ULTRA`. Call `POST /api/payments/vnpay/create` with `planCode = PREMIUM_1_MONTH`.
  * **Expected Output**:
    * HTTP `409 Conflict`.
    * Error payload contains code `DOWNGRADE_NOT_SUPPORTED`.
* **TC-CREATE-06: Already Pending Lock**
  * **Action**: Create a checkout order. While it is still active (`now < expiredAt`), call checkout creation.
  * **Expected Output**:
    * HTTP `409 Conflict`.
    * Error payload contains code `PAYMENT_ALREADY_PENDING` and includes the current pending `paymentId`, `paymentProvider`, and `paymentUrl` in the `data` block.
* **TC-CREATE-07: Unresolved Review Block**
  * **Action**: Set user's latest order status to `REVIEW_REQUIRED`. Call checkout creation.
  * **Expected Output**:
    * HTTP `409 Conflict`.
    * Error payload contains code `PAYMENT_REQUIRES_MANUAL_REVIEW`.

---

### 1.3. Order Details & Expiration Checking
* **TC-DETAIL-01: Detail Retrieval Field Integrity**
  * **Action**: Call `GET /api/payments/{paymentId}` for an owned order.
  * **Expected Output**:
    * HTTP `200 OK`.
    * Returns all audit fields, including `paymentProvider`, `expiredAt`, `vnp_txn_ref`, `reviewReason`, and `reviewRequiredAt`.
* **TC-DETAIL-02: Ownership Check**
  * **Action**: Request order details for a payment ID belonging to a different user.
  * **Expected Output**:
    * HTTP `404 Not Found` with code `PAYMENT_NOT_FOUND` (no 403 to prevent enumeration).
* **TC-DETAIL-03: Dynamic Expiration Transition**
  * **Action**: Wait 15 minutes for order `expiredAt` to pass. Call `GET /api/payments/{paymentId}`.
  * **Expected Output**:
    * The order status is transitioned to `EXPIRED` in the database.
    * HTTP `200 OK` is returned with status `EXPIRED` and `paymentUrl = null`.
* **TC-DETAIL-04: Expiration Prior to Creation**
  * **Action**: With a stale pending order in the database, call checkout creation.
  * **Expected Output**:
    * The stale order is expired first, and the new checkout order is created successfully (returns HTTP `200 OK`).

---

### 1.4. Pending Payment Cancellation
* **TC-CANCEL-01: Cancel Pending VNPay Checkout**
  * **Action**: Create a VNPay checkout, leave the gateway, then call `POST /api/payments/{paymentId}/cancel` as its owner.
  * **Expected Output**: HTTP `200 OK`, order status becomes `CANCELLED`, and a new checkout can be created immediately.
* **TC-CANCEL-02: Ownership and State Protection**
  * **Action**: Cancel another user's order or an order that is no longer `PENDING`.
  * **Expected Output**: `404 PAYMENT_NOT_FOUND` for another owner, or `409 ORDER_NOT_PENDING` for a terminal order.
* **TC-CANCEL-03: Successful IPN After Local Cancellation**
  * **Action**: Send a valid signed successful IPN for a locally cancelled VNPay order.
  * **Expected Output**: IPN returns `RspCode=00`; order becomes `REVIEW_REQUIRED` with reason `PAYMENT_RECEIVED_AFTER_LOCAL_CANCELLATION`; tier is not upgraded automatically.

### 1.5. History & Sorting
* **TC-HISTORY-01: History Visibility & Sorting**
  * **Action**: Call `GET /api/payments/my`.
  * **Expected Output**:
    * Returns HTTP `200 OK` containing all historical orders.
    * Orders are sorted by `createdAt` in descending order (newest first).
    * `paymentUrl` is populated ONLY for `PENDING` orders where `now <= expiredAt`. Terminal statuses (`SUCCESS`, `FAILED`, `CANCELLED`, `REVIEW_REQUIRED`) return `paymentUrl = null`. `EXPIRED` also returns `paymentUrl = null`.

---

### 1.6. Mock Processing Guardrails
* **TC-MOCK-01: Reject Mocking VNPay Orders**
  * **Action**: Create a VNPay sandbox order. Call mock success endpoint `/api/payments/mock/{paymentId}/success`.
  * **Expected Output**:
    * HTTP `400 Bad Request`.
    * Error payload contains code `MOCK_CONFIRM_NOT_ALLOWED`.
* **TC-MOCK-02: Mock Provider Disabled Blocks All Actions**
  * **Action**: Set `payment.mock-enabled = false` in config. Call mock endpoints: create (`POST /api/payments/mock/create`), success (`POST /api/payments/mock/{paymentId}/success`), fail (`POST /api/payments/mock/{paymentId}/fail`), and cancel (`POST /api/payments/mock/{paymentId}/cancel`).
  * **Expected Output**:
    * All endpoints return HTTP `400 Bad Request`.
    * All error payloads contain code `PAYMENT_PROVIDER_DISABLED`.


---

### 1.7. VNPay Callback Verification (Return URL)
* **TC-RETURN-01: Checksum Failure Rejection**
  * **Action**: Call `GET /api/payments/vnpay/return` with modified `vnp_SecureHash`.
  * **Expected Output**:
    * Redirection to `{FRONTEND_PAYMENT_RESULT_URL}?error=payment_return_invalid`.
    * No database transaction is updated. No tier is changed.
* **TC-RETURN-02: Success Redirect Mapping**
  * **Action**: Call return URL with correct parameters and signature.
  * **Expected Output**:
    * Redirection to `{FRONTEND_PAYMENT_RESULT_URL}?paymentId={paymentId}`.
    * **No database updates are made** (untrusted client channel).

---

### 1.8. Instant Payment Notification (IPN Callback)
* **TC-IPN-01: Signature Check Priority**
  * **Action**: Send IPN request with invalid signature.
  * **Expected Output**:
    * Response `{"RspCode":"97","Message":"Invalid signature"}` (error code: `INVALID_PAYMENT_SIGNATURE`).
    * No database locks or updates are performed.
* **TC-IPN-02: Order Exists Check**
  * **Action**: Send IPN with non-existent transaction reference `vnp_TxnRef`.
  * **Expected Output**:
    * Response `{"RspCode":"01","Message":"Order not found"}`.
* **TC-IPN-03: Amount Snapshot Match**
  * **Action**: Send IPN with modified `vnp_Amount` query parameter.
  * **Expected Output**:
    * Response `{"RspCode":"04","Message":"Invalid amount"}` (error code: `PAYMENT_AMOUNT_MISMATCH`).
* **TC-IPN-04: Idempotent Double Processing**
  * **Action**: Send IPN for an order that is already `SUCCESS` or `FAILED`.
  * **Expected Output**:
    * Response `{"RspCode":"02","Message":"Order already confirmed"}`.
* **TC-IPN-05: Late Payment Review Queue**
  * **Action**: Send IPN where pay date occurred after order `expiredAt`.
  * **Expected Output**:
    * Response `{"RspCode":"00","Message":"Confirm success"}`.
    * Order status transitions to `REVIEW_REQUIRED`, setting `reviewReason = 'PAY_DATE_AFTER_EXPIRY'` and `reviewRequiredAt = now`.
    * User tier remains unchanged.
* **TC-IPN-06: Downgrade Protection Block**
  * **Action**: User is `ULTRA`. Late callback for a `PREMIUM_1_MONTH` order arrives.
  * **Expected Output**:
    * Response `{"RspCode":"00","Message":"Confirm success"}`.
    * Order status transitions to `REVIEW_REQUIRED` with `reviewReason = 'TARGET_TIER_LOWER_THAN_CURRENT_TIER'`.
    * User tier remains `ULTRA` (preventing downgrade).
* **TC-IPN-07: Successful Tier Upgrade**
  * **Action**: Send successful IPN callback for a pending order.
  * **Expected Output**:
    * Response `{"RspCode":"00","Message":"Confirm success"}`.
    * Order status transitions to `SUCCESS`.
    * User tier is upgraded to the plan's `targetTier`.
    * Expiration is computed using a calendar month: `plusMonths(1)` in UTC.
* **TC-IPN-08: Late Paid on Expired Order Transition**
  * **Action**: Order `status = EXPIRED`. Late callback arrives where `vnp_PayDate <= expiredAt`.
  * **Expected Output**:
    * Response `{"RspCode":"00","Message":"Confirm success"}`.
    * Order status successfully transitions to `SUCCESS` and user's tier is upgraded (exactly once).
* **TC-IPN-09: Overdue Paid on Expired Order Rejection**
  * **Action**: Order `status = EXPIRED`. Overdue callback arrives where `vnp_PayDate > expiredAt`.
  * **Expected Output**:
    * Response `{"RspCode":"00","Message":"Confirm success"}`.
    * Order transitions to `REVIEW_REQUIRED` with `reviewReason = 'PAY_DATE_AFTER_EXPIRY'`. Tier remains unchanged.
* **TC-IPN-10: Failed Response Code Callback**
  * **Action**: Trigger IPN callback where `vnp_ResponseCode != '00'` (e.g. `vnp_ResponseCode = '24'`).
  * **Expected Output**:
    * Order transitions to `FAILED` (unless it was already SUCCESS).
    * Returns response `{"RspCode":"00","Message":"Confirm success"}`.
* **TC-IPN-11: Failed Transaction Status Callback**
  * **Action**: Trigger IPN callback where `vnp_TransactionStatus != '00'` (e.g. `vnp_TransactionStatus = '02'`).
  * **Expected Output**:
    * Order transitions to `FAILED` (unless it was already SUCCESS).
    * Returns response `{"RspCode":"00","Message":"Confirm success"}`.
* **TC-IPN-12: Parse Failure Pay Date**
  * **Action**: Trigger IPN callback with a corrupted `vnp_PayDate` value (e.g. `vnp_PayDate = 'invalid_format'`).
  * **Expected Output**:
    * Order transitions to `REVIEW_REQUIRED` with `reviewReason = 'PAY_DATE_PARSE_FAILED'`.
    * Returns response `{"RspCode":"00","Message":"Confirm success"}`.
    * User tier remains unchanged.

---


### 1.9. Concurrency & Integration
* **TC-CONC-01: Double Concurrent IPN Processing**
  * **Action**: Trigger two concurrent IPN success requests for the same user renewal.
  * **Expected Output**:
    * Pessimistic row locking on User table serializes execution.
    * One request succeeds, updating tier and adding 1 calendar month (`plusMonths(1)`). The other is ignored or returns duplicate code. The tier expiration is extended by exactly 1 calendar month once, preventing double increments.
* **TC-CONC-02: Simultaneous Checkout Creation**
  * **Action**: Trigger two concurrent checkout requests for the same user.
  * **Expected Output**:
    * Only one `PENDING` order is created; the other returns `PAYMENT_ALREADY_PENDING`.

---

## 2. VNPay Security Guidelines
* **Secrets Protection**: Do NOT log, hardcode, or expose the `vnp_HashSecret` key in code, logs, or error responses.
* **Secure Hash Algorithm**: Utilize HMAC-SHA512 for verifying and generating signatures in compliance with VNPay gateway specifications.
