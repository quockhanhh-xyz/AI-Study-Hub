/**
 * Core API helpers for Admin functionality.
 * This file provides wrappers around the base API methods to ensure
 * admin-specific headers or error handling can be centralized.
 */

/**
 * Normalizes the user role. If the backend returns ROLE_ADMIN, it converts it to ADMIN.
 * @param {string} role
 * @returns {string} Normalized role
 */
function normalizeAdminRole(role) {
    if (!role) return 'USER';
    if (role === 'ROLE_ADMIN') return 'ADMIN';
    return role;
}

/**
 * Base fetch wrapper for admin requests.
 * @param {string} endpoint
 * @param {object} options
 * @returns {Promise<any>}
 */
async function fetchAdmin(endpoint, options = {}) {
    try {
        const userStr = localStorage.getItem("currentUser");
        if (!userStr) {
            window.location.href = "login.html";
            throw new Error("No user session found");
        }

        const user = JSON.parse(userStr);
        if (normalizeAdminRole(user.role) !== 'ADMIN') {
            console.warn("Access denied. Admin privileges required.");
            window.location.href = "dashboard.html";
            throw new Error("Access denied");
        }

        // We use the existing base API methods (get, post, patch, etc.)
        // But if needed, we can inject admin specific headers here

        // This is a placeholder for actual fetch logic using api.js
        // For GET requests we'll just use the global get() from api.js
        const method = options.method ? options.method.toLowerCase() : 'get';

        if (method === 'get') {
            return await get(endpoint, options);
        } else if (method === 'post') {
            return await post(endpoint, options.body, options);
        } else if (method === 'patch') {
            return await patch(endpoint, options.body, options);
        } else if (method === 'put') {
            return await put(endpoint, options.body, options);
        } else if (method === 'delete') {
            return await del(endpoint, options);
        }

    } catch (error) {
        console.error(`Admin API Error (${endpoint}):`, error);
        throw error;
    }
}

/**
 * Downloads a file from the admin API using fetch with credentials.
 * @param {string} endpoint
 * @param {string} filename
 */
async function exportAdminData(endpoint, filename) {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            },
            credentials: 'include'
        });

        if (response.status === 401) {
            try {
                const data = await response.clone().json();
                if (data && data.code === "AUTH_ACCOUNT_BLOCKED") {
                    alert("Your account has been blocked by an administrator.");
                }
            } catch (e) {}
            localStorage.removeItem("currentUser");
            window.location.href = "login.html";
            return;
        }

        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            const data = await response.json();
            if (data && data.code === "AUTH_ACCOUNT_BLOCKED") {
                alert("Your account has been blocked by an administrator.");
                localStorage.removeItem("currentUser");
                window.location.href = "login.html";
                return;
            }
            throw new Error(data.message || data.error || `Export failed: ${response.status}`);
        }

        if (!response.ok) {
            throw new Error(`Export failed with status: ${response.status}`);
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
    } catch (error) {
        console.error('Export Data Error:', error);
        alert('Failed to export data. Please try again.');
    }
}
