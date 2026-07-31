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
    let selectedMajorIds = new Set();
    let availableSchools = [];

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
    const schoolFilter = document.getElementById('schoolFilter');
    const majorFilter = document.getElementById('majorFilter');
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
    const subjectSchoolSelect = document.getElementById('subjectSchoolSelect');
    const subjectMajorOptions = document.getElementById('subjectMajorOptions');
    const selectedMajorSummary = document.getElementById('selectedMajorSummary');
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

    const renderMappingChips = (mappings, key, emptyText) => {
        const values = [];
        const seen = new Set();
        (mappings || []).forEach(mapping => {
            const id = key === 'school'
                ? mapping.schoolId
                : mapping.majorId;
            if (id == null || seen.has(id)) return;
            seen.add(id);
            const code = key === 'school' ? mapping.schoolCode : mapping.majorCode;
            const name = key === 'school' ? mapping.schoolName : mapping.majorName;
            values.push(`<span class="subject-mapping-chip" title="${escapeHtml(name || '')}">${escapeHtml(code || name || '-')}</span>`);
        });
        return values.length
            ? `<div class="subject-mapping-list">${values.join('')}</div>`
            : `<span style="color: var(--text-muted);">${emptyText}</span>`;
    };

    const syncSelectedMajorSummary = () => {
        if (!selectedMajorSummary) return;
        const count = selectedMajorIds.size;
        selectedMajorSummary.textContent = count === 0
            ? 'No majors selected.'
            : `${count} major${count === 1 ? '' : 's'} selected.`;
    };

    const populateMajorSelect = (select, majors, placeholder) => {
        if (!select) return;
        select.innerHTML = `<option value="">${placeholder}</option>`;
        (majors || []).forEach(major => {
            const option = document.createElement('option');
            option.value = major.majorId;
            option.textContent = `${major.majorCode} - ${major.majorName}`;
            select.appendChild(option);
        });
        select.disabled = !majors || majors.length === 0;
        select.dispatchEvent(new Event('syncCustom'));
    };

    const loadMajorsForModal = async (schoolId) => {
        if (!subjectMajorOptions) return;
        if (!schoolId) {
            subjectMajorOptions.innerHTML = '<p style="color: var(--text-muted); margin: 0;">Choose a school first.</p>';
            return;
        }

        subjectMajorOptions.innerHTML = '<p style="color: var(--text-muted); margin: 0;">Loading majors...</p>';
        try {
            const response = await getActiveMajors(schoolId);
            const majors = response && response.success && Array.isArray(response.data)
                ? response.data
                : [];
            if (majors.length === 0) {
                subjectMajorOptions.innerHTML = '<p style="color: var(--text-muted); margin: 0;">No active majors for this school.</p>';
                return;
            }

            subjectMajorOptions.innerHTML = '';
            majors.forEach(major => {
                const label = document.createElement('label');
                label.className = 'subject-major-option';
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.value = major.majorId;
                checkbox.checked = selectedMajorIds.has(Number(major.majorId));
                checkbox.addEventListener('change', () => {
                    const id = Number(major.majorId);
                    if (checkbox.checked) selectedMajorIds.add(id);
                    else selectedMajorIds.delete(id);
                    syncSelectedMajorSummary();
                });
                const text = document.createElement('span');
                text.textContent = `${major.majorCode} - ${major.majorName}`;
                label.append(checkbox, text);
                subjectMajorOptions.appendChild(label);
            });
        } catch (error) {
            subjectMajorOptions.innerHTML = `<p style="color: var(--danger); margin: 0;">${escapeHtml(error.message || 'Failed to load majors.')}</p>`;
        }
    };

    const loadAcademicFilters = async () => {
        try {
            const response = await getActiveSchools();
            availableSchools = response && response.success && Array.isArray(response.data)
                ? response.data
                : [];

            [schoolFilter, subjectSchoolSelect].forEach(select => {
                if (!select) return;
                const currentValue = select.value;
                const placeholder = select === schoolFilter ? 'All Schools' : 'Choose a school';
                select.innerHTML = `<option value="">${placeholder}</option>`;
                availableSchools.forEach(school => {
                    const option = document.createElement('option');
                    option.value = school.schoolId;
                    option.textContent = `${school.schoolCode} - ${school.schoolName}`;
                    select.appendChild(option);
                });
                if (currentValue) select.value = currentValue;
                select.dispatchEvent(new Event('syncCustom'));
            });
        } catch (error) {
            console.error('Failed to load schools for Subject Management:', error);
        }
    };

    // --- Tab Switching Logic ---
    const switchTab = (tabName) => {
        if (tabName === 'subjects') {
            tabSubjectsBtn.classList.add('active');
            tabRequestsBtn.classList.remove('active');
            panelSubjects.style.display = 'block';
            panelRequests.style.display = 'none';
            currentPage = 1;
            loadSubjects();
        } else if (tabName === 'requests') {
            tabRequestsBtn.classList.add('active');
            tabSubjectsBtn.classList.remove('active');
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
            if (schoolFilter && schoolFilter.value) params.schoolId = schoolFilter.value;
            if (majorFilter && majorFilter.value) params.majorId = majorFilter.value;

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
            tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No subjects found.</td></tr>';
            return;
        }

        tableBody.innerHTML = items.map(item => {
            const docCount = item.documentsCount || 0;

            return `
            <tr>
                <td style="font-weight: 500; text-align: center;">${escapeHtml(item.subjectCode)}</td>
                <td style="text-align: center;">${escapeHtml(item.subjectName)}</td>
                <td style="text-align: center;">${renderMappingChips(item.mappings, 'school', 'Not mapped')}</td>
                <td style="text-align: center;">${renderMappingChips(item.mappings, 'major', 'Not mapped')}</td>
                <td style="color: var(--text-muted); text-align: center;">${docCount}</td>
                <td style="text-align: center; vertical-align: middle;">
                    <div class="admin-action-group">
                        <button class="btn btn-sm btn-secondary" onclick='openSubjectModal(${JSON.stringify(item).replace(/'/g, "&#39;")})'>Edit</button>
                    </div>
                </td>
            </tr>
        `}).join('');
    };

    const updateFilterUI = () => {
        const hasFilters = searchInput.value
            || (schoolFilter && schoolFilter.value)
            || (majorFilter && majorFilter.value);
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
            reqTableBody.innerHTML = '<tr><td colspan="8" style="text-align: center;">No requests found.</td></tr>';
            return;
        }

        reqTableBody.innerHTML = items.map(req => `
            <tr>
                <td style="text-align: center;">${escapeHtml(req.requestedCode || req.subjectCode || '-')}</td>
                <td>${escapeHtml(req.requestedName || req.subjectName || '-')}</td>
                <td>${escapeHtml(req.schoolCode ? `${req.schoolCode} - ${req.schoolName}` : '-')}</td>
                <td>${escapeHtml(req.majorCode ? `${req.majorCode} - ${req.majorName}` : '-')}</td>
                <td>${escapeHtml(req.requestedByEmail || req.requestedBy || '-')}</td>
                <td style="text-align: center;"><span class="admin-badge ${req.status === 'APPROVED' ? 'admin-badge-success' : req.status === 'REJECTED' ? 'admin-badge-danger' : 'admin-badge-warning'}">${req.status}</span></td>
                <td style="text-align: center;">${formatDateTime(req.createdAt)}</td>
                <td style="text-align: center; vertical-align: middle;">
                    <div class="admin-action-group">
                        ${req.status === 'PENDING' ? `
                            <button class="btn btn-sm btn-primary" onclick="window.openApproveModal(${req.requestId})">Approve</button>
                            <button class="btn btn-sm btn-outline-danger" onclick="window.openRejectModal(${req.requestId})">Reject</button>
                        ` : req.status === 'APPROVED' ? `
                            <button class="btn btn-sm btn-outline" disabled>Approved</button>
                        ` : `
                            <button class="btn btn-sm btn-outline" disabled>Rejected</button>
                        `}
                    </div>
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
    window.openSubjectModal = async (subject = null) => {
        subjectForm.reset();
        selectedMajorIds = new Set((subject?.mappings || []).map(mapping => Number(mapping.majorId)));
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
        const preferredSchoolId = subject?.mappings?.[0]?.schoolId || '';
        subjectSchoolSelect.value = preferredSchoolId;
        subjectSchoolSelect.dispatchEvent(new Event('syncCustom'));
        syncSelectedMajorSummary();
        await loadMajorsForModal(preferredSchoolId);
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
            description: subjectDescField.value.trim(),
            majorIds: Array.from(selectedMajorIds)
        };
        if (data.majorIds.length === 0) {
            if (typeof window.showToast === 'function') {
                window.showToast('Select at least one major for this subject.', 'error');
            }
            return;
        }
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
            if (typeof window.showToast === "function") {
                window.showToast(`Failed to save subject: ${error.message}`, "error");
            } else {
                alert(`Failed to save subject: ${error.message}`);
            }
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
            if (typeof window.showToast === "function") {
                window.showToast(`Failed to update status: ${error.message}`, "error");
            } else {
                alert(`Failed to update status: ${error.message}`);
            }
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
            if (typeof window.showToast === "function") {
                window.showToast('Failed to reject: ' + error.message, 'error');
            } else {
                alert('Failed to reject: ' + error.message);
            }
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
    if (schoolFilter) {
        schoolFilter.addEventListener('change', async () => {
            const schoolId = schoolFilter.value;
            if (schoolId) {
                try {
                    const response = await getActiveMajors(schoolId);
                    populateMajorSelect(
                        majorFilter,
                        response && response.success ? response.data : [],
                        'All Majors'
                    );
                } catch (error) {
                    populateMajorSelect(majorFilter, [], 'All Majors');
                }
            } else {
                populateMajorSelect(majorFilter, [], 'All Majors');
            }
            currentPage = 1;
            loadSubjects();
        });
    }

    if (majorFilter) {
        majorFilter.addEventListener('change', () => {
            currentPage = 1;
            loadSubjects();
        });
    }

    if (subjectSchoolSelect) {
        subjectSchoolSelect.addEventListener('change', () => {
            loadMajorsForModal(subjectSchoolSelect.value);
        });
    }

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
        if (schoolFilter) {
            schoolFilter.value = '';
            schoolFilter.dispatchEvent(new Event('syncCustom'));
        }
        populateMajorSelect(majorFilter, [], 'All Majors');
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
            if (schoolFilter && schoolFilter.value) params.schoolId = schoolFilter.value;
            if (majorFilter && majorFilter.value) params.majorId = majorFilter.value;

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
    loadAcademicFilters().then(loadSubjects);
    updatePendingBadgeCount();
}
