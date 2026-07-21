/**
 * Account & Entitlement API Helper
 * Branch: feature/step-13-tier-entitlement-api-helper
 * All functions use apiRequest() — no raw fetch allowed in page scripts.
 * * IMPORTANT DEPENDENCY ORDER FOR FE2:
 * This script MUST be loaded in the following specific order in HTML files
 * to ensure showQuotaError() and entitlement APIs function correctly:
 * * <script src="js/api.js"></script>
 * <script src="js/account-api.js"></script>
 * <script src="js/ui.js"></script>
 * <script src="js/upgrade.js"></script> */

/**
 * Retrieves the current user's tier entitlements and quota limits.
 * @returns {Promise<Object>} Entitlements data including tier, limits per feature.
 */
async function getAccountEntitlements() {
  return await apiRequest("/api/account/entitlements", {
    method: "GET"
  });
}

/**
 * Retrieves the current user's usage statistics and remaining quota.
 * @returns {Promise<Object>} Usage data including storageUsed, documentCount, remaining quotas.
 */
async function getAccountUsage() {
  return await apiRequest("/api/account/usage", {
    method: "GET"
  });
}

/**
 * Standardized quota error mapping for tier-related HTTP error codes.
 * Maps by error.code first (backend contract), falls back to status + message text.
 * Covers: 400 (file size, chars), 403 (quota limits).
 * @param {Error} error - The error object from apiRequest().
 * @returns {string} Human-readable quota error message.
 */
function getQuotaErrorMessage(error) {
  const errorCode = error?.code || "";
  const message = error?.message || "";

  // Map by backend error code first — independent of HTTP status
  switch (errorCode) {
    case "FILE_SIZE_LIMIT_EXCEEDED":
      return "File is too large for your current plan. Upgrade to upload larger files.";
    case "STORAGE_LIMIT_EXCEEDED":
      return "Storage quota exceeded. Please delete some files or upgrade your plan.";
    case "DOCUMENT_LIMIT_EXCEEDED":
      return "Document limit reached. Upgrade your plan to upload more documents.";
    case "FOLDER_LIMIT_EXCEEDED":
      return "Folder limit reached. Upgrade your plan to create more folders.";
    case "FOLDER_DEPTH_LIMIT_EXCEEDED":
      return "Folder nesting limit reached. Upgrade your plan to create deeper folder structures.";
    case "GROUP_LIMIT_EXCEEDED":
      return "Group limit reached. Upgrade your plan to create more groups.";
    case "GROUP_MEMBER_LIMIT_EXCEEDED":
      return "Group member limit reached. Upgrade your plan to add more members.";
    case "SHARE_LIMIT_EXCEEDED":
      return "Sharing limit reached. Upgrade your plan to share with more users.";
    case "AI_QUOTA_EXCEEDED":
      return "You have reached your daily AI question limit.";
    case "AI_SESSION_LIMIT_EXCEEDED":
      return "You have reached the AI session limit for this document.";
    case "AI_MESSAGE_LIMIT_EXCEEDED":
      return "This AI session has reached its message limit. Start a new session.";
    case "AI_QUESTION_CHARS_LIMIT_EXCEEDED":
      return "Your question exceeds the character limit for your current plan. Upgrade to ask longer questions.";
    case "QUOTA_EXCEEDED":
      return "You have reached your plan limit. Upgrade to continue.";
    default:
      break;
  }

  // Fallback: guess by message text if code is not present
  const lower = message.toLowerCase();
  if (lower.includes("storage")) return "Storage quota exceeded. Please delete some files or upgrade your plan.";
  if (lower.includes("document")) return "Document limit reached. Upgrade your plan to upload more documents.";
  if (lower.includes("folder")) return "Folder limit reached. Upgrade your plan to create more folders.";
  if (lower.includes("group")) return "Group limit reached. Upgrade your plan to create more groups.";
  if (lower.includes("share")) return "Sharing limit reached. Upgrade your plan to share with more users.";
  if (lower.includes("ai") || lower.includes("quota")) return "You have reached your plan limit. Upgrade to continue.";

  return message || "An unexpected error occurred.";
}

/**
 * Retrieves the full profile of the current user.
 * @returns {Promise<Object>} The profile data
 */
async function getProfile() {
  return await apiRequest("/api/account/profile", {
    method: "GET"
  });
}

/**
 * Updates the profile fields of the current user.
 * @param {Object} profileData - The fields to update
 * @returns {Promise<Object>} The updated ProfileResponse
 */
async function updateProfile(profileData) {
  return await apiRequest("/api/account/profile", {
    method: "PUT",
    body: JSON.stringify(profileData)
  });
}

/**
 * Uploads a profile avatar.
 * @param {File} file - The image file to upload.
 * @returns {Promise<Object>} The updated ProfileResponse
 */
async function uploadAvatar(file) {
  const formData = new FormData();
  formData.append("file", file);
  return await apiRequest("/api/account/avatar", {
    method: "POST",
    body: formData
  });
}

/**
 * Changes the current user's password.
 * @param {string} currentPassword - The current password
 * @param {string} newPassword - The new password
 * @returns {Promise<Object>} Success response
 */
async function changePassword(currentPassword, newPassword) {
  return await apiRequest("/api/account/password", {
    method: "PUT",
    body: JSON.stringify({ currentPassword, newPassword })
  });
}

// Expose globally for page scripts
window.getAccountEntitlements = getAccountEntitlements;
window.getAccountUsage = getAccountUsage;
window.getQuotaErrorMessage = getQuotaErrorMessage;
window.getProfile = getProfile;
window.updateProfile = updateProfile;
window.uploadAvatar = uploadAvatar;
window.changePassword = changePassword;
