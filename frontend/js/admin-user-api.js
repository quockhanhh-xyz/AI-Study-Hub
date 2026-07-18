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
    // For file downloads, we can't easily use fetch() if we want the browser to handle the save dialog seamlessly
    // unless we use Blob. But since it's a GET request and secured via cookie (HttpOnly), 
    // we can just use window.location.href or an anchor tag if the backend supports cookie auth for this endpoint.
    // However, if the frontend sends a Bearer token, we MUST use fetch and Blob.
    // The project uses Cookie Auth Flow Mode as seen in layout.js ("Backend to clear HttpOnly auth session cookies").
    // Therefore, a simple window.open or window.location.href works perfectly.
    
    const query = new URLSearchParams(params).toString();
    const endpoint = `/api/admin/users/export${query ? '?' + query : ''}`;
    window.location.href = endpoint;
}
