import { post, get } from "./api.js";

/*
 * Hàm gửi tài liệu lên Backend (Backend validate, đẩy lên Cloudinary và lưu MySQL)
 * @param {File} fileObj - Đối tượng File lấy từ input <input type="file" />
 * @param {string} title - Tiêu đề tài liệu (Bắt buộc)
 * @param {string} [description=""] - Mô tả tài liệu (Không bắt buộc)
 */
export function uploadDocument(fileObj, title, description = "") {
  // Khởi tạo đối tượng FormData để bao gói dữ liệu gửi lên
  const formData = new FormData();
  
  // Đính kèm các key theo đúng định nghĩa @RequestParam của Backend Controller
  formData.append("file", fileObj);
  formData.append("title", title);
  formData.append("description", description);

  // Gửi request POST tới đúng endpoint của Backend
  return post("/api/documents/upload", formData);
}

/**
 * Hàm lấy danh sách tài liệu cá nhân của User hiện tại đang đăng nhập
 */
export function getMyDocuments() {
  // Gửi request GET tới đúng endpoint /api/documents/my của Backend
  return get("/api/documents/my");
}