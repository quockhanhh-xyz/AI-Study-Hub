/**
 * Admin API Helpers for AI Usage Monitoring
 */

function getAdminAiUsage(params = {}) {
    const query = new URLSearchParams(params).toString();
    const endpoint = query ? `/api/admin/ai-usage?${query}` : '/api/admin/ai-usage';
    return get(endpoint);
}

function exportAdminAiUsage(params = {}) {
    const query = new URLSearchParams(params).toString();
    const endpoint = query ? `/api/admin/ai-usage/export?${query}` : '/api/admin/ai-usage/export';
    
    const url = typeof API_BASE_URL !== 'undefined' ? `${API_BASE_URL}${endpoint}` : endpoint;
    return fetch(url, {
        method: 'GET',
        credentials: 'include'
    }).then(response => {
        if (!response.ok) throw new Error('Export failed');
        return response.blob();
    });
}
