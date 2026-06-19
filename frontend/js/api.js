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

  // Automatically append JSON content type when request body is not FormData
  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }

  // Execute fetch request with Cookie authentication enabled
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: "include"
  });

  // Parse response payload safely to preserve backend error messages
  let data = {};
  let rawText = "";

  try {
    rawText = await response.text();
    data = rawText ? JSON.parse(rawText) : {};
  } catch (e) {
    console.warn("Response payload parsing failed, treating as raw text context.");
  }

  // Handle explicit HTTP 401 Unauthorized
  if (response.status === 401) {
    // Check whether the caller wants to handle redirect logic manually
    if (options.skipUnauthorizedRedirect === true) {
      console.log(
        `Unauthorized (HTTP 401) for ${endpoint} - Handled locally by calling component.`
      );
    } else {
      console.warn(
        "Session expired or invalid (HTTP 401). Executing global redirect to login..."
      );
      window.location.href = "login.html";
    }

    // Preserve backend error message whenever possible
    const errorMessage =
      data.message ||
      data.error ||
      rawText ||
      "Unauthorized - Session expired";

    const error = new Error(errorMessage);
    error.status = response.status;
    throw error;
  }

  // Handle all other HTTP errors or business failures
  if (!response.ok || data.success === false) {
    console.warn("API Request Business Error:", data || rawText);

    // Extract backend error message accurately
    const errorMessage =
      data.message ||
      data.error ||
      rawText ||
      "API request failed";

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
  return apiRequest(endpoint, {
    method: "GET",
    ...options
  });
}

/*
  API POST request helper
  @param {string} endpoint - Example: "/api/auth/login"
  @param {object|FormData} body - Regular object or FormData
  @param {object} options - Optional parameters override
 */
function post(endpoint, body, options = {}) {
  const isFormData = body instanceof FormData;

  return apiRequest(endpoint, {
    method: "POST",
    body: isFormData ? body : JSON.stringify(body),
    ...options
  });
}

/*
  API PUT request helper
  @param {string} endpoint - Example: "/api/documents/1"
  @param {object} body - Updated data object
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
  API DELETE request helper
  @param {string} endpoint - Example: "/api/documents/1"
  @param {object} options - Optional parameters override
 */
function del(endpoint, options = {}) {
  return apiRequest(endpoint, {
    method: "DELETE",
    ...options
  });
}