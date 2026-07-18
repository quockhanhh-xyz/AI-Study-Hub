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
    return apiRequest(endpoint, { method: "PATCH", body: JSON.stringify({ status }) });
}

function exportAdminSubjects(params = {}) {
    const query = new URLSearchParams(params).toString();
    const endpoint = query ? `/api/admin/subjects/export?${query}` : '/api/admin/subjects/export';
    
    return exportAdminData(endpoint, `Subjects_${new Date().toISOString().split('T')[0]}.xlsx`);
}
