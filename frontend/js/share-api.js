/**
 * FE3 Document Sharing Management API Helpers
 * Branch: feature/frontend-sharing-group-api-helper
 * Uses centralized request helpers from api.js.
 */

/**
 * Shares a document directly with another user by email.
 * @param {number|string} documentId - Document identifier.
 * @param {string} email - Recipient email address.
 * @returns {Promise<Object>} Share response.
 */
function shareDocumentToUser(documentId, email) {
  return post(`/api/documents/${documentId}/shares/users`, { email });
}

/**
 * Shares a document with a study group.
 * @param {number|string} documentId - Document identifier.
 * @param {number|string} groupId - Group identifier.
 * @returns {Promise<Object>} Share response.
 */
function shareDocumentToGroup(documentId, groupId) {
  return post(`/api/documents/${documentId}/shares/groups`, { groupId });
}

/**
 * Retrieves all documents shared with the current user.
 * @returns {Promise<Array>} Shared document list.
 */
function getSharedWithMe() {
  return get("/api/documents/shared-with-me");
}

/**
 * Retrieves all share records for a document.
 * @param {number|string} documentId - Document identifier.
 * @returns {Promise<Array>} Share records.
 */
function getDocumentShares(documentId) {
  return get(`/api/documents/${documentId}/shares`);
}

/**
 * Revokes a direct document share.
 * @param {number|string} shareId - Share identifier.
 * @returns {Promise<Object>} Operation response.
 */
function revokeDocumentShare(shareId) {
  return del(`/api/document-shares/${shareId}`);
}

/**
 * Revokes a group document share.
 * @param {number|string} shareId - Group share identifier.
 * @returns {Promise<Object>} Operation response.
 */
function revokeGroupDocumentShare(shareId) {
  return del(`/api/group-document-shares/${shareId}`);
}