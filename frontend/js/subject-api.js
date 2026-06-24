/*
 * Retrieves the list of all available subjects (Master Data).
 * Used for the Dashboard filter (FE1) and the dropdown menu in the Upload page (FE3).
 * @returns {Promise} Returns the list of subjects based on the API contract documentation.
 */
function getSubjects() {
  return get("/api/subjects");
}
/*
 * Creates a new custom subject for the currently authenticated user.
 * Used by the Upload page (Step 6D) to let users define a subject on the fly.
 * @param {Object} data - Subject details, e.g., { subjectName: "Custom Subject" }.
 */
function createSubject(data) {
  return post("/api/subjects/custom", data);
}