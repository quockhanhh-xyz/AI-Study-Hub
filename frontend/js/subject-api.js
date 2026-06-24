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
 * Creates a new subject entry into the system catalog.
 * Added in Step 6D to support on-the-fly subject creation during document uploads.
 * @param {Object} subjectData - Example: { code: "PRJ301", name: "Java Web Application Development" }
 * @returns {Promise<Object>} Returns backend response payload.
 */
function createSubject(subjectData) {
  return post("/api/subjects", subjectData);
}

// End of subject API helper file.