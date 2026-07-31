/**
 * Checks the connection status to the Backend via the /api/health API endpoint.
 */
async function checkBackendHealth() {
  const backendStatus = document.getElementById("backendStatus");

  // If the current page does not have the status display element, terminate the function immediately
  if (!backendStatus) {
    return;
  }

  // Update the UI to show that the check is currently in progress
  backendStatus.textContent = "Checking backend connection...";
  backendStatus.className = "status-box status-checking";

  try {
    // Call the actual API via the apiRequest helper defined in api.js
    const result = await apiRequest("/api/health");

    // If connection succeeds, display the message and status returned from the Backend
    backendStatus.textContent = `${result.message} - Status: ${result.data.status}`;
    backendStatus.className = "status-box status-success";
  } catch (error) {
    // If an error occurs (BE not running, network error, server crash...), display the error on the UI
    backendStatus.textContent = `Backend disconnected: ${error.message}`;
    backendStatus.className = "status-box status-error";
  }
}

// Automatically execute the health check function once the DOM content is fully loaded
document.addEventListener("DOMContentLoaded", checkBackendHealth);