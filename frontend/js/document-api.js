
/*
 * Hàm upload tài liệu nhận vào 1 tham số duy nhất là đối tượng FormData đã đúc sẵn từ UI
 * Khớp 100% với dòng 186 trong file upload.js cũ
 * @param {FormData} formData - Đối tượng FormData chứa file, title, description
 */
function uploadDocument(formData) {
  // Truyền thẳng formData vào hàm post của api.js
  return post("/api/documents/upload", formData);
}

/*
 * Hàm lấy danh sách tài liệu cá nhân của người dùng hiện tại
 */
function getMyDocuments(params) {
  if (params && Object.keys(params).length > 0) {
    const queryString = new URLSearchParams(params).toString();
    return get(`/api/documents/my?${queryString}`);
  }
  return get("/api/documents/my");
}

/*
 * Hàm lấy danh sách tất cả môn học (Master Data)
 * Dùng cho bộ lọc ở Dashboard (FE1) và Dropdown ở trang chi tiết (FE2)
 * @returns {Promise} Trả về danh sách môn học từ API contract docs
 */
function getSubjects() {
  return get("/api/subjects");
}

/*
 * Hàm tìm kiếm và lọc tài liệu nâng cao
 * Phục vụ cho bộ lọc Tìm kiếm, Môn học, Loại file tại Dashboard (FE1)
 * @param {Object} params - Đối tượng chứa các bộ lọc { keyword, subjectId, fileType }
 * @returns {Promise} Danh sách tài liệu đã được lọc theo điều kiện
 */
function searchDocuments(params) {
  return getMyDocuments(params);
}

/*
 * Hàm lấy thông tin chi tiết của một tài liệu cụ thể bằng ID
 * Phục vụ cho trang hiển thị chi tiết (FE2)
 * @param {number|string} id - ID của tài liệu cần lấy
 * @returns {Promise} Chi tiết tài liệu (URL file, tiêu đề, mô tả, môn học...)
 */
function getDocumentById(id) {
  return get(`/api/documents/${id}`);
}

/*
 * Hàm cập nhật metadata (thông tin chữ) của tài liệu
 * Phục vụ cho tính năng chỉnh sửa thông tin (FE2)
 * @param {number|string} id - ID của tài liệu cần sửa
 * @param {Object} data - Đối tượng chứa thông tin mới { title, description, subjectId }
 * @returns {Promise} Kết quả cập nhật từ Backend
 */
function updateDocument(id, data) {
  return put(`/api/documents/${id}`, data);
}

/*
 * Hàm xóa tài liệu ra khỏi hệ thống theo ID
 * Phục vụ cho tính năng xóa tài liệu (FE2)
 * @param {number|string} id - ID của tài liệu cần xóa
 * @returns {Promise} Kết quả xóa tài liệu từ Backend
 */
function deleteDocument(id) {
  return del(`/api/documents/${id}`); // Giả định helper api.js của bạn dùng tên hàm là 'del' hoặc 'delete' cho phương thức DELETE
}