// Biến toàn cục định nghĩa địa chỉ gốc của Backend API
const API_BASE_URL = "http://localhost:8080";

/*
  Shared API request helper.
  Hàm trung tâm để cấu hình request và xử lý token tự động.
 */
async function apiRequest(endpoint, options = {}) {
  // Tự động thêm Content-Type mặc định là JSON
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  // Tự động lấy token từ localStorage (nếu có) để đính kèm vào mọi request sau này
  const token = localStorage.getItem("accessToken");
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Thực hiện gọi fetch tới Backend
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: headers
  });

  // Ép kiểu dữ liệu trả về thành JSON
  const data = await response.json();
  
  // Kiểm tra mã lỗi HTTP (ví dụ: 400, 401, 500) hoặc cờ success từ Backend trả về là false
  if (!response.ok || data.success === false) {
    // In cảnh báo ra tab Console để các FE khác dễ debug khi Backend báo lỗi về
    console.warn("API Request Business Error:", data);
    // Ném lỗi ra ngoài kèm theo message chuẩn từ Backend contract
    throw new Error(data.message || "API request failed");
  }
  // ------------------------------------
 
  return data;
}

/*
  Hàm gọi API phương thức GET
  @param {string} endpoint - Ví dụ: "/api/health"
 */
function get(endpoint) {
  return apiRequest(endpoint, { method: "GET" });
}

/*
  Hàm gọi API phương thức POST
  @param {string} endpoint - Ví dụ: "/api/auth/login"
  @param {object} body - Object dữ liệu thuần từ form (chưa hóa chuỗi)
 */
function post(endpoint, body) {
  return apiRequest(endpoint, {
    method: "POST",
    body: JSON.stringify(body)
  });
}