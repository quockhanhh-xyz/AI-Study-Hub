const LOCALHOST_ALIASES = ["0.0.0.0", "127.0.0.1"];

if (LOCALHOST_ALIASES.includes(window.location.hostname)) {
  window.location.replace(
    `${window.location.protocol}//localhost:${window.location.port}${window.location.pathname}${window.location.search}`
  );
}

// Global variable defining the Backend API base URL
const API_HOST = LOCALHOST_ALIASES.includes(window.location.hostname) ? "localhost" : window.location.hostname;
const API_BASE_URL = `${window.location.protocol}//${API_HOST}:8080`;

function redirectToLoginWithCurrentIntent() {
  const currentPage = window.location.pathname.split("/").pop() || "dashboard.html";
  const currentIntent = `${currentPage}${window.location.search || ""}`;
  const isGuestAuthPage = ["login.html", "register.html", "verify-otp.html"].includes(currentPage);

  if (isGuestAuthPage) {
    window.location.href = "login.html";
    return;
  }

  window.location.href = `login.html?redirect=${encodeURIComponent(currentIntent)}`;
}

async function isCurrentSessionStillValid() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
      method: "GET",
      credentials: "include",
      cache: "no-store"
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Shared API request helper.
 * Centralized function to configure requests and handle tokens automatically.
 */
async function apiRequest(endpoint, options = {}) {
  // Check if the payload is a file object (FormData)
  const isFormData = options.body instanceof FormData;

  // Initialize request headers
  const headers = {
    ...(options.headers || {})
  };

  // Automatically append JSON content type when request body exists and is not FormData
  if (!isFormData && options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  // Execute fetch request with Cookie authentication enabled
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    cache: "no-store",
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

  // Handle explicit HTTP 401 Unauthorized or AUTH_ACCOUNT_BLOCKED
  if (response.status === 401 || (data && data.code === "AUTH_ACCOUNT_BLOCKED")) {
    const isAccountBlocked = data && data.code === "AUTH_ACCOUNT_BLOCKED";

    // If caller explicitly wants to handle 401 themselves (e.g. layout.js /api/auth/me),
    // always respect that flag — UNLESS the account is actively blocked (needs global alert).
    if (options.skipUnauthorizedRedirect === true && !isAccountBlocked) {
      console.log(
        `Unauthorized (HTTP 401) for ${endpoint} - Skipped redirect as requested by caller.`
      );
    } else {
      if (!window.isRedirectingToLogin) {
        window.isRedirectingToLogin = true;
        console.warn(
          "Session expired, invalid, or account blocked. Executing global redirect to login..."
        );
        if (isAccountBlocked) {
          alert("Your account has been blocked by an administrator.");
        }
        localStorage.removeItem("currentUser");
        fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
        redirectToLoginWithCurrentIntent();
      }
    }

    // Preserve backend error message whenever possible
    const errorMessage =
      data.message ||
      data.error ||
      rawText ||
      "Unauthorized - Session expired or account blocked. Please log in again.";

    const error = new Error(errorMessage);
    error.status = response.status;
    error.code = data?.code;
    error.data = data?.data;
    throw error;
  }

  // Handle all other HTTP errors or business failures
  // Explicitly treats all HTTP 2xx statuses (including 202 Accepted) as successful mutations
  if (!response.ok || (data && data.success === false)) {
    console.warn("API Request Business Error:", data || rawText);

    // Extract backend error message accurately, fallback to customized status text if empty
    let errorMessage = data.message || data.error || rawText;

    if (!errorMessage) {
      if (response.status === 403) {
        errorMessage = "Access Denied (HTTP 403): You do not have permission to access this resource.";
      } else if (response.status === 404) {
        errorMessage = "Resource Not Found (HTTP 404): The requested resource does not exist or has been removed.";
      } else if (response.status === 409) {
        errorMessage = "Conflict (HTTP 409): Duplicate entry or resource configuration conflict.";
      } else if (response.status >= 500) {
        errorMessage = `Internal Server Error (HTTP ${response.status}): The server encountered an error processing this request. Please try again later.`;
      } else {
        errorMessage = `API request failed with status code ${response.status}.`;
      }
    }

    const error = new Error(errorMessage);
    error.status = response.status;
    error.code = data?.code;
    error.data = data?.data;
    throw error;
  }

  return data;
}

/**
 * API GET request helper
 * @param {string} endpoint - Example: "/api/health"
 * @param {object} options - Optional parameters override
 */
function get(endpoint, options = {}) {
  return apiRequest(endpoint, {
    ...options,
    method: "GET"
  });
}

/**
 * API POST request helper
 * @param {string} endpoint - Example: "/api/auth/login"
 * @param {object|FormData} body - Regular object or FormData
 * @param {object} options - Optional parameters override
 */
function post(endpoint, body, options = {}) {
  const isFormData = body instanceof FormData;

  return apiRequest(endpoint, {
    ...options,
    method: "POST",
    body: isFormData ? body : (body !== undefined ? JSON.stringify(body) : undefined)
  });
}

/**
 * API PUT request helper
 * @param {string} endpoint - Example: "/api/documents/1"
 * @param {object} body - Updated data object
 * @param {object} options - Optional parameters override
 */
function put(endpoint, body, options = {}) {
  const isFormData = body instanceof FormData;

  return apiRequest(endpoint, {
    ...options,
    method: "PUT",
    body: isFormData ? body : (body !== undefined ? JSON.stringify(body) : undefined)
  });
}

/**
 * API PATCH request helper
 * @param {string} endpoint - Example: "/api/users/1/status"
 * @param {object} body - Updated data object
 * @param {object} options - Optional parameters override
 */
function patch(endpoint, body, options = {}) {
  const isFormData = body instanceof FormData;

  return apiRequest(endpoint, {
    ...options,
    method: "PATCH",
    body: isFormData ? body : (body !== undefined ? JSON.stringify(body) : undefined)
  });
}

/**
 * API DELETE request helper
 * @param {string} endpoint - Example: "/api/documents/1"
 * @param {object} options - Optional parameters override
 */
function del(endpoint, options = {}) {
  return apiRequest(endpoint, {
    ...options,
    method: "DELETE"
  });
}

/**
 * Downloads a file from an API endpoint, including authentication cookies.
 * @param {string} endpoint - The API endpoint to download from
 * @param {string} filename - The default filename to save as
 */
async function downloadFile(endpoint, filename = 'download') {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "GET",
      credentials: "include"
    });

    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();

    // Cleanup
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error("Error downloading file:", error);
    alert("Failed to download file. Please try again.");
  }
}
