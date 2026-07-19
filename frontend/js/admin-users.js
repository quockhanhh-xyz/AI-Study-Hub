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
    // Prevent blocking super admin (assuming ID 1 is super admin or cannot block self, but simple logic for now)
    // We will just allow block/unblock for all for demo, maybe avoid blocking if ID == 1
    if (user.userId === 1 || user.role === 'ADMIN') {
        return `<span style="color: var(--text-muted); font-size: 12px;">No Actions</span>`;
    }

    if (user.status === 'BLOCKED') {
        return `<button class="btn btn-outline" style="padding: 4px 8px; font-size: 12px; margin-right: 4px;" onclick="viewUserDetails(${user.userId})">View</button><button class="btn btn-outline" style="padding: 4px 8px; font-size: 12px;" onclick="promptUpdateStatus(${user.userId}, 'ACTIVE', 'Unblock this user?')">Unblock</button>`;
    } else {
        return `<button class="btn btn-outline" style="padding: 4px 8px; font-size: 12px; margin-right: 4px;" onclick="viewUserDetails(${user.userId})">View</button><button class="btn btn-outline" style="padding: 4px 8px; font-size: 12px; color: var(--danger); border-color: var(--danger);" onclick="promptUpdateStatus(${user.userId}, 'BLOCKED', 'Block this user?')">Block</button>`;
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
        alert("An error occurred while updating the status.");
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

            let paymentsHtml = 'None';
            if (u.paymentHistory && u.paymentHistory.length > 0) {
                paymentsHtml = '<ul style="margin:0; padding-left:20px;">' + u.paymentHistory.map(p => `<li>${escapeHtml(p.planCode || 'N/A')} (${p.amount || 0} via ${escapeHtml(p.paymentProvider || 'N/A')}) - ${p.status} on ${new Date(p.createdAt).toLocaleDateString()}</li>`).join('') + '</ul>';
            }

            body.innerHTML = `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <div><strong>ID:</strong> #${u.userId}</div>
                    <div><strong>Name:</strong> ${escapeHtml(u.fullName)}</div>
                    <div><strong>Email:</strong> ${escapeHtml(u.email)}</div>
                    <div><strong>Role:</strong> ${u.role}</div>
                    <div><strong>Status:</strong> <span class="badge ${getStatusBadgeClass(u.status)}">${u.status}</span></div>
                    <div><strong>Tier:</strong> <span class="badge ${getTierBadgeClass(u.tier)}">${u.tier}</span></div>
                    <div><strong>Tier Expires:</strong> ${expDate}</div>
                    <div><strong>Documents:</strong> ${u.documentCount || 0}</div>
                    <div><strong>Joined:</strong> ${joinedDate}</div>
                </div>
                <hr style="margin: 15px 0; border: none; border-top: 1px solid var(--border);">
                <div>
                    <strong>Usage / Quota:</strong>
                    <div style="font-size: 13px; margin-top:5px;">
                        <div>AI Q&A: ${u.aiUsage ? u.aiUsage.aiQaUsed : 0} / ${u.aiDailyLimit || '?'}</div>
                        <div>Summaries: ${u.aiUsage ? u.aiUsage.summaryUsed : 0}</div>
                        <div>Flashcards: ${u.aiUsage ? u.aiUsage.flashcardUsed : 0}</div>
                        <div>Quizzes: ${u.aiUsage ? u.aiUsage.quizUsed : 0}</div>
                        <div>Total AI Requests: ${u.aiUsage ? u.aiUsage.totalAiRequests : 0}</div>
                        <div>Storage Limit: ${u.storageLimit || '?'} bytes</div>
                        <div>Max File Size: ${u.maxFileSize || '?'} bytes</div>
                        <div>Max Docs: ${u.maxDocumentCount || '?'}</div>
                    </div>
                </div>
                <hr style="margin: 15px 0; border: none; border-top: 1px solid var(--border);">
                <div>
                    <strong>Recent Payments:</strong>
                    <div style="font-size: 13px; margin-top:5px;">${paymentsHtml}</div>
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
