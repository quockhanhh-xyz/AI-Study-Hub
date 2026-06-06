/**
 * Hàm upload tài liệu nhận vào 1 tham số duy nhất là đối tượng FormData đã đúc sẵn từ UI
 * @param {FormData} formData - Đối tượng FormData chứa file, title, description, subjectId
 */
function uploadDocument(formData) {
  return post("/api/documents/upload", formData);
}

/**
 * Hàm lấy danh sách tài liệu cá nhân của người dùng hiện tại
 */
function getMyDocuments() {
  return get("/api/documents/my");
}

/**
 * Hàm lấy danh sách môn học hoạt động
 */
function getSubjects() {
  return get("/api/subjects");
}

/**
 * Tìm kiếm và lọc tài liệu cá nhân theo từ khóa, môn học, hoặc loại tệp
 * @param {object} params - Các tham số lọc gồm { keyword, subjectId, fileType }
 */
function searchDocuments(params = {}) {
  const queryParams = new URLSearchParams();
  if (params.keyword) {
    queryParams.append("keyword", params.keyword.trim());
  }
  if (params.subjectId) {
    queryParams.append("subjectId", params.subjectId);
  }
  if (params.fileType) {
    queryParams.append("fileType", params.fileType);
  }
  const queryString = queryParams.toString();
  return get(queryString ? `/api/documents/my?${queryString}` : "/api/documents/my");
}