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

function handleSearch(event) {
    if (currentSearchTimeout) {
        clearTimeout(currentSearchTimeout);
    }
    // Debounce search
    currentSearchTimeout = setTimeout(() => {
        loadUsers(0);
    }, 500);
}

async function loadUsers(page = 0) {
    currentPage = page;

    const loadingState = document.getElementById("usersLoadingState");
    const errorState = document.getElementById("usersErrorState");
    const contentState = document.getElementById("usersContent");

    // Only show full loading state on first load or error retry, otherwise keep table visible
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
        direction: "desc"
    };

    if (search) params.search = search;
    if (role) params.role = role;
    if (tier) params.tier = tier;
    if (status) params.status = status;

    try {
        const response = await fetchAdminUsers(params);
        if (response && response.success && response.data) {
            renderUsersTable(response.data);

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

function renderUsersTable(data) {
    const tbody = document.getElementById("usersTableBody");
    tbody.innerHTML = "";

    const users = data.users || [];
    totalPages = data.totalPages || 0;
    const totalElements = data.totalElements || 0;

    if (users.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 24px; color: var(--text-muted);">No users found matching your filters.</td></tr>`;
    } else {
        users.forEach(user => {
            const tr = document.createElement("tr");

            // Format date local
            const createdDate = user.createdAt ? new Date(user.createdAt).toLocaleString() : "N/A";

            tr.innerHTML = `
                <td>#${user.userId}</td>
                <td style="font-weight: 500;">${escapeHtml(user.fullName)}</td>
                <td>${escapeHtml(user.email)}</td>
                <td><span class="badge ${getRoleBadgeClass(user.role)}">${user.role}</span></td>
                <td><span class="badge ${getTierBadgeClass(user.tier)}">${user.tier}</span></td>
                <td style="font-weight: 600; color: var(--primary);">${user.documentCount || 0}</td>
                <td><span class="badge ${getStatusBadgeClass(user.status)}">${user.status}</span></td>
                <td style="color: var(--text-muted); font-size: 13px;">${createdDate}</td>
                <td style="text-align: right;">
                    ${renderActionButtons(user)}
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    // Update Pagination
    const paginationInfo = document.getElementById("paginationInfo");
    const startItem = totalElements === 0 ? 0 : (currentPage * pageSize) + 1;
    const endItem = Math.min((currentPage + 1) * pageSize, totalElements);
    paginationInfo.textContent = `Showing ${startItem} - ${endItem} of ${totalElements}`;

    const paginationContainer = document.querySelector(".admin-pagination");
    if (totalPages <= 1) {
        paginationContainer.style.display = 'none';
    } else {
        paginationContainer.style.display = 'flex';
        document.getElementById("btnPrevPage").disabled = currentPage <= 0;
        document.getElementById("btnNextPage").disabled = currentPage >= totalPages - 1;
    }
}

function changePage(delta) {
    const newPage = currentPage + delta;
    if (newPage >= 0 && newPage < totalPages) {
        loadUsers(newPage);
    }
}

function renderActionButtons(user) {
    let currentUserStr = localStorage.getItem("currentUser");
    let currentUserId = -1;
    if (currentUserStr) {
        try {
            currentUserId = JSON.parse(currentUserStr).id || JSON.parse(currentUserStr).userId;
        } catch(e) {}
    }

    if (user.userId === currentUserId) {
        return `<span style="color: var(--text-muted); font-size: 12px;">(You)</span> <button class="btn btn-outline" style="padding: 4px 8px; font-size: 12px; margin-left: 4px;" onclick="viewUserDetails(${user.userId})">View</button>`;
    }

    const blockMessage = `This user will no longer be able to sign in or use AI Study Hub. Their documents, shares, groups, chat messages, and payment history will not be deleted. Are you sure you want to block this user?`;
    const unblockMessage = `This user will regain access to their account and all previous features. Are you sure you want to unblock this user?`;

    if (user.status === 'BLOCKED') {
        return `<button class="btn btn-outline" style="padding: 4px 8px; font-size: 12px; margin-right: 4px;" onclick="viewUserDetails(${user.userId})">View</button><button class="btn btn-outline" style="padding: 4px 8px; font-size: 12px;" onclick="promptUpdateStatus(${user.userId}, 'ACTIVE', \`${unblockMessage}\`)">Unblock</button>`;
    } else {
        return `<button class="btn btn-outline" style="padding: 4px 8px; font-size: 12px; margin-right: 4px;" onclick="viewUserDetails(${user.userId})">View</button><button class="btn btn-outline" style="padding: 4px 8px; font-size: 12px; color: var(--danger); border-color: var(--danger);" onclick="promptUpdateStatus(${user.userId}, 'BLOCKED', \`${blockMessage}\`)">Block</button>`;
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

function clearFilters() {
    document.getElementById("filterSearch").value = "";
    document.getElementById("filterRole").value = "";
    document.getElementById("filterTier").value = "";
    document.getElementById("filterStatus").value = "";
    loadUsers(0);
}

// Modal Logic
function promptUpdateStatus(userId, newStatus, message) {
    targetUserIdToUpdate = userId;
    targetStatusToUpdate = newStatus;

    document.getElementById("modalTitle").textContent = newStatus === 'BLOCKED' ? "Block User" : "Unblock User";
    document.getElementById("modalBody").textContent = message;

    const confirmBtn = document.getElementById("modalConfirmBtn");
    // Remove old listeners
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

    if (newStatus === 'BLOCKED') {
        newConfirmBtn.style.backgroundColor = 'var(--danger)';
        newConfirmBtn.style.borderColor = 'var(--danger)';
    } else {
        newConfirmBtn.style.backgroundColor = 'var(--primary)';
        newConfirmBtn.style.borderColor = 'var(--primary)';
    }

    newConfirmBtn.addEventListener("click", executeUpdateStatus);

    document.getElementById("confirmModal").classList.add("active");
}

function closeModal() {
    document.getElementById("confirmModal").classList.remove("active");
    targetUserIdToUpdate = null;
    targetStatusToUpdate = null;
}

async function executeUpdateStatus() {
    if (!targetUserIdToUpdate || !targetStatusToUpdate) return;

    try {
        const response = await updateAdminUserStatus(targetUserIdToUpdate, targetStatusToUpdate);
        if (response && response.success) {
            closeModal();
            loadUsers(currentPage); // Reload current page
        } else {
            alert(response.message || "Failed to update user status");
        }
    } catch (error) {
        console.error("Error updating status:", error);
        // Handle "last admin" constraint error
        if (error.response && error.response.status === 400 && error.response.data && error.response.data.message) {
            alert(error.response.data.message);
        } else {
            alert("An error occurred while updating user status.");
        }
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
