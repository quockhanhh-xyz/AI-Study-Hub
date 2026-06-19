/*
 * Retrieves the list of all available subjects (Master Data).
 * Used for the Dashboard filter (FE1) and the dropdown menu in the Upload page (FE3).
 * @returns {Promise} Returns the list of subjects based on the API contract documentation.
 */
function getSubjects() {
  return get("/api/subjects");
}