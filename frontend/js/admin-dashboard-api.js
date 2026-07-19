/**
 * API Helper for Admin Dashboard
 */

/**
 * Fetch the admin dashboard summary data
 * Endpoint: GET /api/admin/dashboard/summary
 * @returns {Promise<Object>} Dashboard summary data
 */
async function fetchAdminDashboardSummary() {
    return await fetchAdmin('/api/admin/dashboard/summary', { method: 'GET' });
}

/**
 * Fetch the admin dashboard charts data
 * Endpoint: GET /api/admin/dashboard/charts
 * @returns {Promise<Object>} Dashboard charts data
 */
async function fetchAdminDashboardCharts() {
    return await fetchAdmin('/api/admin/dashboard/charts', { method: 'GET' });
}
