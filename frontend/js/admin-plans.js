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

    if (contentState.style.display === "none" || contentState.style.display === "") {
        loadingState.style.display = "flex";
        errorState.style.display = "none";
    } else {
        errorState.style.display = "none";
    }

    try {
        const response = await fetchAdminPlans();
        if (response && response.success && response.data) {
            currentPlans = response.data;
            renderPlansTable(currentPlans);
            
            // Calculate summary statistics
            const total = currentPlans.length;
            const active = currentPlans.filter(p => p.status === 'ACTIVE').length;
            const inactive = total - active;
            
            document.getElementById("totalPlansCount").textContent = total;
            document.getElementById("activePlansCount").textContent = active;
            document.getElementById("inactivePlansCount").textContent = inactive;
            
            await loadHistoryData();

            loadingState.style.display = "none";
            contentState.style.display = "block";
            const headerActions = document.getElementById("plansHeaderActions");
            if (headerActions) headerActions.style.display = "flex";
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

        let tierBadgeClass = 'admin-badge-neutral';
        let tierName = 'FREE';
        if (plan.planCode.includes('PREMIUM')) {
            tierBadgeClass = 'admin-badge-success';
            tierName = 'PREMIUM';
        } else if (plan.planCode.includes('ULTRA')) {
            tierBadgeClass = 'admin-badge-info';
            tierName = 'ULTRA';
        }

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
            <td style="text-align: center;"><strong>${plan.planCode}</strong></td>
            <td style="text-align: center;"><span class="admin-badge ${tierBadgeClass}">${tierName}</span></td>
            <td style="text-align: center;">${plan.price.toLocaleString('vi-VN')}</td>
            <td style="text-align: center;">${plan.durationMonths || 0}</td>
            <td style="text-align: center;">${aiLimitDisplay}</td>
            <td style="text-align: center;"><span class="admin-badge ${statusBadgeClass}">${plan.status}</span></td>
            <td style="text-align: center;">${actionButtons}</td>
        `;
        tbody.appendChild(tr);
    });
}

function formatChangeDate(dateInput) {
    if (!dateInput) return "-";
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return "-";

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    const dateStr = `${month} ${day}, ${year}`;

    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    const hourStr = String(hours).padStart(2, "0");
    const timeStr = `${hourStr}:${minutes} ${ampm}`;

    return `<div style="text-align: center; line-height: 1.4;">
        <div style="font-weight: 500; color: var(--text-main); font-size: 13px; white-space: nowrap;">${dateStr}</div>
        <div style="color: var(--text-muted); font-size: 12px; margin-top: 2px; white-space: nowrap;">${timeStr}</div>
    </div>`;
}

function formatChangeDetails(detailsText) {
    if (!detailsText) {
        return `<div style="text-align: center; color: var(--text-muted); font-style: italic; font-size: 13px;">No details available</div>`;
    }

    if (detailsText === "Updated configuration values") {
        return `<div style="text-align: center; color: var(--text-muted); font-style: italic; font-size: 13px;">Updated configuration values</div>`;
    }

    const changes = detailsText.split("; ").filter(Boolean);
    if (changes.length === 0) {
        return `<div style="text-align: center; color: var(--text-muted); font-style: italic; font-size: 13px;">${detailsText}</div>`;
    }

    let html = `<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; padding: 4px 0;">`;
    changes.forEach(ch => {
        const parts = ch.split(" -> ");
        if (parts.length === 2) {
            const fieldPart = parts[0].split(": ");
            if (fieldPart.length === 2) {
                const fieldName = fieldPart[0];
                const oldValue = fieldPart[1];
                const newValue = parts[1];

                const formatVal = (name, val) => {
                    if (name === "Price") {
                        const num = parseFloat(val);
                        return isNaN(num) ? val : num.toLocaleString('vi-VN') + " đ";
                    }
                    if (name === "Storage Limit" || name === "Max File Size") {
                        const bytes = parseFloat(val);
                        if (isNaN(bytes)) return val;
                        if (bytes === 0) return "0 MB";
                        const mb = bytes / (1024 * 1024);
                        return mb >= 1024 ? (mb / 1024).toFixed(1) + " GB" : mb.toFixed(1) + " MB";
                    }
                    return val;
                };

                html += `
                <div style="display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 13px; color: var(--text-main); line-height: 1.4; white-space: nowrap; width: 100%;">
                    <span style="font-weight: 600; color: var(--text-main);">${fieldName}:</span>
                    <span style="text-decoration: line-through; color: var(--text-muted); font-weight: 500;">${formatVal(fieldName, oldValue)}</span>
                    <span style="color: var(--text-muted); font-weight: 600; font-size: 14px; margin: 0 2px;">&rarr;</span>
                    <span style="color: var(--success, #16a34a); font-weight: 600;">${formatVal(fieldName, newValue)}</span>
                </div>`;
                return;
            }
        }
        html += `<div style="text-align: center; font-size: 13px; color: var(--text-main); line-height: 1.4; width: 100%;">${ch}</div>`;
    });
    html += `</div>`;
    return html;
}

async function loadHistoryData() {
    const tbody = document.getElementById("historyTableBody");
    try {
        const response = await fetchAdminPlanHistory();
        tbody.innerHTML = "";
        if (response && response.success && response.data) {
            const histories = response.data;
            if (histories.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 20px;">No change history found.</td></tr>`;
                return;
            }
            histories.forEach(item => {
                const tr = document.createElement("tr");

                let actionBadgeClass = "admin-badge-neutral";
                if (item.actionType === "UPDATE") {
                    actionBadgeClass = "admin-badge-warning";
                } else if (item.actionType === "ACTIVATE") {
                    actionBadgeClass = "admin-badge-success";
                } else if (item.actionType === "DEACTIVATE") {
                    actionBadgeClass = "admin-badge-danger";
                }

                tr.innerHTML = `
                    <td style="text-align: center; vertical-align: middle;"><strong>${item.planCode}</strong></td>
                    <td style="text-align: center; vertical-align: middle;"><span class="admin-badge ${actionBadgeClass}">${item.actionType}</span></td>
                    <td style="text-align: center; vertical-align: middle; max-width: 450px; white-space: normal; word-break: break-word;">${formatChangeDetails(item.details)}</td>
                    <td style="text-align: center; vertical-align: middle;">${item.changer || ''}</td>
                    <td style="text-align: center; vertical-align: middle;">${formatChangeDate(item.changedAt)}</td>
                `;
                tbody.appendChild(tr);
            });
        } else {
            throw new Error(response.message || "Failed to load history");
        }
    } catch (error) {
        console.error("History error:", error);
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--danger); padding: 20px;">Failed to load history.</td></tr>`;
    }
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


let confirmCallback = null;

function showConfirmModal(title, bodyText, onConfirm) {
    document.getElementById("modalTitle").textContent = title;
    document.getElementById("modalBody").innerHTML = bodyText;
    confirmCallback = onConfirm;

    const confirmBtn = document.getElementById("modalConfirmBtn");
    confirmBtn.onclick = async () => {
        confirmBtn.disabled = true;
        const originalText = confirmBtn.textContent;
        confirmBtn.textContent = "Processing...";
        try {
            await confirmCallback();
            closeConfirmModal();
        } catch (e) {
            console.error("Action error:", e);
        } finally {
            confirmBtn.disabled = false;
            confirmBtn.textContent = originalText;
        }
    };

    document.getElementById("confirmModal").classList.add("active");
}

function closeConfirmModal() {
    document.getElementById("confirmModal").classList.remove("active");
    confirmCallback = null;
}

async function savePlanChanges() {
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
        if (typeof showToast === "function") {
            showToast("Please fill in all required fields correctly.", "error");
        } else {
            alert("Please fill in all required fields correctly.");
        }
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

    showConfirmModal(
        "Save Plan Changes",
        `Are you sure you want to save the changes for plan <strong>${planCode}</strong>?`,
        async () => {
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
                    if (typeof showToast === "function") {
                        showToast("Plan updated successfully.", "success");
                    }
                } else {
                    throw new Error(response.message || "Failed to update plan");
                }
            } catch (error) {
                console.error("Save plan error:", error);
                if (typeof showToast === "function") {
                    showToast(error.message || "Failed to save plan changes.", "error");
                } else {
                    alert(error.message || "Failed to save plan changes.");
                }
            } finally {
                btn.textContent = originalText;
                btn.disabled = false;
            }
        }
    );
}

async function togglePlanStatus(planCode, currentStatus) {
    const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const actionText = newStatus === 'ACTIVE' ? 'activate' : 'deactivate';
    const confirmMessage = `Are you sure you want to ${actionText} plan <strong>${planCode}</strong>?`;

    showConfirmModal(
        `${newStatus === 'ACTIVE' ? 'Activate' : 'Deactivate'} Plan`,
        confirmMessage,
        async () => {
            try {
                const response = await patchAdminPlanStatus(planCode, newStatus);
                if (response && response.success) {
                    await loadPlansData();
                    if (typeof showToast === "function") {
                        showToast(`Plan ${planCode} ${actionText}d successfully.`, "success");
                    }
                } else {
                    throw new Error(response.message || `Failed to ${actionText} plan`);
                }
            } catch (error) {
                console.error("Toggle status error:", error);
                if (typeof showToast === "function") {
                    showToast(error.message || `Failed to ${actionText} plan.`, "error");
                } else {
                    alert(error.message || `Failed to ${actionText} plan.`);
                }
            }
        }
    );
}

async function exportAdminPlansData() {
    try {
        await exportAdminPlans();
    } catch (error) {
        console.error("Export error:", error);
    }
}
