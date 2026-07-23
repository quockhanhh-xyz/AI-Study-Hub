/**
 * API Helper for Admin Plans
 */

/**
 * Fetch all plan configurations
 * Endpoint: GET /api/admin/plans
 */
async function fetchAdminPlans() {
    return await fetchAdmin('/api/admin/plans', { method: 'GET' });
}

/**
 * Fetch plan details by code
 * Endpoint: GET /api/admin/plans/{planCode}
 */
async function fetchAdminPlanDetails(planCode) {
    return await fetchAdmin(`/api/admin/plans/${planCode}`, { method: 'GET' });
}

/**
 * Update plan configuration
 * Endpoint: PUT /api/admin/plans/{planCode}
 */
async function updateAdminPlan(planCode, requestData) {
    return await fetchAdmin(`/api/admin/plans/${planCode}`, {
        method: 'PUT',
        body: requestData
    });
}

/**
 * Patch plan status
 * Endpoint: PATCH /api/admin/plans/{planCode}/status?status={status}
 */
async function patchAdminPlanStatus(planCode, status) {
    return await fetchAdmin(`/api/admin/plans/${planCode}/status?status=${status}`, { method: 'PATCH' });
}

/**
 * Export plan configurations
 * Endpoint: GET /api/admin/plans/export
 */
async function exportAdminPlans() {
    await exportAdminData('/api/admin/plans/export', 'plans_configuration.xlsx');
}

/**
 * Fetch plan change history
 * Endpoint: GET /api/admin/plans/history
 */
async function fetchAdminPlanHistory() {
    return await fetchAdmin('/api/admin/plans/history', { method: 'GET' });
}
