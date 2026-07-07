/**
 * Payment API Helper
 * Branch: feature/step-13b-payment-api-helper
 * All functions use apiRequest() — no raw fetch allowed in page scripts.
 */

// ─────────────────────────────────────────────────────────────
// ERROR MAPPING
// ─────────────────────────────────────────────────────────────

/**
 * Maps payment-related errors to human-readable messages.
 * Checks error.code first, then falls back to HTTP status.
 * @param {Error} error - The error object from apiRequest().
 * @returns {string} Human-readable error message.
 */
function mapPaymentError(error) {
  const code = error && error.code;
  switch (code) {
    case "PAYMENT_ALREADY_PENDING":
      return "You already have a pending payment. Please complete or cancel it first.";
    case "PAYMENT_REQUIRES_MANUAL_REVIEW":
      return "Your previous payment requires manual review. Please contact support.";
    case "PAYMENT_PROVIDER_DISABLED":
      return "This payment provider is currently disabled.";
    case "INVALID_BANK_CODE":
      return "The selected bank code is invalid. Please choose a supported bank.";
    case "DOWNGRADE_NOT_SUPPORTED":
      return "Downgrading from ULTRA to PREMIUM is not supported.";
    case "MOCK_CONFIRM_NOT_ALLOWED":
      return "A VNPay payment cannot be confirmed through the mock flow.";
    case "INVALID_PLAN":
      return "The selected payment plan is invalid.";
    case "PAYMENT_NOT_FOUND":
      return "The requested payment could not be found.";
    case "ORDER_NOT_PENDING":
      return "This payment order is no longer in a pending state.";
    case "VNPAY_URL_GENERATION_FAILED":
      return "Failed to generate VNPay payment URL. Please try again later.";
  }

  const status = error && (error.status || error.statusCode);
  switch (status) {
    case 400: return "The selected plan or parameter is invalid.";
    case 401: return "Please log in to upgrade your account.";
    case 404: return "Payment not found.";
    case 409: return "This payment action is no longer available.";
    case 500: return "Payment service is currently unavailable. Please try again later.";
  }

  return (error && error.message) || "An unexpected payment error occurred.";
}

// ─────────────────────────────────────────────────────────────
// STATUS HELPERS
// ─────────────────────────────────────────────────────────────

/**
 * Maps a payment status to a human-readable label and CSS class.
 * Supports: PENDING, SUCCESS, FAILED, CANCELLED, EXPIRED, REVIEW_REQUIRED.
 * @param {string} status - Backend payment status string.
 * @returns {{ label: string, class: string }}
 */
function formatPaymentStatus(status) {
  switch (status) {
    case "PENDING": return { label: "Pending", class: "payment-status-pending" };
    case "SUCCESS": return { label: "Success", class: "payment-status-success" };
    case "FAILED": return { label: "Failed", class: "payment-status-failed" };
    case "CANCELLED": return { label: "Cancelled", class: "payment-status-cancelled" };
    case "EXPIRED": return { label: "Expired", class: "payment-status-expired" };
    case "REVIEW_REQUIRED": return { label: "Under Review", class: "payment-status-review" };
    default: return { label: status || "Unknown", class: "payment-status-unknown" };
  }
}

/**
 * Returns true if the payment was made via VNPay Sandbox.
 * @param {Object} payment - Payment object from backend.
 * @returns {boolean}
 */
function isVnpayPayment(payment) {
  return !!(payment && payment.paymentProvider === "VNPAY_SANDBOX");
}

/**
 * Returns true if the payment was made via Mock provider.
 * @param {Object} payment - Payment object from backend.
 * @returns {boolean}
 */
function isMockPayment(payment) {
  return !!(payment && payment.paymentProvider === "MOCK");
}

/**
 * Returns true if the user can continue a pending VNPay payment (has a paymentUrl).
 * @param {Object} payment - Payment object from backend.
 * @returns {boolean}
 */
function canContinueVNPay(payment) {
  return payment &&
    payment.status === "PENDING" &&
    payment.paymentProvider === "VNPAY_SANDBOX" &&
    !!payment.paymentUrl;
}

// ─────────────────────────────────────────────────────────────
// PLAN API
// ─────────────────────────────────────────────────────────────

/**
 * Retrieves all available payment plans.
 * Public endpoint — does not require authentication.
 * Response includes: planCode, planName, price, billingLabel, aiDailyLimit.
 * Never hardcode price — always read from backend response.
 * @returns {Promise<Object>} List of available plans.
 */
async function getPaymentPlans() {
  return await apiRequest("/api/payments/plans", {
    method: "GET"
  });
}

// ─────────────────────────────────────────────────────────────
// PAYMENT ORDER API
// ─────────────────────────────────────────────────────────────

/**
 * Creates a VNPay Sandbox payment order for the given plan code.
 * Supported planCodes: PREMIUM_1_MONTH, ULTRA_1_MONTH.
 * @param {string} planCode - The plan to purchase.
 * @param {string} [bankCode] - Optional VNPay bank code (e.g. "NCB", "AGRIBANK").
 * @returns {Promise<Object>} Created payment order with paymentUrl for redirect.
 */
async function createVNPayPayment(planCode, bankCode = "") {
  if (!planCode) throw new Error("Plan code is required.");
  const body = bankCode ? { planCode, bankCode } : { planCode };
  return await apiRequest("/api/payments/vnpay/create", {
    method: "POST",
    body: JSON.stringify(body)
  });
}

/**
 * Creates a Mock payment order for checkout simulation.
 * Supported planCodes: PREMIUM_1_MONTH, ULTRA_1_MONTH.
 * @param {string} planCode - The plan to purchase.
 * @returns {Promise<Object>} Created payment order with paymentUrl = null.
 */
async function createMockPayment(planCode) {
  if (!planCode) throw new Error("Plan code is required.");
  return await apiRequest("/api/payments/mock/create", {
    method: "POST",
    body: JSON.stringify({ planCode })
  });
}

/**
 * Retrieves a specific payment order by ID.
 * Note: If status is PENDING and expiredAt has passed, backend auto-transitions to EXPIRED.
 * @param {string|number} paymentId - The payment identifier.
 * @returns {Promise<Object>} Payment order data.
 */
async function getPayment(paymentId) {
  if (!paymentId) throw new Error("Payment ID is required.");
  return await apiRequest(`/api/payments/${paymentId}`, {
    method: "GET"
  });
}

/**
 * Retrieves the current user's full payment history.
 * Includes all statuses: PENDING, SUCCESS, FAILED, CANCELLED, EXPIRED, REVIEW_REQUIRED.
 * @returns {Promise<Object>} List of past payment orders.
 */
async function getMyPayments() {
  return await apiRequest("/api/payments/my", {
    method: "GET"
  });
}

// ─────────────────────────────────────────────────────────────
// MOCK PAYMENT ACTIONS
// ─────────────────────────────────────────────────────────────

/**
 * Confirms a mock payment as successful and upgrades user tier.
 * @param {string|number} paymentId - The payment identifier.
 * @returns {Promise<Object>} Updated payment data with SUCCESS status.
 */
async function mockPaymentSuccess(paymentId) {
  if (!paymentId) throw new Error("Payment ID is required.");
  return await apiRequest(`/api/payments/mock/${paymentId}/success`, {
    method: "POST"
  });
}

/**
 * Alias for mockPaymentSuccess — maps to /confirm endpoint if BE2 adds it.
 * @param {string|number} paymentId - The payment identifier.
 * @returns {Promise<Object>} Updated payment data.
 */
async function mockPaymentConfirm(paymentId) {
  if (!paymentId) throw new Error("Payment ID is required.");
  return await apiRequest(`/api/payments/mock/${paymentId}/confirm`, {
    method: "POST"
  });
}

/**
 * Marks a mock payment as failed.
 * @param {string|number} paymentId - The payment identifier.
 * @returns {Promise<Object>} Updated payment data with FAILED status.
 */
async function mockPaymentFail(paymentId) {
  if (!paymentId) throw new Error("Payment ID is required.");
  return await apiRequest(`/api/payments/mock/${paymentId}/fail`, {
    method: "POST"
  });
}

/**
 * Cancels a pending mock payment.
 * @param {string|number} paymentId - The payment identifier.
 * @returns {Promise<Object>} Updated payment data with CANCELLED status.
 */
async function mockPaymentCancel(paymentId) {
  if (!paymentId) throw new Error("Payment ID is required.");
  return await apiRequest(`/api/payments/mock/${paymentId}/cancel`, {
    method: "POST"
  });
}

// Expose globally for page scripts
window.mapPaymentError = mapPaymentError;
window.formatPaymentStatus = formatPaymentStatus;
window.isVnpayPayment = isVnpayPayment;
window.isMockPayment = isMockPayment;
window.canContinueVNPay = canContinueVNPay;
window.getPaymentPlans = getPaymentPlans;
window.createVNPayPayment = createVNPayPayment;
window.createMockPayment = createMockPayment;
window.getPayment = getPayment;
window.getMyPayments = getMyPayments;
window.mockPaymentSuccess = mockPaymentSuccess;
window.mockPaymentConfirm = mockPaymentConfirm;
window.mockPaymentFail = mockPaymentFail;
window.mockPaymentCancel = mockPaymentCancel;