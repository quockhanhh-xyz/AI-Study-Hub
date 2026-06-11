/*
 * Uploads a document, accepting a single FormData object constructed from the UI.
 * Matches 100% with line 186 in the old upload.js file.
 * @param {FormData} formData - FormData object containing file, title, description, and subjectId.
 */
function uploadDocument(formData) {
  // Pass the raw formData object directly into the post helper from api.js
  return post("/api/documents/upload", formData);
}

/*
 * Retrieves the personal document list of the currently authenticated user.
 */
function getMyDocuments(params = {}) {
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== "" && value !== null && value !== undefined)
  );
  const queryString = new URLSearchParams(cleanParams).toString();
  return get(queryString ? `/api/documents/my?${queryString}` : "/api/documents/my");
}

/*
 * Retrieves the list of all available subjects (Master Data).
 * Used for the Dashboard filter (FE1) and the dropdown menu in the Details page (FE2).
 * @returns {Promise} Returns the list of subjects based on the API contract documentation.
 */
function getSubjects() {
  return get("/api/subjects");
}

/*
 * Advanced document search and filtering helper.
 * Strictly requests the personal documents endpoint for the authenticated user.
 * Refactored to point exclusively to /api/documents/my via getMyDocuments helper.
 * @param {Object} params - Filter object containing { keyword, subjectId, fileType }.
 * @returns {Promise} Filtered list of documents matching the criteria.
 */
function searchDocuments(params) {
  return getMyDocuments(params);
}

/*
 * Retrieves the detailed information of a specific document by its ID.
 * Serves the Document Details view page (FE2).
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
 * Deletes a document from the system by its ID.
 * Serves the document deletion feature on the Details page (FE2).
 * @param {number|string} id - The ID of the document to delete.
 * @returns {Promise} Deletion response from the Backend.
 */
function deleteDocument(id) {
  return del(`/api/documents/${id}`);
}


/* Step 5
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
 * @param {number|string} id - The unique document identifier to restore.
 * @returns {Promise} Server operation response confirmation payload.
 */
function restoreDocument(id) {
  return post(`/api/documents/${id}/restore`);
}

/*
 * Permanently purges a single soft-deleted document out of the file system and DB.
 * @param {number|string} id - The unique document identifier to eradicate.
 * @returns {Promise} Final purge response status confirmation from the database.
 */
function permanentDeleteDocument(id) {
  return del(`/api/documents/${id}/permanent`);
}

// End of dynamic document data system api helpers file.