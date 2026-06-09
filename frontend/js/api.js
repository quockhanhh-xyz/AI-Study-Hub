// Global variable defining the Backend API base URL
const API_BASE_URL = "http://localhost:8080";

/*
  Shared API request helper.
  Centralized function to configure requests and handle tokens automatically.
 */
async function apiRequest(endpoint, options = {}) {
  // Check if the payload is a file object (FormData)
  const isFormData = options.body instanceof FormData;

  // Initialize request headers
  const headers = {
    ...(options.headers || {})
  };

  // AUTOMATIC MECHANISM: 
  // - If NOT FormData -> Automatically append default JSON Content-Type
  // - If IT IS FormData -> STRICTLY DO NOT append, let the browser auto-generate the boundary for file management
  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }

  // Automatically retrieve token from localStorage (if exists) to attach to all upcoming requests
  const token = localStorage.getItem("accessToken");
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Execute fetch request to Backend
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: headers
  });

  // Parse response payload as JSON
  const data = await response.json();
  
  // Check for HTTP error codes (e.g., 400, 401, 500) or if the success flag from Backend contract is false
  if (!response.ok || data.success === false) {
    // Print warning to Console tab to help other FE devs debug when Backend returns an error
    console.warn("API Request Business Error:", data);
    // Throw error containing the standard error message from Backend contract
    throw new Error(data.message || "API request failed");
  }
  // ------------------------------------
 
  return data;
}

/*
  API GET request helper
  @param {string} endpoint - Example: "/api/health"
 */
function get(endpoint) {
  return apiRequest(endpoint, { method: "GET" });
}

/*
  API POST request helper
  @param {string} endpoint - Example: "/api/auth/login"
  @param {object|FormData} body - Regular data object OR FormData object containing files
 */
function post(endpoint, body) {
  // Check if the body passed into this post helper is FormData
  const isFormData = body instanceof FormData;
  
  return apiRequest(endpoint, {
    method: "POST",
    // Keep raw if FormData, stringify to JSON if it is a regular object
    body: isFormData ? body : JSON.stringify(body)
  });
}

/*
  API PUT request helper (Update data)
  @param {string} endpoint - Example: "/api/documents/1"
  @param {object} body - Data object containing update fields
 */
function put(endpoint, body) {
  return apiRequest(endpoint, {
    method: "PUT",
    body: JSON.stringify(body)
  });
}

/*
  API DELETE request helper (Remove data)
  @param {string} endpoint - Example: "/api/documents/1"
 */
function del(endpoint) {
  return apiRequest(endpoint, { method: "DELETE" });
}