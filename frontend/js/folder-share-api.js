/**
 * FE3 Folder Sharing Management API Helpers (Aligned with API Contract 2026)
 * Branch: feature/frontend-folder-sharing-api-helper
 */

/**
 * Shares an active folder directly with another user via their unique Email address.
 * Matches Contract 9.1: POST /api/folders/{id}/shares/users
 * @param {string|number} folderId - Target folder identifier
 * @param {string} email - Recipient user's email address
 * @returns {Promise<Object>} Operational acknowledgment response containing share metadata
 */
async function shareFolderToUser(folderId, email) {
  try {
    return await post(`/api/folders/${folderId}/shares/users`, { email });
  } catch (error) {
    console.error(`Error sharing folder (${folderId}) to user email (${email}):`, error.message || error);
    throw error;
  }
}

/**
 * Shares an active folder into a specific active study group space.
 * Matches Contract 9.5: POST /api/folders/{id}/shares/groups
 * @param {string|number} folderId - Target folder identifier
 * @param {string|number} groupId - Target group identifier
 * @returns {Promise<Object>} Operational acknowledgment response containing group share metadata
 */
async function shareFolderToGroup(folderId, groupId) {
  try {
    return await post(`/api/folders/${folderId}/shares/groups`, { groupId });
  } catch (error) {
    console.error(`Error sharing folder (${folderId}) to group (${groupId}):`, error.message || error);
    throw error;
  }
}

/**
 * Compiles a list of folders that have been directly shared with the currently authenticated user.
 * Matches Contract 9.2: GET /api/folders/shared-with-me
 * @returns {Promise<Array>} List of shared folder asset profiles
 */
async function getFoldersSharedWithMe() {
  try {
    return await get("/api/folders/shared-with-me");
  } catch (error) {
    console.error("Error fetching folders shared with me:", error.message || error);
    throw error;
  }
}

/**
 * Retrieves the distribution roster list of all current active user and group shares assigned to a folder.
 * Matches Contract 9.3: GET /api/folders/{id}/shares
 * @param {string|number} folderId - Target folder identifier
 * @returns {Promise<Object>} Object containing arrays: { userShares: [], groupShares: [] }
 */
async function getFolderShares(folderId) {
  try {
    return await get(`/api/folders/${folderId}/shares`);
  } catch (error) {
    console.error(`Error fetching shares registry for folder (${folderId}):`, error.message || error);
    throw error;
  }
}

/**
 * Revokes a direct individual folder share record by changing its status to REVOKED.
 * Matches Contract 9.4: DELETE /api/folder-shares/{shareId}
 * @param {string|number} shareId - Direct user folder share relationship unique ID
 * @returns {Promise<Object>} Operational acknowledgment response
 */
async function revokeFolderShare(shareId) {
  try {
    return await del(`/api/folder-shares/${shareId}`);
  } catch (error) {
    console.error(`Error revoking direct user folder share (${shareId}):`, error.message || error);
    throw error;
  }
}

/**
 * Revokes a shared folder configuration record out of a group space context (status = REVOKED).
 * Matches Contract 9.7: DELETE /api/group-folder-shares/{shareId}
 * @param {string|number} shareId - Group folder share relationship unique ID
 * @returns {Promise<Object>} Operational acknowledgment response
 */
async function revokeGroupFolderShare(shareId) {
  try {
    return await del(`/api/group-folder-shares/${shareId}`);
  } catch (error) {
    console.error(`Error revoking folder share out of group context (${shareId}):`, error.message || error);
    throw error;
  }
}

/**
 * Fetches immediate subfolders and active documents directly contained inside a shared folder zone.
 * Matches Contract 9.8: GET /api/folders/{id}/shared-content
 * Enforces recursive parent folder access rules, level-by-level loading.
 * @param {string|number} folderId - Target shared folder identifier
 * @returns {Promise<Object>} Complete shared data payload including breadcrumbs and assets
 */
async function getSharedFolderContent(folderId) {
  try {
    return await get(`/api/folders/${folderId}/shared-content`);
  } catch (error) {
    console.error(`Error retrieving level-by-level content for shared folder (${folderId}):`, error.message || error);
    throw error;
  }
}