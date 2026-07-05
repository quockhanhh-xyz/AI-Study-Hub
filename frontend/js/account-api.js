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