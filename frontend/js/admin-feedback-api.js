/**
 * API Helpers for Admin Feedback Management
 */

function getAdminReviews(params = {}) {
    const query = new URLSearchParams(params).toString();
    const endpoint = query ? `/api/admin/system-reviews?${query}` : '/api/admin/system-reviews';
    return get(endpoint);
}

function getAdminReviewDetails(reviewId) {
    return get(`/api/admin/system-reviews/${reviewId}`);
}

function getAdminReviewStatistics() {
    return get('/api/admin/system-reviews/statistics');
}

function updateAdminReviewStatus(reviewId, status) {
    const endpoint = `/api/admin/system-reviews/${reviewId}/status`;
    return apiRequest(endpoint, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
    });
}

function addAdminReviewReply(reviewId, content) {
    return post(`/api/admin/system-reviews/${reviewId}/replies`, { content });
}
