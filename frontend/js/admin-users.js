/**
 * Admin Users View Logic
 */

let currentPage = 0;
const pageSize = 10;
let totalPages = 0;
let currentSearchTimeout = null;
let targetUserIdToUpdate = null;
let targetStatusToUpdate = null;

document.addEventListener("DOMContentLoaded", () => {
    if (window.initCustomDropdowns) {
        window.initCustomDropdowns();
    }

    if (window.authReady) {
        window.authReady.then((isAuthenticated) => {
            if (isAuthenticated) {
                loadUsers(0);
            }
        });
    } else {
        loadUsers(0);
    }
});

function syncDropdowns() {
    ["filterRole", "filterTier", "filterStatus"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.dispatchEvent(new Event("syncCustom"));
    });
}

function removeFilter(type) {
    if (type === 'search') document.getElementById("filterSearch").value = "";
    if (type === 'role') document.getElementById("filterRole").value = "";
    if (type === 'tier') document.getElementById("filterTier").value = "";
    if (type === 'status') document.getElementById("filterStatus").value = "";
    syncDropdowns();
    onFilterChange();
}

function clearFilters() {
    document.getElementById("filterSearch").value = "";
    document.getElementById("filterRole").value = "";
    document.getElementById("filterTier").value = "";
    document.getElementById("filterStatus").value = "";
    syncDropdowns();
    onFilterChange();
}

function handleSearch(event) {
    if (currentSearchTimeout) {
        clearTimeout(currentSearchTimeout);
    }
    currentSearchTimeout = setTimeout(() => {
        onFilterChange();
    }, 400);
}

function onFilterChange() {
    updateFilterUIState();
    loadUsers(0);
}

function updateFilterUIState() {
    const search = document.getElementById("filterSearch").value.trim();
    const role = document.getElementById("filterRole").value;
    const tier = document.getElementById("filterTier").value;
    const status = document.getElementById("filterStatus").value;

    const btnClear = document.getElementById("btnClearFilters");
    const isFiltered = Boolean(search || role || tier || status);
    if (btnClear) btnClear.disabled = !isFiltered;

    renderFilterChips({ search, role, tier, status });
}

function renderFilterChips(filters) {
    const container = document.getElementById("activeFilterChips");
    if (!container) return;

    let chipsHtml = "";
    if (filters.search) {
        chipsHtml += `<span class="filter-chip">Search: "${escapeHtml(filters.search)}" <span class="filter-chip-remove" onclick="removeFilter('search')">&times;</span></span>`;
    }
    if (filters.role) {
        chipsHtml += `<span class="filter-chip">Role: ${escapeHtml(filters.role)} <span class="filter-chip-remove" onclick="removeFilter('role')">&times;</span></span>`;
    }
    if (filters.tier) {
        chipsHtml += `<span class="filter-chip">Tier: ${escapeHtml(filters.tier)} <span class="filter-chip-remove" onclick="removeFilter('tier')">&times;</span></span>`;
    }
    if (filters.status) {
        chipsHtml += `<span class="filter-chip">Status: ${escapeHtml(filters.status)} <span class="filter-chip-remove" onclick="removeFilter('status')">&times;</span></span>`;
    }

    if (chipsHtml) {
        container.innerHTML = chipsHtml;
        container.style.display = "flex";
    } else {
        container.innerHTML = "";
        container.style.display = "none";
    }
}

async function loadUsers(page = 0) {
    currentPage = page;

    const loadingState = document.getElementById("usersLoadingState");
    const errorState = document.getElementById("usersErrorState");
    const contentState = document.getElementById("usersContent");

    if (contentState.style.display === "none") {
        loadingState.style.display = "flex";
        errorState.style.display = "none";
    }

    const search = document.getElementById("filterSearch").value.trim();
    const role = document.getElementById("filterRole").value;
    const tier = document.getElementById("filterTier").value;
    const status = document.getElementById("filterStatus").value;

    const params = {
        page: currentPage,
        size: pageSize,
        sortBy: "createdAt",
        direction: "asc"
    };

    if (search) params.search = search;
    if (role) params.role = role;
    if (tier) params.tier = tier;
    if (status) params.status = status;

    try {
        const response = await fetchAdminUsers(params);
        if (response && response.success && response.data) {
            renderUsersTable(response.data);
            try {
                renderSummaryCards(response.data);
            } catch (summaryErr) {
                console.warn("Failed to render summary cards:", summaryErr);
            }

            loadingState.style.display = "none";
            errorState.style.display = "none";
            contentState.style.display = "block";
        } else {
            throw new Error(response.message || "Failed to load users");
        }
    } catch (error) {
        console.error("Error loading users:", error);
        loadingState.style.display = "none";
        contentState.style.display = "none";
        errorState.style.display = "flex";
        document.getElementById("usersErrorMessage").textContent = error.message || "An unexpected error occurred.";
    }
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = (value !== null && value !== undefined) ? value : "0";
}

function renderSummaryCards(data) {
    if (!data) return;
    const totalElements = data.totalElements || 0;
    const users = data.users || [];

    let activeCount = 0;
    let blockedCount = 0;
    let adminCount = 0;
    let paidCount = 0;

    users.forEach(u => {
        if (u.status === 'ACTIVE') activeCount++;
        if (u.status === 'BLOCKED') blockedCount++;
        if (u.role === 'ADMIN') adminCount++;
        if (u.tier === 'PREMIUM' || u.tier === 'ULTRA') paidCount++;
    });

    setText("summaryTotalUsers", totalElements.toLocaleString());
    setText("summaryActiveUsers", activeCount.toLocaleString());
    setText("summaryBlockedUsers", blockedCount.toLocaleString());
    setText("summaryAdminUsers", adminCount.toLocaleString());
    setText("summaryPaidUsers", paidCount.toLocaleString());
}

function formatJoinedDate(dateStr) {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return date;
}

function renderUsersTable(data) {
    const tbody = document.getElementById("usersTableBody");
    tbody.innerHTML = "";

    const users = data.users || [];
    totalPages = data.totalPages || 0;
    const totalElements = data.totalElements || 0;

    const activeAdminCount = users.filter(u => u.role === 'ADMIN' && u.status !== 'BLOCKED').length;

    if (users.length === 0) {
        tbody.innerHTML = `<tr><td colspan="11" style="text-align: center; padding: 32px; color: var(--text-muted);">No users found matching your filter criteria.</td></tr>`;
    } else {
        users.forEach((user, index) => {
            const tr = document.createElement("tr");

            const rawEmail = escapeHtml(user.email || 'N/A');
            const namePart = escapeHtml(user.fullName || user.username || 'User');
            const initial = namePart.charAt(0).toUpperCase() || 'U';

            let tierDisplay = `<span class="badge ${getTierBadgeClass(user.tier)}">${user.tier || '-'}</span>`;
            let aiLimitDisplay = "";

            if (user.role === 'ADMIN') {
                tierDisplay = '<span style="color: var(--text-muted, #64748b); font-weight: 500;">-</span>';
                aiLimitDisplay = '<span style="color: var(--text-muted, #64748b); font-weight: 500;">-</span>';
            } else {
                let limit = '10';
                if (user.tier === 'PREMIUM') limit = '50';
                else if (user.tier === 'ULTRA') limit = '200';

                const used = user.aiUsage ? user.aiUsage.aiQaUsed : 0;
                aiLimitDisplay = `
                    <div style="display: flex; flex-direction: column; line-height: 1.25;">
                        <span style="font-size: 13px; color: var(--text-muted, #64748b);">${used} /</span>
                        <span style="font-size: 13px; color: var(--text-muted, #64748b);">${limit}</span>
                    </div>
                `;
            }

            tr.innerHTML = `
                <td><span class="table-muted-text">${(currentPage * pageSize) + index + 1}</span></td>
                <td>
                    <div class="customer-cell">
                        <div class="customer-info">
                            <span class="customer-name" style="font-weight: 600; color: var(--text-main, #0f172a);">${namePart}</span>
                            <span class="customer-email" title="${rawEmail}" style="font-size: 12px; color: var(--text-muted, #64748b);">${rawEmail}</span>
                        </div>
                    </div>
                </td>
                <td style="text-align: center;"><span class="badge ${getRoleBadgeClass(user.role)}">${user.role}</span></td>
                <td style="text-align: center;">${tierDisplay}</td>
                <td style="text-align: center;"><span style="color: var(--success); font-weight: 500; font-size: 14px;">Verified</span></td>
                <td style="text-align: center;"><span class="badge ${getStatusBadgeClass(user.status)}">${user.status}</span></td>
                <td style="text-align: center;"><span style="font-weight: 500; color: var(--text-main, #0f172a);">${user.documentCount || 0}</span></td>
                <td style="text-align: center;">${aiLimitDisplay}</td>
                <td style="text-align: center;"><span class="table-muted-text">${formatJoinedDate(user.createdAt)}</span></td>
                <td style="text-align: center;">
                    ${renderActionButtons(user, activeAdminCount)}
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    // Update Export Button Text
    const btnExport = document.getElementById("btnExportUsers");
    if (btnExport) {
        btnExport.title = `Export ${totalElements.toLocaleString()} filtered users to Excel`;
    }

    // Render Pagination
    const pagination = document.getElementById("pagination");
    if (pagination) {
        if (totalElements === 0) {
            pagination.innerHTML = '';
        } else {
            const startItem = (currentPage * pageSize) + 1;
            const endItem = Math.min((currentPage + 1) * pageSize, totalElements);

            let html = `<span class="admin-pagination-info">Showing ${startItem} - ${endItem} of ${totalElements} users</span><div style="display: flex; gap: 4px;">`;
            for (let i = 0; i < totalPages; i++) {
                html += `<button class="admin-pagination-btn ${i === currentPage ? 'active' : ''}" onclick="window.goToPage(${i})">${i + 1}</button>`;
            }
            html += `</div>`;
            pagination.innerHTML = html;
        }
    }
}

window.goToPage = (page) => {
    currentPage = page;
    loadUsers(page);
};

function renderActionButtons(user, activeAdminCount) {
    let currentUserStr = localStorage.getItem("currentUser");
    let currentUserId = -1;
    if (currentUserStr) {
        try {
            const parsed = JSON.parse(currentUserStr);
            currentUserId = parsed.id || parsed.userId;
        } catch(e) {}
    }

    const viewBtn = `<span class="badge admin-badge-action admin-badge-neutral" style="cursor: pointer;" onclick="viewUserDetails(${user.userId})">View</span>`;

    if (user.userId === currentUserId) {
        return `
            <div class="admin-action-group" style="gap: 12px; display: flex; justify-content: center; align-items: center;">
                ${viewBtn}
                <span class="badge admin-badge-action badge-you-special">You</span>
            </div>
        `;
    }

    const blockMessage = `This user will no longer be able to sign in or access AI Study Hub.<br><br>Are you sure you want to block <strong>${escapeHtml(user.fullName || user.email)}</strong>?`;
    const unblockMessage = `This user will regain full access to their account.<br><br>Are you sure you want to unblock <strong>${escapeHtml(user.fullName || user.email)}</strong>?`;

    const unblockBtnHtml = `<span class="badge admin-badge-action admin-badge-success" style="cursor: pointer;" onclick="promptUpdateStatus(${user.userId}, 'ACTIVE', \`${unblockMessage}\`)">Unblock</span>`;

    if (user.status === 'BLOCKED') {
        return `
            <div class="admin-action-group" style="gap: 12px; display: flex; justify-content: center; align-items: center;">
                ${viewBtn}
                ${unblockBtnHtml}
            </div>
        `;
    } else {
        const isLastAdmin = user.role === 'ADMIN' && activeAdminCount <= 1;
        const blockBtnHtml = isLastAdmin
            ? `<span class="badge admin-badge-action admin-badge-danger" style="opacity: 0.5; cursor: not-allowed;" title="Cannot block the last active admin">Ban</span>`
            : `<span class="badge admin-badge-action admin-badge-danger" style="cursor: pointer;" onclick="promptUpdateStatus(${user.userId}, 'BLOCKED', \`${blockMessage}\`)">Ban</span>`;

        return `
            <div class="admin-action-group" style="gap: 12px; display: flex; justify-content: center; align-items: center;">
                ${viewBtn}
                ${blockBtnHtml}
            </div>
        `;
    }
}

function getRoleBadgeClass(role) {
    if (role === 'ADMIN') return 'admin-badge-warning'; // e.g., orange for admin
    return 'admin-badge-neutral';
}

function getTierBadgeClass(tier) {
    if (tier === 'PREMIUM') return 'admin-badge-success';
    if (tier === 'ULTRA') return 'admin-badge-info';
    return 'admin-badge-neutral';
}

function getStatusBadgeClass(status) {
    if (status === 'ACTIVE') return 'admin-badge-success';
    if (status === 'BLOCKED') return 'admin-badge-danger';
    return 'admin-badge-warning'; // INACTIVE
}

function escapeHtml(unsafe) {
    if (!unsafe) return "";
    return unsafe
         .toString()
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

function handleExport() {
    const search = document.getElementById("filterSearch").value.trim();
    const role = document.getElementById("filterRole").value;
    const tier = document.getElementById("filterTier").value;
    const status = document.getElementById("filterStatus").value;

    const params = {};
    if (search) params.search = search;
    if (role) params.role = role;
    if (tier) params.tier = tier;
    if (status) params.status = status;

    exportAdminUsers(params);
}

// Modal Logic
function promptUpdateStatus(userId, newStatus, message) {
    targetUserIdToUpdate = userId;
    targetStatusToUpdate = newStatus;

    const modalAlert = document.getElementById("modalAlert");
    if (modalAlert) {
        modalAlert.style.display = "none";
        modalAlert.textContent = "";
    }

    document.getElementById("modalTitle").textContent = newStatus === 'BLOCKED' ? "Block User" : "Unblock User";
    document.getElementById("modalBody").innerHTML = message;

    const confirmBtn = document.getElementById("modalConfirmBtn");
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

    if (newStatus === 'BLOCKED') {
        newConfirmBtn.style.backgroundColor = 'var(--danger)';
        newConfirmBtn.style.borderColor = 'var(--danger)';
        newConfirmBtn.textContent = 'Block User';
    } else {
        newConfirmBtn.style.backgroundColor = 'var(--success, #16a34a)';
        newConfirmBtn.style.borderColor = 'var(--success, #16a34a)';
        newConfirmBtn.textContent = 'Unblock User';
    }

    newConfirmBtn.addEventListener("click", executeUpdateStatus);
    document.getElementById("confirmModal").classList.add("active");
}

function closeModal() {
    document.getElementById("confirmModal").classList.remove("active");
    targetUserIdToUpdate = null;
    targetStatusToUpdate = null;
    const modalAlert = document.getElementById("modalAlert");
    if (modalAlert) modalAlert.style.display = "none";
}

async function executeUpdateStatus() {
    if (!targetUserIdToUpdate || !targetStatusToUpdate) return;

    const modalAlert = document.getElementById("modalAlert");
    const confirmBtn = document.getElementById("modalConfirmBtn");
    if (confirmBtn) confirmBtn.disabled = true;

    try {
        const response = await updateAdminUserStatus(targetUserIdToUpdate, targetStatusToUpdate);
        if (response && response.success) {
            closeModal();
            loadUsers(currentPage); // Reload current page
        } else {
            showModalError(response?.message || "Failed to update user status");
        }
    } catch (error) {
        console.error("Error updating status:", error);

        let errorMsg = "An error occurred while updating user status.";
        if (error.status === 401) {
            errorMsg = "Your session has expired. Redirecting to login...";
            setTimeout(() => {
                window.location.href = "login.html";
            }, 1500);
        } else if (error.status === 403) {
            errorMsg = "You do not have permission to block/unblock users.";
        } else if (error.message) {
            errorMsg = error.message;
        }

        showModalError(errorMsg);
    } finally {
        if (confirmBtn) confirmBtn.disabled = false;
    }
}

function showModalError(msg) {
    const modalAlert = document.getElementById("modalAlert");
    if (modalAlert) {
        modalAlert.textContent = msg;
        modalAlert.style.display = "block";
    }
}

async function viewUserDetails(userId) {
    document.getElementById("userDetailModal").classList.add("active");
    const body = document.getElementById("userDetailBody");
    body.innerHTML = '<p>Loading...</p>';
    try {
        const response = await fetchAdmin(`/api/admin/users/${userId}`, { method: 'GET' });
        if (response && response.success && response.data) {
            const u = response.data;
            const expDate = u.tierExpiresAt ? new Date(u.tierExpiresAt).toLocaleString() : 'N/A';
            const joinedDate = u.createdAt ? new Date(u.createdAt).toLocaleString() : 'N/A';

            const formatBytes = (bytes) => {
                if (!bytes) return '0 MB';
                return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
            };

            const formatAmount = (amt) => {
                if (!amt) return '0 đ';
                return amt.toLocaleString('vi-VN') + ' đ';
            };

            let paymentsHtml = '<p style="color: var(--text-muted); font-size: 0.9rem;">No recent payments.</p>';
            if (u.paymentHistory && u.paymentHistory.length > 0) {
                paymentsHtml = '<ul style="margin: 0; padding-left: 20px; font-size: 0.9rem;">' + u.paymentHistory.map(p => `
                    <li style="margin-bottom: 6px;">
                        <strong>${escapeHtml(p.planCode || 'N/A')}</strong> &mdash;
                        <span style="color: var(--success); font-weight: 500;">${formatAmount(p.amount)}</span> via ${escapeHtml(p.paymentProvider || 'N/A')}
                        <br>
                        <span style="color: var(--text-muted); font-size: 0.85rem;">Status: ${p.status} on ${new Date(p.createdAt).toLocaleDateString()}</span>
                    </li>
                `).join('') + '</ul>';
            }

            body.innerHTML = `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
                    <div style="background: var(--surface); padding: 12px; border-radius: 8px; border: 1px solid var(--border);">
                        <h4 style="margin-top: 0; margin-bottom: 12px; font-size: 0.95rem; color: var(--primary);">Account Info</h4>
                        <div style="display: grid; gap: 8px; font-size: 0.9rem;">
                            <div><span style="color: var(--text-muted);">ID:</span> #${u.userId}</div>
                            <div><span style="color: var(--text-muted);">Name:</span> <strong>${escapeHtml(u.fullName)}</strong></div>
                            <div><span style="color: var(--text-muted);">Email:</span> ${escapeHtml(u.email)}</div>
                            <div><span style="color: var(--text-muted);">Joined:</span> ${joinedDate}</div>
                            <div style="margin-top: 4px;">
                                <span class="badge ${getRoleBadgeClass(u.role)}">${u.role}</span>
                                <span class="badge ${getStatusBadgeClass(u.status)}">${u.status}</span>
                            </div>
                        </div>
                    </div>

                    <div style="background: var(--surface); padding: 12px; border-radius: 8px; border: 1px solid var(--border);">
                        <h4 style="margin-top: 0; margin-bottom: 12px; font-size: 0.95rem; color: var(--primary);">Subscription & Quotas</h4>
                        <div style="display: grid; gap: 8px; font-size: 0.9rem;">
                            <div><span style="color: var(--text-muted);">Tier:</span> <span class="badge ${getTierBadgeClass(u.tier)}">${u.tier}</span></div>
                            <div><span style="color: var(--text-muted);">Expires:</span> ${expDate}</div>
                            <div><span style="color: var(--text-muted);">Storage Limit:</span> ${formatBytes(u.storageLimit)}</div>
                            <div><span style="color: var(--text-muted);">Max File Size:</span> ${formatBytes(u.maxFileSize)}</div>
                            <div><span style="color: var(--text-muted);">Max Docs:</span> ${u.maxDocumentCount || 'Unlimited'}</div>
                            <div><span style="color: var(--text-muted);">Docs Uploaded:</span> <strong>${u.documentCount || 0}</strong></div>
                        </div>
                    </div>
                </div>

                <div style="background: var(--surface); padding: 12px; border-radius: 8px; border: 1px solid var(--border); margin-bottom: 16px;">
                    <h4 style="margin-top: 0; margin-bottom: 12px; font-size: 0.95rem; color: var(--primary);">AI Usage Overview</h4>
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; font-size: 0.9rem; text-align: center;">
                        <div style="padding: 8px; background: rgba(0,0,0,0.03); border-radius: 6px;">
                            <div style="font-size: 1.2rem; font-weight: 600;">${u.aiUsage ? u.aiUsage.aiQaUsed : 0} <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: normal;">/ ${u.aiDailyLimit || '?'}</span></div>
                            <div style="color: var(--text-muted); font-size: 0.8rem;">Daily Q&A</div>
                        </div>
                        <div style="padding: 8px; background: rgba(0,0,0,0.03); border-radius: 6px;">
                            <div style="font-size: 1.2rem; font-weight: 600;">${u.aiUsage ? u.aiUsage.summaryUsed + u.aiUsage.flashcardUsed + u.aiUsage.quizUsed : 0}</div>
                            <div style="color: var(--text-muted); font-size: 0.8rem;">Other AI Gen</div>
                        </div>
                        <div style="padding: 8px; background: rgba(0,0,0,0.03); border-radius: 6px;">
                            <div style="font-size: 1.2rem; font-weight: 600; color: var(--primary);">${u.aiUsage ? u.aiUsage.totalAiRequests : 0}</div>
                            <div style="color: var(--text-muted); font-size: 0.8rem;">Total Lifetime</div>
                        </div>
                    </div>
                </div>

                <div style="background: var(--surface); padding: 12px; border-radius: 8px; border: 1px solid var(--border);">
                    <h4 style="margin-top: 0; margin-bottom: 12px; font-size: 0.95rem; color: var(--primary);">Recent Payments</h4>
                    ${paymentsHtml}
                </div>
            `;
        } else {
            body.innerHTML = '<p style="color:var(--danger)">Failed to load details.</p>';
        }
    } catch (e) {
        console.error(e);
        body.innerHTML = '<p style="color:var(--danger)">An error occurred.</p>';
    }
}

function closeUserDetailModal() {
    document.getElementById("userDetailModal").classList.remove("active");
}
