/**
 * API Helper for Admin Users
 */

/**
 * Fetch users list with pagination and filters
 * @param {Object} params - Query parameters (search, role, tier, status, page, size, sortBy, direction)
 * @returns {Promise<Object>} Response containing users array and pagination metadata
 */
async function fetchAdminUsers(params = {}) {
    const query = new URLSearchParams(params).toString();
    const endpoint = `/api/admin/users${query ? '?' + query : ''}`;
    return await fetchAdmin(endpoint, { method: 'GET' });
}

/**
 * Update user status (e.g. Block / Unblock)
 * @param {number} userId
 * @param {string} status - "ACTIVE" or "BLOCKED"
 * @returns {Promise<Object>}
 */
async function updateAdminUserStatus(userId, status) {
    return await fetchAdmin(`/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        body: { status }
    });
}

/**
 * Trigger export users download
 * @param {Object} params - Query parameters (search, role, tier, status)
 */
function exportAdminUsers(params = {}) {
    const query = new URLSearchParams(params).toString();
    const endpoint = `/api/admin/users/export${query ? '?' + query : ''}`;
    exportAdminData(endpoint, 'users.xlsx');
}
