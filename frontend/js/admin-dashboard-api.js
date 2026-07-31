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
 * @param {number} days - Number of days to fetch data for (e.g., 7, 30, 31)
 * @returns {Promise<Object>} Dashboard charts data
 */
async function fetchAdminDashboardCharts(days = 30) {
    return await fetchAdmin(`/api/admin/dashboard/charts?days=${days}`, { method: 'GET' });
}
