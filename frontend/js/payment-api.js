/**
 * Payment API Helper
 * Branch: feature/step-13b-payment-api-helper
 * All functions use apiRequest() — no raw fetch allowed in page scripts.
 */

/**
 * Standardized error messages for payment-related HTTP error codes.
 * @param {Error} error - The error object from apiRequest().
 * @returns {string} Human-readable error message.
 */
function mapPaymentError(error) {
  const status = error?.status || error?.statusCode;
  switch (status) {
    case 400: return "Invalid plan selected or missing parameters.";
    case 401: return "Please log in to upgrade your account.";
    case 404: return "Payment not found.";
    case 409: return "User is already Premium or this payment is no longer pending.";
    case 500: return "Payment service is currently unavailable.";
    default:  return error?.message || "An unexpected error occurred.";
  }
}

/**
 * Formats payment status to a readable label.
 * @param {string} status 
 * @returns {string} Formatted status
 */
function formatPaymentStatus(status) {
  switch (status) {
    case "PENDING": return "Pending";
    case "SUCCESS": return "Success";
    case "FAILED": return "Failed";
    case "CANCELLED": return "Cancelled";
    case "EXPIRED": return "Expired";
    case "REVIEW_REQUIRED": return "Review Required";
    default: return status || "Unknown";
  }
}

/**
 * Retrieves all available payment plans.
 * @returns {Promise<Object>} List of available plans (planName, price, billingLabel, aiDailyLimit).
 */
async function getPaymentPlans() {
  return await apiRequest("/api/payments/plans", {
    method: "GET"
  });
}

/**
 * Creates a VNPay payment session for the given plan code.
 * @param {string} planCode - The plan to purchase (e.g. "PREMIUM").
 * @param {string} bankCode - Optional bank code.
 * @returns {Promise<Object>} Created payment session data.
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
 * Creates a mock payment session for the given plan code.
 * Supported purchasable plan codes: PREMIUM, ULTRA.
 * FREE is display-only and cannot be purchased.
 * Both paid plans currently have a one-month duration.
 * @param {string} planCode - The plan to purchase (e.g. "PREMIUM" or "ULTRA").
 * @returns {Promise<Object>} Created payment session data.
 */
async function createMockPayment(planCode) {
  if (!planCode) throw new Error("Plan code is required.");
  return await apiRequest("/api/payments/mock/create", {
    method: "POST",
    body: JSON.stringify({ planCode })
  });
}

/**
 * Retrieves payment details by ID.
 * @param {string|number} paymentId 
 * @returns {Promise<Object>} Payment data.
 */
async function getPayment(paymentId) {
  if (!paymentId) throw new Error("Payment ID is required.");
  return await apiRequest(`/api/payments/${paymentId}`, {
    method: "GET"
  });
}

/**
 * Retrieves the current user's payment history.
 * @returns {Promise<Object>} List of past payments.
 */
async function getMyPayments() {
  return await apiRequest("/api/payments/my", {
    method: "GET"
  });
}

/**
 * Marks a mock payment as successful.
 * @param {string|number} id - Payment identifier.
 * @returns {Promise<Object>} Updated payment data.
 */
async function mockPaymentSuccess(id) {
  if (!id) throw new Error("Payment ID is required.");
  return await apiRequest(`/api/payments/mock/${id}/success`, {
    method: "POST"
  });
}

/**
 * Confirms a mock payment (optional alias for success).
 * @param {string|number} id - Payment identifier.
 * @returns {Promise<Object>} Updated payment data.
 */
async function mockPaymentConfirm(id) {
  if (!id) throw new Error("Payment ID is required.");
  return await apiRequest(`/api/payments/mock/${id}/confirm`, {
    method: "POST"
  });
}

/**
 * Marks a mock payment as failed.
 * @param {string|number} id - Payment identifier.
 * @returns {Promise<Object>} Updated payment data.
 */
async function mockPaymentFail(id) {
  if (!id) throw new Error("Payment ID is required.");
  return await apiRequest(`/api/payments/mock/${id}/fail`, {
    method: "POST"
  });
}

/**
 * Cancels a pending mock payment.
 * @param {string|number} id - Payment identifier.
 * @returns {Promise<Object>} Updated payment data.
 */
async function mockPaymentCancel(id) {
  if (!id) throw new Error("Payment ID is required.");
  return await apiRequest(`/api/payments/mock/${id}/cancel`, {
    method: "POST"
  });
}

function isVnpayPayment(payment) {
  return payment && payment.paymentProvider === "VNPAY_SANDBOX";
}

function isMockPayment(payment) {
  return payment && payment.paymentProvider === "MOCK";
}

function canContinueVNPay(payment) {
  return payment 
    && payment.status === "PENDING"
    && payment.paymentProvider === "VNPAY_SANDBOX"
    && !!payment.paymentUrl;
}