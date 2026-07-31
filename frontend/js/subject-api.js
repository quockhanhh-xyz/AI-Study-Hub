/**
 * Core API services for Subject Master Data.
 * Standardized in Step 6D to utilize global API wrappers.
 */

/**
 * Retrieves the list of all available subjects.
 * Used for the Dashboard filter and the dropdown/modal menus in the Upload page.
 * @returns {Promise<Object>} Returns backend payload with available subjects list.
 */
function getSubjects(majorId = "") {
  const query = majorId ? `?majorId=${encodeURIComponent(majorId)}` : "";
  return get(`/api/subjects${query}`);
}

/**
 * Creates a new subject entry as a user-owned custom subject.
 * Step 6D: matches the BE2 endpoint signature for custom subject creation.
 * @param {Object} subjectData - { subjectCode, subjectName, description? }
 * @returns {Promise<Object>} Returns backend response payload.
 */
function createSubject(subjectData) {
  return post("/api/subjects/custom", subjectData);
}

/**
 * Retrieves the list of subjects in My Library context, which includes
 * SYSTEM subjects and PERSONAL (user custom) subjects, along with ownership
 * checks and document counts.
 */
function getMyLibrarySubjects() {
  return get("/api/subjects/my-library");
}

/**
 * Retrieves the paginated list of user's own documents for a given subject.
 */
function getSubjectDocuments(subjectId, page = 0, size = 10) {
  return get(`/api/subjects/${subjectId}/documents?page=${page}&size=${size}`);
}

/**
 * Updates a custom subject (only editable by the owner).
 */
function updateCustomSubject(subjectId, subjectData) {
  return put(`/api/subjects/${subjectId}`, subjectData);
}

/**
 * Deletes a custom subject (only allowed if it has no active documents on the system).
 */
function deleteCustomSubject(subjectId) {
  return del(`/api/subjects/${subjectId}`);
}

// End of subject API helper file.
