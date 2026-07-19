function getAdminSubjectRequests(params = {}) {
    const query = new URLSearchParams(params).toString();
    const endpoint = query ? `/api/admin/subject-requests?${query}` : '/api/admin/subject-requests';
    return get(endpoint);
}

function approveAdminSubjectRequest(requestId) {
    return apiRequest(`/api/admin/subject-requests/${requestId}/approve`, { method: "PATCH" });
}

function rejectAdminSubjectRequest(requestId, rejectReason = '') {
    return apiRequest(`/api/admin/subject-requests/${requestId}/reject`, { 
        method: "PATCH", 
        body: { rejectReason } 
    });
}

function exportAdminSubjectRequests(params = {}) {
    const query = new URLSearchParams(params).toString();
    const endpoint = query ? `/api/admin/subject-requests/export?${query}` : '/api/admin/subject-requests/export';
    return exportAdminData(endpoint, `Subject_Requests_${new Date().toISOString().split('T')[0]}.xlsx`);
}
