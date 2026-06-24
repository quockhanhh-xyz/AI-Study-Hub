/**
 * Core API services for Subject Master Data.
 * Standardized in Step 6D to utilize global API wrappers.
 */

/**
 * Retrieves the list of all available subjects.
 * Used for the Dashboard filter and the dropdown/modal menus in the Upload page.
 * @returns {Promise<Object>} Returns backend payload with available subjects list.
 */
function getSubjects() {
  return get("/api/subjects");
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

// End of subject API helper file.