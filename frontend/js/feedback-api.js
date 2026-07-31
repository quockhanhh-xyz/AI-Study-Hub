/**
 * API Helpers for User Feedback & Ratings
 */

function submitSystemReview(data) {
    return post('/api/system-reviews', data);
}

function getMySystemReview() {
    return get('/api/system-reviews/me');
}

function updateSystemReview(reviewId, data) {
    return put(`/api/system-reviews/${reviewId}`, data);
}

function deleteSystemReview(reviewId) {
    return apiRequest(`/api/system-reviews/${reviewId}`, { method: 'DELETE' });
}

function getReviewReplies(reviewId) {
    return get(`/api/system-reviews/${reviewId}/replies`);
}

function addReviewReply(reviewId, content) {
    return post(`/api/system-reviews/${reviewId}/replies`, { content });
}
