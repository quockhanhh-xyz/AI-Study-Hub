/**
 * FE3 Document Management API Helpers (Extended for Step 6A)
 * Branch: feature/frontend-sharing-group-api-helper
 */

/*
 * Uploads a document, accepting a single FormData object constructed from the UI.
 * Matches 100% with line 186 in the old upload.js file.
 * @param {FormData} formData - FormData object containing file, title, description, folderId, and subjectId.
 */
function uploadDocument(formData) {
  return post("/api/documents/upload", formData);
}

/*
 * Retrieves the personal document list of the currently authenticated user.
 * Supports standard filters including folderId and includeSubfolders flags.
 */
function getMyDocuments(params = {}) {
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== "" && value !== null && value !== undefined)
  );
  const queryString = new URLSearchParams(cleanParams).toString();
  return get(queryString ? `/api/documents/my?${queryString}` : "/api/documents/my");
}

/*
 * Advanced document search and filtering helper.
 * Supports keyword, subjectId, fileType, folderId, and includeSubfolders query parameters.
 * @param {Object} params - Search and filter parameters.
 * @returns {Promise} Filtered list of documents.
 */
function searchDocuments(params) {
  return getMyDocuments(params);
}

/*
 * Retrieves the detailed information of a specific document by its ID.
 * Serves the Document Details view page (FE2) and Share validation contexts (Step 6A).
 * @param {number|string} id - The ID of the document to retrieve.
 * @returns {Promise} Detailed document data (file URL, title, description, subject...).
 */
function getDocumentById(id) {
  return get(`/api/documents/${id}`);
}

/*
 * Updates the metadata (text information) of a document.
 * Serves the edit information feature on the Details page (FE2).
 * @param {number|string} id - The ID of the document to edit.
 * @param {Object} data - Object containing new details { title, description, subjectId }.
 * @returns {Promise} Update response from the Backend.
 */
function updateDocument(id, data) {
  return put(`/api/documents/${id}`, data);
}

/*
 * Deletes a document from the system by its ID (Soft Delete).
 * Serves the document deletion feature on the Details page (FE2).
 * @param {number|string} id - The ID of the document to delete.
 * @returns {Promise} Deletion response from the Backend.
 */
function deleteDocument(id) {
  return del(`/api/documents/${id}`);
}

/* ==========================================================================
    STEP 5 ADDITIONS: FOLDER INTEGRATION, TRASH & LIFECYCLE MANAGEMENT
   ========================================================================== */

/*
 * Moves a specific document into a target folder.
 * @param {number|string} documentId - The unique document identifier.
 * @param {number|string} folderId - The target folder identifier destination.
 * @returns {Promise} Server confirmation metadata response.
 */
function moveDocument(documentId, folderId) {
  return put(`/api/documents/${documentId}/move`, { folderId });
}

/*
 * Retrieves the unified list of soft-deleted assets (both folders and documents) inside the trash.
 * @returns {Promise} List containing deleted folders and independent documents.
 */
function getTrash() {
  return get("/api/trash");
}

/*
 * Restores a soft-deleted document from the trash back to the active repository list.
 * Note: Per Step 6A rules, restoring an active shared record makes it visible again.
 * @param {number|string} id - The unique document identifier to restore.
 * @returns {Promise} Server operation response confirmation payload.
 */
function restoreDocument(id) {
  return post(`/api/trash/documents/${id}/restore`);
}

/*
 * Permanently purges a single soft-deleted document out of the file system and DB.
 * @param {number|string} id - The unique document identifier to eradicate.
 * @returns {Promise} Final purge response status confirmation from the database.
 */
function permanentDeleteDocument(id) {
  return del(`/api/trash/documents/${id}`);
}