/**
 * Account & Entitlement API Helper
 * Branch: feature/step-13-tier-entitlement-api-helper
 * All functions use apiRequest() — no raw fetch allowed in page scripts.
 */

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
 * Maps 403 quota errors via backend error codes to human-readable messages.
 * @param {Error} error - The error object from apiRequest().
 * @returns {string} Human-readable quota error message.
 */
function getQuotaErrorMessage(error) {
  const status = error.status || error.statusCode;
  const errorCode = error.code || "";
  const message = error.message || "";
 
  if (status === 403) {
    if (errorCode === "STORAGE_LIMIT_EXCEEDED" || message.toLowerCase().includes("storage")) {
      return "Storage quota exceeded. Please delete some files or upgrade your plan.";
    }
    if (errorCode === "DOCUMENT_LIMIT_EXCEEDED" || message.toLowerCase().includes("document")) {
      return "Document limit reached. Upgrade your plan to upload more documents.";
    }
    if (errorCode === "FOLDER_LIMIT_EXCEEDED" || message.toLowerCase().includes("folder")) {
      return "Folder limit reached. Upgrade your plan to create more folders.";
    }
    if (errorCode === "GROUP_LIMIT_EXCEEDED" || message.toLowerCase().includes("group")) {
      return "Group limit reached. Upgrade your plan to create more groups.";
    }
    if (errorCode === "SHARE_LIMIT_EXCEEDED" || message.toLowerCase().includes("share")) {
      return "Sharing limit reached. Upgrade your plan to share with more users.";
    }
    if (errorCode === "AI_QUOTA_EXCEEDED" || message.toLowerCase().includes("ai")) {
      return "You have reached your daily AI question limit. Upgrade to PREMIUM or ULTRA for more.";
    }
    return "You have reached your plan limit. Upgrade to continue.";
  }
 
  return message || "An unexpected error occurred.";
}
 
// Expose globally for page scripts
window.getAccountEntitlements = getAccountEntitlements;
window.getAccountUsage = getAccountUsage;
window.getQuotaErrorMessage = getQuotaErrorMessage;