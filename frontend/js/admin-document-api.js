/**
 * Admin API Helpers for Document Moderation
 */

function getAdminPublicDocuments(params = {}) {
    const query = new URLSearchParams(params).toString();
    const endpoint = query ? `/api/admin/documents/public?${query}` : '/api/admin/documents/public';
    return get(endpoint);
}

function approveAdminDocument(documentId) {
    return apiRequest(`/api/admin/documents/${documentId}/approve`, { method: "PATCH" });
}

function rejectAdminDocument(documentId) {
    return apiRequest(`/api/admin/documents/${documentId}/reject`, { method: "PATCH" });
}

function exportAdminPublicDocuments(params = {}) {
    const query = new URLSearchParams(params).toString();
    const endpoint = query ? `/api/admin/documents/public/export?${query}` : '/api/admin/documents/public/export';

    return exportAdminData(endpoint, `Public_Documents_${new Date().toISOString().split('T')[0]}.xlsx`);
}
