/**
 * FE3 Study Group Management API Helpers
 * Branch: feature/frontend-sharing-group-api-helper
 * Uses centralized request helpers from api.js.
 */

/**
 * Creates a new study group.
 * @param {Object} data - Example: { groupName, description }
 * @returns {Promise<Object>} Created group information.
 */
function createGroup(data) {
  return post("/api/groups", data);
}

/**
 * Retrieves all groups that belong to the current user.
 * Includes groups where the user is owner or member.
 * @returns {Promise<Array>} List of groups.
 */
function getMyGroups() {
  return get("/api/groups/my");
}

/**
 * Retrieves detailed information for a specific group.
 * @param {number|string} id - Group identifier.
 * @returns {Promise<Object>} Group details.
 */
function getGroupById(id) {
  return get(`/api/groups/${id}`);
}

/**
 * Joins a group using an invitation code.
 * @param {string} inviteCode - Group invitation code.
 * @returns {Promise<Object>} Join operation response.
 */
function joinGroup(inviteCode) {
  return post("/api/groups/join", { inviteCode });
}

/**
 * Allows the current user to leave a group.
 * @param {number|string} groupId - Group identifier.
 * @returns {Promise<Object>} Leave operation response.
 */
function leaveGroup(groupId) {
  return post(`/api/groups/${groupId}/leave`);
}

/**
 * Updates group information.
 * Owner permission is required.
 * @param {number|string} groupId - Group identifier.
 * @param {Object} data - Example: { groupName, description }.
 * @returns {Promise<Object>} Updated group information.
 */
function updateGroup(groupId, data) {
  return put(`/api/groups/${groupId}`, data);
}

/**
 * Deletes a group.
 * Owner permission is required.
 * @param {number|string} groupId - Group identifier.
 * @returns {Promise<Object>} Delete operation response.
 */
function deleteGroup(groupId) {
  return del(`/api/groups/${groupId}`);
}

/**
 * Removes a member from the group.
 * Owner permission is required.
 * @param {number|string} groupId - Group identifier.
 * @param {number|string} userId - User identifier.
 * @returns {Promise<Object>} Remove member response.
 */
function removeGroupMember(groupId, userId) {
  return del(`/api/groups/${groupId}/members/${userId}`);
}

/**
 * Retrieves all documents shared inside a group.
 * @param {number|string} groupId - Group identifier.
 * @returns {Promise<Array>} List of group documents.
 */
function getGroupDocuments(groupId) {
  return get(`/api/groups/${groupId}/documents`);
}

/**
 * Retrieves all folders shared inside a group.
 * Matches Contract 9.6: GET /api/groups/{id}/folders
 * @param {number|string} groupId - Group identifier.
 * @returns {Promise<Object>} List of group shared folders.
 */
function getGroupFolders(groupId) {
  return get(`/api/groups/${groupId}/folders`);
}

/**
 * Retrieves the list of pending members awaiting owner approval.
 * Owner permission is required.
 * @param {number|string} groupId - Group identifier.
 * @returns {Promise<Array>} List of pending members.
 */
function getPendingMembers(groupId) {
  return get(`/api/groups/${groupId}/members/pending`, { skipUnauthorizedRedirect: true });
}

/**
 * Approves a pending member's join request.
 * Owner permission is required.
 * @param {number|string} groupId - Group identifier.
 * @param {number|string} userId - User identifier.
 * @returns {Promise<Object>} Approve operation response.
 */
function approveGroupMember(groupId, userId) {
  return post(`/api/groups/${groupId}/members/${userId}/approve`);
}

/**
 * Rejects a pending member's join request.
 * Owner permission is required.
 * @param {number|string} groupId - Group identifier.
 * @param {number|string} userId - User identifier.
 * @returns {Promise<Object>} Reject operation response.
 */
function rejectGroupMember(groupId, userId) {
  return post(`/api/groups/${groupId}/members/${userId}/reject`);
}