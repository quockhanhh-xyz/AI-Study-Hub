document.addEventListener('DOMContentLoaded', () => {
    if (window.authReady) {
        window.authReady.then((isAuthenticated) => {
            if (isAuthenticated) init();
        });
    } else {
        init();
    }
});

let currentPage = 1;
const pageSize = 10;

function init() {
    const tableBody = document.getElementById('reqTableBody');
    const pagination = document.getElementById('pagination');
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');
    const exportBtn = document.getElementById('exportBtn');

    const approveModal = document.getElementById('approveModal');
    const rejectModal = document.getElementById('rejectModal');
    const approveReqId = document.getElementById('approveReqId');
    const rejectReqId = document.getElementById('rejectReqId');
    const rejectReason = document.getElementById('rejectReason');
    const duplicateWarning = document.getElementById('duplicateWarning');

    const loadRequests = async () => {
        const loadingState = document.getElementById("reqLoadingState");
        const errorState = document.getElementById("reqErrorState");
        const contentState = document.getElementById("reqContent");

        if (contentState.style.display === "none" || contentState.style.display === "") {
            loadingState.style.display = "flex";
            errorState.style.display = "none";
        } else {
            errorState.style.display = "none";
        }

        try {
            const params = {
                page: currentPage - 1,
                size: pageSize
            };

            if (searchInput.value) params.search = searchInput.value;
            if (statusFilter.value) params.status = statusFilter.value;

            const response = await getAdminSubjectRequests(params);

            if (response && response.success && response.data) {
                const data = response.data;
                renderTable(data.items || data.requests || data.content || []); // Depending on backend format
                renderPagination(data.totalPages || 0);

                loadingState.style.display = "none";
                contentState.style.display = "block";
            } else {
                throw new Error(response?.message || "Failed to load requests");
            }
        } catch (error) {
            console.error('Error loading requests:', error);
            loadingState.style.display = "none";
            errorState.style.display = "flex";
            document.getElementById("reqErrorMessage").textContent = error.message || "An unexpected error occurred.";
        }
    };

    const renderTable = (items) => {
        if (!items || items.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No requests found.</td></tr>';
            return;
        }

        tableBody.innerHTML = items.map(req => `
            <tr>
                <td>${escapeHtml(req.requestedCode || req.subjectCode || '-')}</td>
                <td>${escapeHtml(req.requestedName || req.subjectName || '-')}</td>
                <td>${escapeHtml(req.requestedByEmail || req.requestedBy || '-')}</td>
                <td><span class="admin-badge ${req.status === 'APPROVED' ? 'admin-badge-success' : req.status === 'REJECTED' ? 'admin-badge-danger' : 'admin-badge-warning'}">${req.status}</span></td>
                <td>${req.createdAt ? new Date(req.createdAt).toLocaleString() : '-'}</td>
                <td style="text-align:right">
                    ${req.status === 'PENDING' ? `
                        <button class="btn btn-sm btn-primary" onclick="window.openApproveModal(${req.requestId})">Approve</button>
                        <button class="btn btn-sm btn-danger" onclick="window.openRejectModal(${req.requestId})">Reject</button>
                    ` : req.status === 'APPROVED' ? `
                        <button class="btn btn-sm btn-outline" disabled>Approved</button>
                    ` : `
                        <button class="btn btn-sm btn-outline" disabled>Rejected</button>
                    `}
                </td>
            </tr>
        `).join('');
    };

    const renderPagination = (totalPages) => {
        pagination.innerHTML = '';
        if (totalPages <= 1) return;

        for (let i = 1; i <= totalPages; i++) {
            const btn = document.createElement('button');
            btn.textContent = i;
            if (i === currentPage) btn.classList.add('active');
            btn.onclick = () => {
                currentPage = i;
                loadRequests();
            };
            pagination.appendChild(btn);
        }
    };

    window.openApproveModal = (id) => {
        approveReqId.value = id;
        duplicateWarning.style.display = 'none';
        duplicateWarning.textContent = '';
        approveModal.classList.add('active');
    };

    window.openRejectModal = (id) => {
        rejectReqId.value = id;
        rejectReason.value = '';
        rejectModal.classList.add('active');
    };

    window.closeModal = (modalId) => {
        document.getElementById(modalId).classList.remove('active');
    };

    document.getElementById('confirmApproveBtn').addEventListener('click', async () => {
        const id = approveReqId.value;
        try {
            const res = await approveAdminSubjectRequest(id);
            if (res.success) {
                closeModal('approveModal');
                loadRequests();
            } else {
                duplicateWarning.style.display = 'block';
                duplicateWarning.textContent = res.message || 'Failed to approve.';
            }
        } catch (error) {
            duplicateWarning.style.display = 'block';
            duplicateWarning.textContent = 'Error: ' + error.message;
        }
    });

    document.getElementById('confirmRejectBtn').addEventListener('click', async () => {
        const id = rejectReqId.value;
        const reason = rejectReason.value;
        try {
            await rejectAdminSubjectRequest(id, reason);
            closeModal('rejectModal');
            loadRequests();
        } catch (error) {
            alert('Failed to reject: ' + error.message);
        }
    });

    let currentSearchTimeout = null;
    searchInput.addEventListener('input', () => {
        if (currentSearchTimeout) clearTimeout(currentSearchTimeout);
        currentSearchTimeout = setTimeout(() => {
            currentPage = 1;
            loadRequests();
        }, 500);
    });

    [statusFilter].forEach(el => {
        if (el) {
            el.addEventListener('change', () => {
                currentPage = 1;
                loadRequests();
            });
        }
    });

    window.clearFilters = () => {
        searchInput.value = '';
        statusFilter.value = '';
        currentPage = 1;
        loadRequests();
    };

    exportBtn.addEventListener('click', async () => {
        try {
            exportBtn.disabled = true;
            exportBtn.innerHTML = 'Exporting...';
            const params = {};
            if (searchInput.value) params.search = searchInput.value;
            if (statusFilter.value) params.status = statusFilter.value;

            await exportAdminSubjectRequests(params);
        } catch (error) {
            console.error('Failed to export', error);
        } finally {
            exportBtn.disabled = false;
            exportBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="18" width="18" stroke="currentColor" stroke-width="2" style="margin-right: 6px; vertical-align: text-bottom;">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Export Excel
            `;
        }
    });

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

    // Initial Load
    loadRequests();
}
