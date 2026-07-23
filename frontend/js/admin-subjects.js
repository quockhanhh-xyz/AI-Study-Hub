document.addEventListener('DOMContentLoaded', () => {
    // Wait for the auth layout system to finish verifying the user
    if (window.authReady) {
        window.authReady.then((isAuthenticated) => {
            if (isAuthenticated) {
                initAdminSubjects();
            }
        });
    } else {
        initAdminSubjects();
    }
});

function initAdminSubjects() {
    // --- State for Subjects Tab ---
    let currentPage = 1;
    const pageSize = 10;

    // --- State for Requests Tab ---
    let reqCurrentPage = 1;
    const reqPageSize = 10;

    // --- Elements ---
    // Tabs
    const tabSubjectsBtn = document.getElementById('tabSubjectsBtn');
    const tabRequestsBtn = document.getElementById('tabRequestsBtn');
    const panelSubjects = document.getElementById('panelSubjects');
    const panelRequests = document.getElementById('panelRequests');
    const tabCountPendingRequests = document.getElementById('tabCountPendingRequests');

    // Subjects Elements
    const tableBody = document.getElementById('subjectsTableBody');
    const pagination = document.getElementById('pagination');
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');
    const exportBtn = document.getElementById('exportBtn');
    const exportBtnText = document.getElementById('exportBtnText');
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');

    // Modals (Subjects)
    const subjectModal = document.getElementById('subjectModal');
    const toggleStatusModal = document.getElementById('toggleStatusModal');
    const subjectForm = document.getElementById('subjectForm');
    const subjectIdField = document.getElementById('subjectId');
    const subjectCodeField = document.getElementById('subjectCode');
    const subjectNameField = document.getElementById('subjectName');
    const subjectDescField = document.getElementById('subjectDesc');
    const modalTitle = document.getElementById('subjectModalTitle');
    const toggleSubjectIdField = document.getElementById('toggleSubjectId');
    const toggleSubjectStatusField = document.getElementById('toggleSubjectStatus');
    const toggleStatusMessage = document.getElementById('toggleStatusMessage');

    // Requests Elements
    const reqTableBody = document.getElementById('reqTableBody');
    const reqPagination = document.getElementById('reqPagination');
    const reqSearchInput = document.getElementById('reqSearchInput');
    const reqStatusFilter = document.getElementById('reqStatusFilter');
    const reqExportBtn = document.getElementById('reqExportBtn');
    const reqExportBtnText = document.getElementById('reqExportBtnText');
    const clearReqFiltersBtn = document.getElementById('clearReqFiltersBtn');

    // Modals (Requests)
    const approveModal = document.getElementById('approveModal');
    const rejectModal = document.getElementById('rejectModal');
    const approveReqId = document.getElementById('approveReqId');
    const rejectReqId = document.getElementById('rejectReqId');
    const rejectReason = document.getElementById('rejectReason');
    const duplicateWarning = document.getElementById('duplicateWarning');

    // --- Helper Functions ---
    const escapeHtml = (unsafe) => {
        if (unsafe == null) return '';
        return String(unsafe)
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
    };

    const formatDateTime = (dateStr) => {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
    };

    // --- Tab Switching Logic ---
    const switchTab = (tabName) => {
        if (tabName === 'subjects') {
            tabSubjectsBtn.classList.add('active');
            tabRequestsBtn.classList.remove('active');
            tabSubjectsBtn.style.borderBottom = '2px solid var(--primary)';
            tabSubjectsBtn.style.color = 'var(--primary)';
            tabSubjectsBtn.style.fontWeight = '600';
            tabRequestsBtn.style.borderBottom = '2px solid transparent';
            tabRequestsBtn.style.color = 'var(--text-muted)';
            tabRequestsBtn.style.fontWeight = '500';
            panelSubjects.style.display = 'block';
            panelRequests.style.display = 'none';
            currentPage = 1;
            loadSubjects();
        } else if (tabName === 'requests') {
            tabRequestsBtn.classList.add('active');
            tabSubjectsBtn.classList.remove('active');
            tabRequestsBtn.style.borderBottom = '2px solid var(--primary)';
            tabRequestsBtn.style.color = 'var(--primary)';
            tabRequestsBtn.style.fontWeight = '600';
            tabSubjectsBtn.style.borderBottom = '2px solid transparent';
            tabSubjectsBtn.style.color = 'var(--text-muted)';
            tabSubjectsBtn.style.fontWeight = '500';
            panelRequests.style.display = 'block';
            panelSubjects.style.display = 'none';
            reqCurrentPage = 1;
            loadRequests();
        }
    };

    tabSubjectsBtn.addEventListener('click', () => switchTab('subjects'));
    tabRequestsBtn.addEventListener('click', () => switchTab('requests'));

    // --- Subjects Management Logic ---
    const loadSubjectStats = async () => {
        try {
            const isSubjectsTab = tabSubjectsBtn && tabSubjectsBtn.classList.contains('active');
            const searchVal = isSubjectsTab ? (searchInput ? searchInput.value.trim() : '') : (reqSearchInput ? reqSearchInput.value.trim() : '');
            const query = searchVal ? `?search=${encodeURIComponent(searchVal)}` : '';
            const response = await get(`/api/admin/subjects/stats${query}`, { skipUnauthorizedRedirect: true });
            if (response && response.success && response.data) {
                const stats = response.data;
                document.getElementById("cardTotalSubjects").textContent = stats.total || 0;
                document.getElementById("cardActiveSubjects").textContent = stats.active || 0;
                document.getElementById("cardInactiveSubjects").textContent = stats.inactive || 0;
                document.getElementById("cardPendingRequests").textContent = stats.pendingRequests || 0;
            }
        } catch (err) {
            console.error("Failed to load subjects stats", err);
        }
    };

    const loadSubjects = async () => {
        const loadingState = document.getElementById("subjLoadingState");
        const errorState = document.getElementById("subjErrorState");
        const contentState = document.getElementById("subjContent");

        // Load stats in parallel
        loadSubjectStats();

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

            updateFilterUI();

            const response = await getAdminSubjects(params);

            if (response && response.success && response.data) {
                const data = response.data;
                renderTable(data.subjects);
                renderPagination(data.totalPages || 0, data.totalElements || 0);

                loadingState.style.display = "none";
                contentState.style.display = "block";
            } else {
                throw new Error(response?.message || "Failed to load subjects");
            }

        } catch (error) {
            console.error('Error loading subjects:', error);
            loadingState.style.display = "none";
            errorState.style.display = "flex";
            document.getElementById("subjErrorMessage").textContent = error.message || "An unexpected error occurred.";
        }
    };

    const renderTable = (items) => {
        if (!items || items.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No subjects found.</td></tr>';
            return;
        }

        tableBody.innerHTML = items.map(item => {
            const statusClass = item.status === 'ACTIVE' ? 'admin-badge-success' : 'admin-badge-danger';
            const statusText = item.status === 'ACTIVE' ? 'Active' : 'Inactive';
            const docCount = item.documentsCount || 0;

            return `
            <tr>
                <td style="font-weight: 500; text-align: center;">${escapeHtml(item.subjectCode)}</td>
                <td style="text-align: center;">${escapeHtml(item.subjectName)}</td>
                <td>${item.description ? `<div style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis; max-width: 250px;" title="${escapeHtml(item.description)}">${escapeHtml(item.description)}</div>` : '<span style="color: var(--text-muted); font-style: italic;">No description</span>'}</td>
                <td style="color: var(--text-muted); text-align: center;">${docCount}</td>
                <td style="text-align: center;"><span class="admin-badge ${statusClass}">${statusText}</span></td>
                <td style="text-align: center;">${formatDateTime(item.createdAt)}</td>
                <td style="text-align: center; white-space: nowrap;">
                    <button class="btn btn-sm btn-secondary" onclick='openSubjectModal(${JSON.stringify(item).replace(/'/g, "&#39;")})'>Edit</button>
                    ${item.status === 'ACTIVE'
                        ? `<button class="btn btn-sm btn-outline" style="color: var(--text-muted); border-color: var(--border-color);" onclick="openToggleModal(${item.subjectId}, 'INACTIVE', '${escapeHtml(item.subjectCode)}')">Disable</button>`
                        : `<button class="btn btn-sm btn-primary" onclick="openToggleModal(${item.subjectId}, 'ACTIVE', '${escapeHtml(item.subjectCode)}')">Enable</button>`
                    }
                </td>
            </tr>
        `}).join('');
    };

    const updateFilterUI = () => {
        const hasFilters = searchInput.value || statusFilter.value;
        exportBtnText.textContent = hasFilters ? "Export filtered subjects" : "Export all subjects";
        clearFiltersBtn.style.display = hasFilters ? "inline-flex" : "none";
    };

    const renderPagination = (totalPages, totalElements) => {
        pagination.innerHTML = '';
        if (totalPages <= 1 && totalElements === 0) return;

        const startItem = totalElements === 0 ? 0 : (currentPage - 1) * pageSize + 1;
        const endItem = Math.min(currentPage * pageSize, totalElements);

        let html = `<span class="admin-pagination-info">Showing ${startItem} - ${endItem} of ${totalElements} subjects</span><div style="display: flex; gap: 4px;">`;
        for (let i = 1; i <= totalPages; i++) {
            html += `<button class="admin-pagination-btn ${i === currentPage ? 'active' : ''}" onclick="window.goToPage(${i})">${i}</button>`;
        }
        html += `</div>`;
        pagination.innerHTML = html;
    };

    window.goToPage = (page) => {
        currentPage = page;
        loadSubjects();
    };

    // --- Subject Requests Management Logic ---
    const loadRequests = async () => {
        const loadingState = document.getElementById("subjLoadingState");
        const errorState = document.getElementById("subjErrorState");
        const contentState = document.getElementById("subjContent");

        // Load stats in parallel
        loadSubjectStats();

        if (contentState.style.display === "none" || contentState.style.display === "") {
            loadingState.style.display = "flex";
            errorState.style.display = "none";
        } else {
            errorState.style.display = "none";
        }

        try {
            const params = {
                page: reqCurrentPage - 1,
                size: reqPageSize
            };

            if (reqSearchInput.value) params.search = reqSearchInput.value;
            if (reqStatusFilter.value) params.status = reqStatusFilter.value;

            updateReqFilterUI();

            const response = await getAdminSubjectRequests(params);

            if (response && response.success && response.data) {
                const data = response.data;
                renderReqTable(data.items || data.requests || data.content || []);
                renderReqPagination(data.totalPages || 0);

                loadingState.style.display = "none";
                contentState.style.display = "block";
            } else {
                throw new Error(response?.message || "Failed to load requests");
            }
        } catch (error) {
            console.error('Error loading requests:', error);
            loadingState.style.display = "none";
            errorState.style.display = "flex";
            document.getElementById("subjErrorMessage").textContent = error.message || "An unexpected error occurred.";
        }
    };

    const renderReqTable = (items) => {
        if (!items || items.length === 0) {
            reqTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No requests found.</td></tr>';
            return;
        }

        reqTableBody.innerHTML = items.map(req => `
            <tr>
                <td style="text-align: center;">${escapeHtml(req.requestedCode || req.subjectCode || '-')}</td>
                <td>${escapeHtml(req.requestedName || req.subjectName || '-')}</td>
                <td>${escapeHtml(req.requestedByEmail || req.requestedBy || '-')}</td>
                <td style="text-align: center;"><span class="admin-badge ${req.status === 'APPROVED' ? 'admin-badge-success' : req.status === 'REJECTED' ? 'admin-badge-danger' : 'admin-badge-warning'}">${req.status}</span></td>
                <td style="text-align: center;">${formatDateTime(req.createdAt)}</td>
                <td style="text-align: center; white-space: nowrap;">
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

    const updateReqFilterUI = () => {
        const hasFilters = reqSearchInput.value || reqStatusFilter.value;
        reqExportBtnText.textContent = hasFilters ? "Export filtered requests" : "Export all requests";
        clearReqFiltersBtn.style.display = hasFilters ? "inline-flex" : "none";
    };

    const renderReqPagination = (totalPages) => {
        reqPagination.innerHTML = '';
        if (totalPages <= 1) return;

        for (let i = 1; i <= totalPages; i++) {
            const btn = document.createElement('button');
            btn.textContent = i;
            if (i === reqCurrentPage) btn.classList.add('active');
            btn.onclick = () => {
                reqCurrentPage = i;
                loadRequests();
            };
            reqPagination.appendChild(btn);
        }
    };

    // --- Badge Counts for Pending Requests ---
    const updatePendingBadgeCount = async () => {
        try {
            const res = await getAdminSubjectRequests({ status: 'PENDING', size: 1 });
            if (res && res.success && res.data) {
                const count = res.data.totalElements || res.data.items?.length || 0;
                if (count > 0) {
                    tabCountPendingRequests.textContent = count;
                    tabCountPendingRequests.style.display = 'inline-block';
                } else {
                    tabCountPendingRequests.style.display = 'none';
                }
            }
        } catch (e) {
            console.error("Failed to fetch pending requests count:", e);
        }
    };

    // --- Modals Helper Exposes ---
    window.openSubjectModal = (subject = null) => {
        subjectForm.reset();
        const helper = document.getElementById('subjectCodeHelper');
        const warning = document.getElementById('subjectCodeWarning');

        if (subject) {
            modalTitle.textContent = 'Edit Subject';
            subjectIdField.value = subject.subjectId;
            subjectCodeField.value = subject.subjectCode;
            subjectCodeField.disabled = true;
            subjectCodeField.style.backgroundColor = 'var(--bg-secondary)';
            subjectNameField.value = subject.subjectName;
            subjectDescField.value = subject.description || '';

            helper.style.display = 'none';
            warning.style.display = 'block';
        } else {
            modalTitle.textContent = 'Create Subject';
            subjectIdField.value = '';
            subjectCodeField.disabled = false;
            subjectCodeField.style.backgroundColor = '';

            helper.style.display = 'block';
            warning.style.display = 'none';
        }
        subjectModal.classList.add('active');
    };

    window.openToggleModal = (id, newStatus, code) => {
        toggleSubjectIdField.value = id;
        toggleSubjectStatusField.value = newStatus;
        if (newStatus === 'ACTIVE') {
            toggleStatusMessage.innerHTML = `<strong>Enable ${code}?</strong><br><br><span style="color: var(--text-muted); font-size: 0.875rem;">Users will be able to select this subject again for new uploads.</span>`;
        } else {
            toggleStatusMessage.innerHTML = `<strong>Disable ${code}?</strong><br><br><span style="color: var(--text-muted); font-size: 0.875rem;">Users will no longer be able to choose this subject for new uploads or filters. Existing documents using this subject will keep showing it.</span>`;
        }
        toggleStatusModal.classList.add('active');
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

    // --- Actions ---
    // Subjects Actions
    document.getElementById('saveSubjectBtn').addEventListener('click', async () => {
        if (!subjectForm.checkValidity()) {
            subjectForm.reportValidity();
            return;
        }

        const data = {
            subjectCode: subjectCodeField.value.trim().toUpperCase(),
            subjectName: subjectNameField.value.trim(),
            description: subjectDescField.value.trim()
        };
        const id = subjectIdField.value;

        try {
            if (id) {
                await updateAdminSubject(id, data);
            } else {
                await createAdminSubject(data);
            }
            closeModal('subjectModal');
            loadSubjects();
        } catch (error) {
            alert(`Failed to save subject: ${error.message}`);
        }
    });

    document.getElementById('confirmToggleBtn').addEventListener('click', async () => {
        const id = toggleSubjectIdField.value;
        const status = toggleSubjectStatusField.value;
        try {
            await updateAdminSubjectStatus(id, status);
            closeModal('toggleStatusModal');
            loadSubjects();
        } catch (error) {
            alert(`Failed to update status: ${error.message}`);
        }
    });

    // Subject Requests Actions
    document.getElementById('confirmApproveBtn').addEventListener('click', async () => {
        const id = approveReqId.value;
        try {
            const res = await approveAdminSubjectRequest(id);
            if (res.success) {
                closeModal('approveModal');
                loadRequests();
                updatePendingBadgeCount();
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
            updatePendingBadgeCount();
        } catch (error) {
            alert('Failed to reject: ' + error.message);
        }
    });

    // --- Search Timeout Handlers ---
    let currentSearchTimeout = null;
    searchInput.addEventListener('input', () => {
        if (currentSearchTimeout) clearTimeout(currentSearchTimeout);
        currentSearchTimeout = setTimeout(() => {
            currentPage = 1;
            loadSubjects();
        }, 500);
    });

    let currentReqSearchTimeout = null;
    reqSearchInput.addEventListener('input', () => {
        if (currentReqSearchTimeout) clearTimeout(currentReqSearchTimeout);
        currentReqSearchTimeout = setTimeout(() => {
            reqCurrentPage = 1;
            loadRequests();
        }, 500);
    });

    // --- Filter Handlers ---
    [statusFilter].forEach(el => {
        if (el) {
            el.addEventListener('change', () => {
                currentPage = 1;
                loadSubjects();
            });
        }
    });

    [reqStatusFilter].forEach(el => {
        if (el) {
            el.addEventListener('change', () => {
                reqCurrentPage = 1;
                loadRequests();
            });
        }
    });

    // --- Clear Filters ---
    window.clearFilters = () => {
        searchInput.value = '';
        statusFilter.value = '';
        statusFilter.dispatchEvent(new Event('syncCustom'));
        currentPage = 1;
        loadSubjects();
    };

    window.clearReqFilters = () => {
        reqSearchInput.value = '';
        reqStatusFilter.value = '';
        reqStatusFilter.dispatchEvent(new Event('syncCustom'));
        reqCurrentPage = 1;
        loadRequests();
    };

    // --- Exports ---
    exportBtn.addEventListener('click', async () => {
        try {
            exportBtn.disabled = true;
            exportBtn.innerHTML = 'Exporting...';
            const params = {};
            if (searchInput.value) params.search = searchInput.value;
            if (statusFilter.value) params.status = statusFilter.value;

            await exportAdminSubjects(params);
        } catch (error) {
            console.error('Failed to export data', error);
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

    reqExportBtn.addEventListener('click', async () => {
        try {
            reqExportBtn.disabled = true;
            reqExportBtn.innerHTML = 'Exporting...';
            const params = {};
            if (reqSearchInput.value) params.search = reqSearchInput.value;
            if (reqStatusFilter.value) params.status = reqStatusFilter.value;

            await exportAdminSubjectRequests(params);
        } catch (error) {
            console.error('Failed to export requests data', error);
        } finally {
            reqExportBtn.disabled = false;
            reqExportBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="18" width="18" stroke="currentColor" stroke-width="2" style="margin-right: 6px; vertical-align: text-bottom;">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Export Excel
            `;
        }
    });

    // --- Init Custom Select for Dynamic elements ---
    if (window.UIHelper && typeof window.UIHelper.convertSelectToCustomDropdown === 'function') {
        // Run conversion for any select inside panelRequests
        panelRequests.querySelectorAll('.admin-select').forEach(select => {
            window.UIHelper.convertSelectToCustomDropdown(select);
        });
    }

    // --- Initial Load ---
    loadSubjects();
    updatePendingBadgeCount();
}
