
/**
 * Hàm upload tài liệu nhận vào 1 tham số duy nhất là đối tượng FormData đã đúc sẵn từ UI
 * Khớp 100% với dòng 186 trong file upload.js cũ
 * @param {FormData} formData - Đối tượng FormData chứa file, title, description
 */
function uploadDocument(formData) {
  // Truyền thẳng cục formData vào hàm post của api.js
  return post("/api/documents/upload", formData);
}

/**
 * Hàm lấy danh sách tài liệu cá nhân của người dùng hiện tại
 */
/**
 * Get documents owned by the current user.
 * @param {Object} [params] - Optional filter params
 * @param {string} [params.keyword]   - Search by title or filename
 * @param {number} [params.subjectId] - Filter by subject ID
 * @param {string} [params.fileType]  - Filter by file type (e.g. "PDF")
 */
function getMyDocuments(params) {
    if (!params || Object.keys(params).length === 0) {
        return get("/api/documents/my");
    }
 
    // Build query string from non-empty params only
    const query = new URLSearchParams();
    if (params.keyword)   query.set("keyword",   params.keyword);
    if (params.subjectId) query.set("subjectId", String(params.subjectId));
    if (params.fileType)  query.set("fileType",  params.fileType);
 
    return get(`/api/documents/my?${query.toString()}`);
}
 
// ─────────────────────────────────────────────────────────────
// STEP 3 – Subject master data
// ─────────────────────────────────────────────────────────────
 
/**
 * Get all active subjects.
 * Used to populate subject dropdowns in upload and edit forms.
 */
function getSubjects() {
    return get("/api/subjects");
}
 
// ─────────────────────────────────────────────────────────────
// STEP 3 – Document detail, update, delete
// ─────────────────────────────────────────────────────────────
 
/**
 * Get full detail of a single document owned by the current user.
 * @param {number|string} documentId
 */
function getDocumentById(documentId) {
    return get(`/api/documents/${documentId}`);
}
 
/**
 * Update metadata (title, description, subjectId) of a document.
 * Does NOT replace the file — metadata only.
 * @param {number|string} documentId
 * @param {{ title: string, description?: string|null, subjectId?: number|null }} data
 */
function updateDocument(documentId, data) {
    return put(`/api/documents/${documentId}`, data);
}
 
/**
 * Soft-delete a document owned by the current user.
 * @param {number|string} documentId
 */
function deleteDocument(documentId) {
    return del(`/api/documents/${documentId}`);
}