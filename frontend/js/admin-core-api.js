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
