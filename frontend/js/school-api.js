/**
 * Public/User API services for School & Major Master Data.
 */

/**
 * Retrieves the list of all active schools.
 * @param {String} keyword - Search term filter
 * @returns {Promise<Object>}
 */
function getActiveSchools(keyword = "") {
  const queryParams = keyword ? `?keyword=${encodeURIComponent(keyword)}` : "";
  return get(`/api/schools${queryParams}`);
}

/**
 * Retrieves the list of active majors for a given school.
 * @param {Number} schoolId
 * @returns {Promise<Object>}
 */
function getActiveMajors(schoolId) {
  if (!schoolId) return Promise.resolve({ success: true, data: [] });
  return get(`/api/schools/${schoolId}/majors`);
}
