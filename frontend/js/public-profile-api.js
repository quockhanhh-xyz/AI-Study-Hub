/**
 * API layer helper functions for Public Profile & Follows
 */
(function() {
  "use strict";

  async function getPublicProfile(userId) {
    return get(`/api/users/${userId}/public-profile`, { skipUnauthorizedRedirect: true });
  }

  async function getPublicDocuments(userId, params = {}) {
    const query = new URLSearchParams();
    if (params.page !== undefined) query.append("page", params.page);
    if (params.size !== undefined) query.append("size", params.size);
    if (params.subjectId) query.append("subjectId", params.subjectId);
    if (params.fileType) query.append("fileType", params.fileType);
    if (params.keyword) query.append("keyword", params.keyword);

    return get(`/api/users/${userId}/public-documents?${query.toString()}`);
  }

  async function followUser(userId) {
    return post(`/api/users/${userId}/follow`);
  }

  async function unfollowUser(userId) {
    return del(`/api/users/${userId}/follow`);
  }

  // Expose methods globally
  window.profileApi = {
    getPublicProfile,
    getPublicDocuments,
    followUser,
    unfollowUser
  };
})();
