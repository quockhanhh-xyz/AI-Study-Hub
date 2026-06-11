/**
 * Folder Management API Helpers for AI Study Hub.
 * Leverages global request shorthands from api.js to ensure unified header/token handling.
 */

/**
 * Creates a new folder for the authenticated user.
 * @param {Object} data - Folder details, e.g., { name: "Java Web Development" }
 * @returns {Promise<Object>} The created folder object metadata from the server.
 */
async function createFolder(data) {
  return await post("/api/folders", data);
}

/**
 * Retrieves all active (non-trashed) folders belonging to the current user.
 * @returns {Promise<Array>} List of the user's active folder objects.
 */
async function getMyFolders() {
  return await get("/api/folders");
}

/**
 * Fetches technical metadata and inner contents of a specific folder.
 * @param {string|number} id - The unique folder identifier.
 * @returns {Promise<Object>} Complete folder detailed metadata from the server.
 */
async function getFolderById(id) {
  return await get(`/api/folders/${id}`);
}

/**
 * Updates an existing folder's properties (e.g., changing its name).
 * @param {string|number} id - The unique folder identifier.
 * @param {Object} data - Patched fields, e.g., { name: "New Folder Name" }
 * @returns {Promise<Object>} The updated folder object state.
 */
async function updateFolder(id, data) {
  return await put(`/api/folders/${id}`, data);
}

/**
 * Soft-deletes a folder by moving it into the system trash layer.
 * @param {string|number} id - The unique folder identifier.
 * @returns {Promise<Object>} Server confirmation message packet.
 */
async function deleteFolder(id) {
  return await del(`/api/folders/${id}`);
}

/**
 * Restores a soft-deleted folder back onto the active workspace view.
 * @param {string|number} id - The unique folder identifier from the trash pile.
 * @returns {Promise<Object>} Server confirmation response data.
 */
async function restoreFolder(id) {
  return await post(`/api/folders/${id}/restore`);
}

/**
 * Permanently purges a folder and its references out of the database database layer.
 * @param {string|number} id - The unique folder identifier to destroy.
 * @returns {Promise<Object>} Final server purge confirmation response status.
 */
async function permanentDeleteFolder(id) {
  return await del(`/api/folders/${id}/permanent`);
}

// End of folder management API subsystem configurations.