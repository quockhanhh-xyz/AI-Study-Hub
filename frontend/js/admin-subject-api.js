/**
 * Admin API Helpers for System Subject Management
 */

function getAdminSubjects(params = {}) {
    const query = new URLSearchParams(params).toString();
    const endpoint = query ? `/api/admin/subjects?${query}` : '/api/admin/subjects';
    return get(endpoint);
}

function createAdminSubject(data) {
    return post('/api/admin/subjects', data);
}

function updateAdminSubject(subjectId, data) {
    return put(`/api/admin/subjects/${subjectId}`, data);
}

function updateAdminSubjectStatus(subjectId, status) {
    const endpoint = `/api/admin/subjects/${subjectId}/status`;
    return apiRequest(endpoint, { method: "PATCH", body: { status } });
}

function exportAdminSubjects(params = {}) {
    const query = new URLSearchParams(params).toString();
    const endpoint = query ? `/api/admin/subjects/export?${query}` : '/api/admin/subjects/export';
    
    const url = typeof API_BASE_URL !== 'undefined' ? `${API_BASE_URL}${endpoint}` : endpoint;
    return fetch(url, {
        method: 'GET',
        credentials: 'include'
    }).then(response => {
        if (!response.ok) throw new Error('Export failed');
        return response.blob();
    });
}
