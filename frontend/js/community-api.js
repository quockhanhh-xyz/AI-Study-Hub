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
    const keyword = params.keyword || params.search;

    if (keyword) {
      queryParts.push(`keyword=${encodeURIComponent(keyword)}`);
    }

    if (params.subjectId) {
      queryParts.push(`subjectId=${encodeURIComponent(params.subjectId)}`);
    }

    if (params.fileType) {
      queryParts.push(`fileType=${encodeURIComponent(params.fileType)}`);
    }

    if (params.schoolId) {
      queryParts.push(`schoolId=${encodeURIComponent(params.schoolId)}`);
    }

    if (params.majorId) {
      queryParts.push(`majorId=${encodeURIComponent(params.majorId)}`);
    }

    if (params.sort) {
      queryParts.push(`sort=${encodeURIComponent(params.sort)}`);
    }

    const queryString = queryParts.length > 0 ? `?${queryParts.join("&")}` : "";

    // Explicitly uses global get utility wrapper with bypass redirect flag for custom error processing
    return await get(`/api/documents/public${queryString}`, { skipUnauthorizedRedirect: true });
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
    return await get(`/api/documents/public/${id}`, { skipUnauthorizedRedirect: true });
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
    if ((error?.status || 0) >= 500) {
      console.error(`Failed to execute community publish catalog sequence transaction for item ID ${id}:`, error);
    }
    throw error;
  }
}

async function unpublishDocument(id) {
  if (!id) throw new Error("Document ID identifier validation criteria missing");
  try {
    return await put(`/api/documents/${id}/unpublish`);
  } catch (error) {
    console.error(`Failed to execute community unpublish action transaction for catalog registry element ID ${id}:`, error);
    throw error;
  }
}

/**
 * Downloads a public document without requiring authentication.
 * @param {string|number} id - Public document identifier.
 */
function downloadPublicDocument(documentOrId) {
  const id = typeof documentOrId === "object"
    ? (documentOrId.documentId || documentOrId.id)
    : documentOrId;

  if (!id) {
    console.error("Public download aborted: document identifier is missing.");
    return;
  }

  if (typeof documentOrId === "object" && documentOrId.downloadUrl) {
    window.location.href = API_BASE_URL + documentOrId.downloadUrl;
    return;
  }

  window.location.href = `${API_BASE_URL}/api/documents/public/${id}/download`;
}

/**
 * Fetches the list of subjects linked to public documents.
 * @returns {Promise<Object>} List of public subjects.
 */
async function getPublicSubjects() {
  try {
    return await get("/api/subjects/public", { skipUnauthorizedRedirect: true });
  } catch (error) {
    console.error("Failed to retrieve public subjects:", error);
    throw error;
  }
}

/**
 * Submits a violation report for a public document.
 */
async function reportDocument(documentId, data) {
  return post(`/api/public/documents/${documentId}/reports`, data);
}

/**
 * Checks if the current user has already reported this document.
 */
async function getReportStatus(documentId) {
  return get(`/api/public/documents/${documentId}/report-status`);
}

/**
 * Retrieves the rating summary (average rating, count, my rating) for a public document.
 */
async function getRatingsSummary(documentId) {
  return get(`/api/public/documents/${documentId}/ratings/summary`, { skipUnauthorizedRedirect: true });
}

/**
 * Rates a public document (1 to 5 stars).
 */
async function rateDocument(documentId, rating) {
  return put(`/api/public/documents/${documentId}/ratings/me`, { rating });
}

/**
 * Deletes the user's rating for a public document.
 */
async function deleteRating(documentId) {
  return del(`/api/public/documents/${documentId}/ratings/me`);
}

/**
 * Admin: Retrieves the list of document reports.
 */
async function getAdminReports(status = "", reason = "", search = "", page = 0, size = 10) {
  const params = new URLSearchParams();
  if (status) params.append("status", status);
  if (reason) params.append("reason", reason);
  if (search) params.append("search", search);
  params.append("page", page);
  params.append("size", size);
  return get(`/api/admin/document-reports?${params.toString()}`, { skipUnauthorizedRedirect: true });
}

/**
 * Admin: Resolves a document report (unpublishes document).
 */
async function resolveReport(reportId, resolutionNote = "") {
  return patch(`/api/admin/document-reports/${reportId}/resolve`, { resolutionNote }, { skipUnauthorizedRedirect: true });
}

/**
 * Admin: Dismisses a document report.
 */
async function dismissReport(reportId, resolutionNote = "") {
  return patch(`/api/admin/document-reports/${reportId}/dismiss`, { resolutionNote }, { skipUnauthorizedRedirect: true });
}

/**
 * Admin: Exports reports to Excel.
 */
function exportAdminReports(params = {}) {
  const query = new URLSearchParams(params).toString();
  const endpoint = query ? `/api/admin/document-reports/export?${query}` : '/api/admin/document-reports/export';
  return exportAdminData(endpoint, `Violation_Reports_${new Date().toISOString().split('T')[0]}.xlsx`);
}

