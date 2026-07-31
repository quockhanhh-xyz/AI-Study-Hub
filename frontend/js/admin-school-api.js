/**
 * Admin API Helpers for School & Major Master Data Management
 */

function getAdminSchools(params = {}) {
    const query = new URLSearchParams(params).toString();
    const endpoint = query ? `/api/admin/schools?${query}` : '/api/admin/schools';
    return get(endpoint);
}

function createAdminSchool(data) {
    return post('/api/admin/schools', data);
}

function updateAdminSchool(schoolId, data) {
    return put(`/api/admin/schools/${schoolId}`, data);
}

function updateAdminSchoolStatus(schoolId, status) {
    const endpoint = `/api/admin/schools/${schoolId}/status?status=${encodeURIComponent(status)}`;
    return patch(endpoint);
}

function getAdminMajors(schoolId, params = {}) {
    const query = new URLSearchParams(params).toString();
    const endpoint = query ? `/api/admin/schools/${schoolId}/majors?${query}` : `/api/admin/schools/${schoolId}/majors`;
    return get(endpoint);
}

function createAdminMajor(schoolId, data) {
    return post(`/api/admin/schools/${schoolId}/majors`, data);
}

function updateAdminMajor(schoolId, majorId, data) {
    return put(`/api/admin/schools/${schoolId}/majors/${majorId}`, data);
}

function updateAdminMajorStatus(schoolId, majorId, status) {
    const endpoint = `/api/admin/schools/${schoolId}/majors/${majorId}/status?status=${encodeURIComponent(status)}`;
    return patch(endpoint);
}
