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
    
    return exportAdminData(endpoint, `AI_Usage_${new Date().toISOString().split('T')[0]}.xlsx`);
}
