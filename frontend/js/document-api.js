
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
function getMyDocuments() {
  return get("/api/documents/my");
}