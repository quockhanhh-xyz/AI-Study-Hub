/*
  FE3 — Document API Helper
  File phụ trách quản lý toàn bộ các yêu cầu gọi API liên quan đến tài liệu (Document).
 */

/*
  Hàm 1: Tải tài liệu lên hệ thống (Sử dụng Multipart/Form-Data)
  @param {FormData} formData - Đối tượng chứa dữ liệu gửi lên gồm: file, title, description
  @returns {Promise} Trả về cấu trúc ApiResponse chuẩn từ Backend (success, message, data)
 */
function uploadDocument(formData) {
  return apiRequest("/api/documents/upload", {
    method: "POST",
    body: formData // Truyền trực tiếp cục formData chứa file lên, api.js sẽ tự biết để né không ép JSON
  });
}

/*
 Hàm 2: Lấy danh sách tài liệu cá nhân của người dùng hiện tại
  @returns {Promise} Trả về danh sách các document metadata của riêng user đang đăng nhập
 */
function getMyDocuments() {
  return get("/api/documents/my");
}