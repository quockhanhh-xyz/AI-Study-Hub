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
  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }

  // Execute fetch request to Backend with credentials included for Cookie management
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: headers,
    credentials: "include" // Mandatory for HttpOnly Cookie authentication flow
  });

  // Handle explicit HTTP 401 Unauthorized
  if (response.status === 401) {
    // Check if the current request specifically requests to skip global redirection logic
    if (options.skipUnauthorizedRedirect === true) {
      console.log(`Unauthorized (HTTP 401) for ${endpoint} - Handled locally by calling component.`);
    } else {
      console.warn("Session expired or invalid (HTTP 401). Executing global redirect to login...");
      window.location.href = "login.html";
    }
    // Block further parsing execution and notify the caller
    throw new Error("Unauthorized - Session expired");
  }

  // Parse response payload as JSON
  let data = {};
  try {
    data = await response.json();
  } catch (e) {
    // Handle cases where the backend returns an empty response or non-JSON data
    console.warn("Response is not JSON format");
  }
  
  // Check for other HTTP error codes or if the success flag from Backend contract is false
  if (!response.ok || data.success === false) {
    // Print warning to Console tab to help other FE devs debug when Backend returns an error
    console.warn("API Request Business Error:", data);
    
    // Extract the exact error message from backend (especially for HTTP 409 Conflict)
    const errorMessage = data.message || data.error || "API request failed";
    
    // Create a new error object and attach the HTTP status code for advanced UI handling
    const error = new Error(errorMessage);
    error.status = response.status;
    throw error;
  }
 
  return data;
}

/*
  API GET request helper
  @param {string} endpoint - Example: "/api/health"
  @param {object} options - Optional parameters override
 */
function get(endpoint, options = {}) {
  return apiRequest(endpoint, { method: "GET", ...options });
}

/*
  API POST request helper
  @param {string} endpoint - Example: "/api/auth/login"
  @param {object|FormData} body - Regular data object OR FormData object containing files
  @param {object} options - Optional parameters override
 */
function post(endpoint, body, options = {}) {
  // Check if the body passed into this post helper is FormData
  const isFormData = body instanceof FormData;
  
  return apiRequest(endpoint, {
    method: "POST",
    // Keep raw if FormData, stringify to JSON if it is a regular object
    body: isFormData ? body : JSON.stringify(body),
    ...options
  });
}

/*
  API PUT request helper (Update data)
  @param {string} endpoint - Example: "/api/documents/1"
  @param {object} body - Data object containing update fields
  @param {object} options - Optional parameters override
 */
function put(endpoint, body, options = {}) {
  return apiRequest(endpoint, {
    method: "PUT",
    body: JSON.stringify(body),
    ...options
  });
}

/*
  API DELETE request helper (Remove data)
  @param {string} endpoint - Example: "/api/documents/1"
  @param {object} options - Optional parameters override
 */
function del(endpoint, options = {}) {
  return apiRequest(endpoint, { method: "DELETE", ...options });
}
