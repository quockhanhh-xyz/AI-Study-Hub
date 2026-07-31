/**
 * Admin Payments API Service
 * Wraps the core admin API logic for payment-specific endpoints.
 */

/**
 * Fetches a paginated list of payments with optional filters.
 * @param {Object} params - Query parameters (search, plan, status, provider, startDate, endDate, page, size, sortBy, direction)
 * @returns {Promise<Object>} The API response containing payment data and pagination info.
 */
async function getAdminPayments(params = {}) {
    const query = new URLSearchParams();

    if (params.search) query.append('search', params.search);
    if (params.plan) query.append('plan', params.plan);
    if (params.status) query.append('status', params.status);
    if (params.provider) query.append('provider', params.provider);
    if (params.startDate) query.append('startDate', params.startDate);
    if (params.endDate) query.append('endDate', params.endDate);
    if (params.page !== undefined) query.append('page', params.page);
    if (params.size !== undefined) query.append('size', params.size);
    if (params.sortBy) query.append('sortBy', params.sortBy);
    if (params.direction) query.append('direction', params.direction);

    const queryString = query.toString();
    const endpoint = `/api/admin/payments${queryString ? `?${queryString}` : ''}`;

    return fetchAdmin(endpoint, { method: 'GET' });
}

/**
 * Fetches details for a specific payment.
 * @param {number} paymentId - The ID of the payment to retrieve.
 * @returns {Promise<Object>} The API response containing payment details.
 */
async function getAdminPaymentById(paymentId) {
    return fetchAdmin(`/api/admin/payments/${paymentId}`, { method: 'GET' });
}

/**
 * Exports payments to an Excel file.
 * @param {Object} params - Query parameters for filtering the export.
 */
function exportAdminPayments(params = {}) {
    const query = new URLSearchParams();

    if (params.search) query.append('search', params.search);
    if (params.plan) query.append('plan', params.plan);
    if (params.status) query.append('status', params.status);
    if (params.provider) query.append('provider', params.provider);
    if (params.startDate) query.append('startDate', params.startDate);
    if (params.endDate) query.append('endDate', params.endDate);

    const queryString = query.toString();
    const endpoint = `/api/admin/payments/export${queryString ? `?${queryString}` : ''}`;

    // Call the unified export function from admin-core-api.js
    exportAdminData(endpoint, 'payments.xlsx');
}
