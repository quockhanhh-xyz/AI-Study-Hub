/**
 * Payment API Helper
 * Branch: feature/step-11-payment-api-tier-ui
 * All functions use apiRequest() — no raw fetch allowed in page scripts.
 */

/**
 * Standardized error messages for payment-related HTTP error codes.
 * @param {Error} error - The error object from apiRequest().
 * @returns {string} Human-readable error message.
 */
function getPaymentErrorMessage(error) {
  const status = error.status || error.statusCode;
  switch (status) {
    case 400: return "Invalid plan selected.";
    case 401: return "Please log in to upgrade your account.";
    case 404: return "Payment not found.";
    case 409: return "User is already Premium or this payment is no longer pending.";
    case 500: return "Payment service is currently unavailable.";
    default:  return error.message || "An unexpected error occurred.";
  }
}

/**
 * Retrieves all available payment plans.
 * Public endpoint — does not require authentication.
 * @returns {Promise<Object>} List of available plans.
 */
async function getPaymentPlans() {
  return await apiRequest("/api/payments/plans", {
    method: "GET"
  });
}

/**
 * Creates a mock payment session for the given plan code.
 * Supported plan codes: PREMIUM, ULTRA.
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
 * Marks a mock payment as successful.
 * @param {string|number} paymentId - The payment identifier.
 * @returns {Promise<Object>} Updated payment data.
 */
async function markMockPaymentSuccess(paymentId) {
  if (!paymentId) throw new Error("Payment ID is required.");
  return await apiRequest(`/api/payments/mock/${paymentId}/success`, {
    method: "POST"
  });
}

/**
 * Marks a mock payment as failed.
 * @param {string|number} paymentId - The payment identifier.
 * @returns {Promise<Object>} Updated payment data.
 */
async function markMockPaymentFail(paymentId) {
  if (!paymentId) throw new Error("Payment ID is required.");
  return await apiRequest(`/api/payments/mock/${paymentId}/fail`, {
    method: "POST"
  });
}

/**
 * Cancels a pending mock payment.
 * @param {string|number} paymentId - The payment identifier.
 * @returns {Promise<Object>} Updated payment data.
 */
async function cancelMockPayment(paymentId) {
  if (!paymentId) throw new Error("Payment ID is required.");
  return await apiRequest(`/api/payments/mock/${paymentId}/cancel`, {
    method: "POST"
  });
}

/**
 * Retrieves the current user's payment history.
 * @returns {Promise<Object>} List of past payments for the logged-in user.
 */
async function getMyPayments() {
  return await apiRequest("/api/payments/my", {
    method: "GET"
  });
}