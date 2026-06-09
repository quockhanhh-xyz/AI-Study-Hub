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
function getMyDocuments(params) {
  if (params && Object.keys(params).length > 0) {
    const queryString = new URLSearchParams(params).toString();
    return get(`/api/documents/my?${queryString}`);
  }
  return get("/api/documents/my");
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
 * Serves the Search, Subject, and File Type filters on the Dashboard (FE1).
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
