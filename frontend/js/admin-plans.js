/**
 * Admin Plans View Logic
 */

let currentPlans = [];

document.addEventListener("DOMContentLoaded", () => {
    if (window.authReady) {
        window.authReady.then((isAuthenticated) => {
            if (isAuthenticated) {
                loadPlansData();
            }
        });
    } else {
        loadPlansData();
    }
});

async function loadPlansData() {
    const loadingState = document.getElementById("plansLoadingState");
    const errorState = document.getElementById("plansErrorState");
    const contentState = document.getElementById("plansContent");

    loadingState.style.display = "flex";
    errorState.style.display = "none";
    contentState.style.display = "none";

    try {
        const response = await fetchAdminPlans();
        if (response && response.success && response.data) {
            currentPlans = response.data;
            renderPlansTable(currentPlans);
            
            loadingState.style.display = "none";
            contentState.style.display = "block";
        } else {
            throw new Error(response.message || "Failed to load plans");
        }
    } catch (error) {
        console.error("Plans error:", error);
        loadingState.style.display = "none";
        errorState.style.display = "flex";
        document.getElementById("plansErrorMessage").textContent = error.message || "An unexpected error occurred.";
    }
}

function renderPlansTable(plans) {
    const tbody = document.getElementById("plansTableBody");
    tbody.innerHTML = "";

    if (plans.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">No plans found.</td></tr>`;
        return;
    }

    plans.forEach(plan => {
        const tr = document.createElement("tr");

        const statusBadgeClass = plan.status === 'ACTIVE' ? 'admin-badge-success' : 'admin-badge-danger';
        
        const aiLimitDisplay = plan.aiDailyQuestionLimit === -1 ? 'Unlimited' : plan.aiDailyQuestionLimit;
        
        tr.innerHTML = `
            <td><strong>${plan.planCode}</strong></td>
            <td>${plan.planName || ''}</td>
            <td>${plan.price.toLocaleString('vi-VN')}</td>
            <td>${plan.durationMonths || 0}</td>
            <td>${aiLimitDisplay}</td>
            <td><span class="admin-badge ${statusBadgeClass}">${plan.status}</span></td>
            <td>
                <button class="btn admin-pagination-btn" style="width: auto; padding: 4px 8px; margin-right: 8px;" onclick="openEditPlanModal('${plan.planCode}')">Edit</button>
                <button class="btn admin-pagination-btn" style="width: auto; padding: 4px 8px; color: ${plan.status === 'ACTIVE' ? 'var(--danger)' : 'var(--success)'};" onclick="togglePlanStatus('${plan.planCode}', '${plan.status}')">
                    ${plan.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function openEditPlanModal(planCode) {
    const plan = currentPlans.find(p => p.planCode === planCode);
    if (!plan) return;

    document.getElementById("editPlanCode").value = plan.planCode;
    document.getElementById("editPlanName").value = plan.planName || '';
    document.getElementById("editPlanPrice").value = plan.price;
    document.getElementById("editPlanDuration").value = plan.durationMonths || 0;
    document.getElementById("editPlanAiLimit").value = plan.aiDailyQuestionLimit || -1;
    document.getElementById("editPlanFeatures").value = plan.featuresList || "";

    const modal = document.getElementById("editPlanModal");
    modal.classList.add("active");
}

function closeEditPlanModal() {
    const modal = document.getElementById("editPlanModal");
    modal.classList.remove("active");
}

async function savePlanChanges() {
    const planCode = document.getElementById("editPlanCode").value;
    const planName = document.getElementById("editPlanName").value;
    const price = parseInt(document.getElementById("editPlanPrice").value, 10);
    const durationMonths = parseInt(document.getElementById("editPlanDuration").value, 10);
    const aiDailyQuestionLimit = parseInt(document.getElementById("editPlanAiLimit").value, 10);
    const featuresList = document.getElementById("editPlanFeatures").value;

    if (!planName || isNaN(price) || isNaN(durationMonths) || isNaN(aiDailyQuestionLimit)) {
        alert("Please fill in all required fields correctly.");
        return;
    }

    const requestData = {
        planName,
        price,
        durationMonths,
        aiDailyQuestionLimit,
        featuresList
    };

    const btn = document.getElementById("btnSavePlan");
    const originalText = btn.textContent;
    btn.textContent = "Saving...";
    btn.disabled = true;

    try {
        const response = await updateAdminPlan(planCode, requestData);
        if (response && response.success) {
            closeEditPlanModal();
            // Reload the table
            await loadPlansData();
        } else {
            throw new Error(response.message || "Failed to update plan");
        }
    } catch (error) {
        console.error("Save plan error:", error);
        alert(error.message || "Failed to save plan changes.");
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

async function togglePlanStatus(planCode, currentStatus) {
    const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const confirmMessage = `Are you sure you want to ${newStatus === 'ACTIVE' ? 'activate' : 'deactivate'} plan ${planCode}?`;
    
    if (!confirm(confirmMessage)) return;

    try {
        const response = await patchAdminPlanStatus(planCode, newStatus);
        if (response && response.success) {
            await loadPlansData();
        } else {
            throw new Error(response.message || "Failed to change plan status");
        }
    } catch (error) {
        console.error("Toggle status error:", error);
        alert(error.message || "Failed to change plan status.");
    }
}

async function exportAdminPlansData() {
    try {
        await exportAdminPlans();
    } catch (error) {
        console.error("Export error:", error);
    }
}
