/**
 * Folder Management API Helpers for AI Study Hub.
 * Leverages global request shorthands from api.js to ensure unified header/token handling.
 * Strictly adheres to specifications detailed in docs/api-contract.md.
 */

/**
 * Creates a new folder for the currently authenticated user.
 * @param {Object} data - Folder details, e.g., { name: "Math Notes" }
 * @returns {Promise<Object>} The created folder object metadata from the server.
 */
function createFolder(data) {
  return post("/api/folders", data);
}

function getMyFolders(parentFolderId = null) {
  const params = new URLSearchParams();

  if (
    parentFolderId !== null &&
    parentFolderId !== undefined &&
    parentFolderId !== ""
  ) {
    params.append("parentFolderId", parentFolderId);
  }

  const query = params.toString();
  return get(query ? `/api/folders/my?${query}` : "/api/folders/my");
}

/**
 * Fetches technical metadata and inner contents of a specific folder.
 * @param {string|number} id - The unique folder identifier.
 * @returns {Promise<Object>} Complete folder detailed metadata from the server.
 */
function getFolderById(id) {
  return get(`/api/folders/${id}`);
}

/**
 * Updates an existing folder's properties (e.g., changing its name).
 * @param {string|number} id - The unique folder identifier.
 * @param {Object} data - Patched fields, e.g., { name: "Calculus Notes" }
 * @returns {Promise<Object>} The updated folder object state.
 */
function updateFolder(id, data) {
  return put(`/api/folders/${id}`, data);
}

/**
 * Soft-deletes a folder by moving it into the system trash layer.
 * @param {string|number} id - The unique folder identifier.
 * @returns {Promise<Object>} Server confirmation message packet.
 */
function deleteFolder(id) {
  return del(`/api/folders/${id}`);
}

/**
 * Restores a soft-deleted folder back onto the active workspace view.
 * @param {string|number} id - The unique folder identifier from the trash pile.
 * @returns {Promise<Object>} Server confirmation response data.
 */
function restoreFolder(id) {
  return post(`/api/trash/folders/${id}/restore`);
}

/**
 * Permanently purges a folder and its references out of the database layer.
 * @param {string|number} id - The unique folder identifier to destroy.
 * @returns {Promise<Object>} Final server purge confirmation response status.
 */
function permanentDeleteFolder(id) {
  return del(`/api/trash/folders/${id}`);
}

// End of folder management API subsystem configurations.

