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

        let actionButtons = `<button class="btn admin-pagination-btn" style="width: auto; padding: 4px 8px; margin-right: 8px;" onclick="openEditPlanModal('${plan.planCode}')">Edit</button>`;
        if (plan.planCode === 'FREE') {
            actionButtons += `<span style="font-size: 0.85em; color: var(--text-muted); display: inline-block; padding: 4px;">System default</span>`;
        } else {
            actionButtons += `
                <button class="btn admin-pagination-btn" style="width: auto; padding: 4px 8px; color: ${plan.status === 'ACTIVE' ? 'var(--danger)' : 'var(--success)'};" onclick="togglePlanStatus('${plan.planCode}', '${plan.status}')">
                    ${plan.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                </button>`;
        }

        tr.innerHTML = `
            <td><strong>${plan.planCode}</strong></td>
            <td>${plan.planName || ''}</td>
            <td>${plan.price.toLocaleString('vi-VN')}</td>
            <td>${plan.durationMonths || 0}</td>
            <td>${aiLimitDisplay}</td>
            <td><span class="admin-badge ${statusBadgeClass}">${plan.status}</span></td>
            <td>${actionButtons}</td>
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
    document.getElementById("editPlanBillingLabel").value = plan.billingLabel || '';

    const purchasableSelect = document.getElementById("editPlanPurchasable");
    if (plan.planCode === 'FREE') {
        purchasableSelect.value = 'false';
        purchasableSelect.disabled = true;
    } else {
        purchasableSelect.value = plan.purchasable !== false ? 'true' : 'false';
        purchasableSelect.disabled = false;
    }


    document.getElementById("editPlanAiLimit").value = plan.aiDailyQuestionLimit ?? -1;
    document.getElementById("editPlanMaxAiSessions").value = plan.maxAiSessionsPerDocument ?? -1;
    document.getElementById("editPlanMaxMessages").value = plan.maxMessagesPerSession ?? -1;
    document.getElementById("editPlanMaxQuestionChars").value = plan.maxQuestionChars ?? -1;
    document.getElementById("editPlanMaxContextChunks").value = plan.maxContextChunks ?? -1;
    document.getElementById("editPlanMaxOutputTokens").value = plan.maxOutputTokens ?? -1;

    document.getElementById("editPlanStorageLimit").value = plan.storageLimit ?? -1;
    document.getElementById("editPlanMaxFileSize").value = plan.maxFileSize ?? -1;
    document.getElementById("editPlanMaxDocumentCount").value = plan.maxDocumentCount ?? -1;
    document.getElementById("editPlanMaxFolderCount").value = plan.maxFolderCount ?? -1;
    document.getElementById("editPlanMaxFolderDepth").value = plan.maxFolderDepth ?? -1;

    document.getElementById("editPlanMaxGroupCount").value = plan.maxGroupCount ?? -1;
    document.getElementById("editPlanMaxMembers").value = plan.maxMembersPerGroup ?? -1;
    document.getElementById("editPlanMaxActiveShares").value = plan.maxActiveShares ?? -1;

    document.getElementById("editPlanSummaryDailyLimit").value = plan.summaryDailyLimit ?? -1;
    document.getElementById("editPlanFlashcardDailyLimit").value = plan.flashcardDailyLimit ?? -1;
    document.getElementById("editPlanQuizDailyLimit").value = plan.quizDailyLimit ?? -1;
    document.getElementById("editPlanItemsPerSet").value = plan.itemsPerSet ?? -1;
    document.getElementById("editPlanMaxFlashcards").value = plan.maxFlashcardsPerSet ?? -1;
    document.getElementById("editPlanMaxQuizQuestions").value = plan.maxQuizQuestionsPerSet ?? -1;



    const modal = document.getElementById("editPlanModal");
    modal.classList.add("active");
}

function closeEditPlanModal() {
    const modal = document.getElementById("editPlanModal");
    modal.classList.remove("active");
}


async function savePlanChanges() {
    if (!confirm("Are you sure you want to save these changes?")) {
        return;
    }

    const planCode = document.getElementById("editPlanCode").value;
    const planName = document.getElementById("editPlanName").value;
    const price = parseInt(document.getElementById("editPlanPrice").value, 10);
    const durationMonths = parseInt(document.getElementById("editPlanDuration").value, 10);
    const billingLabel = document.getElementById("editPlanBillingLabel").value;
    const purchasable = document.getElementById("editPlanPurchasable").value === 'true';

    const aiDailyQuestionLimit = parseInt(document.getElementById("editPlanAiLimit").value, 10);
    const maxAiSessionsPerDocument = parseInt(document.getElementById("editPlanMaxAiSessions").value, 10);
    const maxMessagesPerSession = parseInt(document.getElementById("editPlanMaxMessages").value, 10);
    const maxQuestionChars = parseInt(document.getElementById("editPlanMaxQuestionChars").value, 10);
    const maxContextChunks = parseInt(document.getElementById("editPlanMaxContextChunks").value, 10);
    const maxOutputTokens = parseInt(document.getElementById("editPlanMaxOutputTokens").value, 10);

    const storageLimit = parseInt(document.getElementById("editPlanStorageLimit").value, 10);
    const maxFileSize = parseInt(document.getElementById("editPlanMaxFileSize").value, 10);
    const maxDocumentCount = parseInt(document.getElementById("editPlanMaxDocumentCount").value, 10);
    const maxFolderCount = parseInt(document.getElementById("editPlanMaxFolderCount").value, 10);
    const maxFolderDepth = parseInt(document.getElementById("editPlanMaxFolderDepth").value, 10);

    const maxGroupCount = parseInt(document.getElementById("editPlanMaxGroupCount").value, 10);
    const maxMembersPerGroup = parseInt(document.getElementById("editPlanMaxMembers").value, 10);
    const maxActiveShares = parseInt(document.getElementById("editPlanMaxActiveShares").value, 10);

    const summaryDailyLimit = parseInt(document.getElementById("editPlanSummaryDailyLimit").value, 10);
    const flashcardDailyLimit = parseInt(document.getElementById("editPlanFlashcardDailyLimit").value, 10);
    const quizDailyLimit = parseInt(document.getElementById("editPlanQuizDailyLimit").value, 10);
    const itemsPerSet = parseInt(document.getElementById("editPlanItemsPerSet").value, 10);
    const maxFlashcardsPerSet = parseInt(document.getElementById("editPlanMaxFlashcards").value, 10);
    const maxQuizQuestionsPerSet = parseInt(document.getElementById("editPlanMaxQuizQuestions").value, 10);


    if (!planName || isNaN(price) || isNaN(durationMonths)) {
        alert("Please fill in all required fields correctly.");
        return;
    }

    const requestData = {
        planName,
        price,
        durationMonths,
        billingLabel,
        purchasable,
        aiDailyQuestionLimit,
        maxAiSessionsPerDocument,
        maxMessagesPerSession,
        maxQuestionChars,
        maxContextChunks,
        maxOutputTokens,
        storageLimit,
        maxFileSize,
        maxDocumentCount,
        maxFolderCount,
        maxFolderDepth,
        maxGroupCount,
        maxMembersPerGroup,
        maxActiveShares,
        summaryDailyLimit,
        flashcardDailyLimit,
        quizDailyLimit,
        itemsPerSet,
        maxFlashcardsPerSet,
        maxQuizQuestionsPerSet
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
