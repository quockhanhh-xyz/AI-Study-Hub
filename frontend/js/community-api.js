/**
 * Community Library API Helper Manager.
 * Handles all public document fetching, filtering, and publishing state management.
 * Formulated in Step 8 for Public Community Library MVP.
 */

/**
 * Fetches a list of approved public documents from the community library registry.
 * Accessible by both guests (unauthenticated) and logged-in users.
 * @param {Object} params - Search, filtering, and sorting parameters.
 * @returns {Promise<Object>} Backend common response format wrapper containing document array.
 */
async function getPublicDocuments(params = {}) {
  try {
    const queryParts = [];
    if (params.search) queryParts.push(`search=${encodeURIComponent(params.search)}`);
    if (params.sortBy) queryParts.push(`sortBy=${encodeURIComponent(params.sortBy)}`);
    if (params.sortOrder) queryParts.push(`sortOrder=${encodeURIComponent(params.sortOrder)}`);
    if (params.page) queryParts.push(`page=${encodeURIComponent(params.page)}`);
    if (params.limit) queryParts.push(`limit=${encodeURIComponent(params.limit)}`);

    const queryString = queryParts.length > 0 ? `?${queryParts.join("&")}` : "";
    
    // Explicitly uses global get utility wrapper with bypass redirect flag for custom error processing
    return await get(`/api/public/documents${queryString}`, { skipUnauthorizedRedirect: true });
  } catch (error) {
    console.error("Failed to retrieve public community documents:", error);
    throw error;
  }
}

/**
 * Retrieves granular detail metrics for a targeted public document.
 * Leveraged primarily by unauthenticated guest entities to load previews.
 * @param {string|number} id - Target physical document unique identifier token.
 * @returns {Promise<Object>} Specific public document metadata details configuration context.
 */
async function getPublicDocumentById(id) {
  if (!id) throw new Error("Document ID validation constraint violation: field is mandatory");
  try {
    return await get(`/api/public/documents/${id}`, { skipUnauthorizedRedirect: true });
  } catch (error) {
    console.error(`Failed to fetch public document context metrics for reference registry element ID ${id}:`, error);
    throw error;
  }
}

/**
 * Instructs backend platform to transition an owned document into the public community pool.
 * Elevates document permission metrics to visibility: PUBLIC and status: APPROVED.
 * @param {string|number} id - Target internal document sequence tracking identifier.
 * @returns {Promise<Object>} Standard synchronized modification response profile packet.
 */
async function publishDocument(id) {
  if (!id) throw new Error("Document ID identifier validation criteria missing");
  try {
    return await put(`/api/documents/${id}/publish`);
  } catch (error) {
    console.error(`Failed to execute community publish catalog sequence transaction for item ID ${id}:`, error);
    throw error;
  }
}

/**
 * Revokes public access rights for an owned document, transitioning state indexes back to PRIVATE layout.
 * Removes the targeted asset index from the public browse catalog registry instantly.
 * @param {string|number} id - Target internal document sequence tracking identifier.
 * @returns {Promise<Object>} Standard synchronized modification response profile packet.
 */
async function unpublishDocument(id) {
  if (!id) throw new Error("Document ID identifier validation criteria missing");
  try {
    return await put(`/api/documents/${id}/unpublish`);
  } catch (error) {
    console.error(`Failed to execute community unpublish action transaction for catalog registry element ID ${id}:`, error);
    throw error;
  }
}