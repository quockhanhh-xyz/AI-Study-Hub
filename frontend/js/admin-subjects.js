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
    // State
    let currentPage = 1;
    const pageSize = 10;

    // Elements
    const tableBody = document.getElementById('subjectsTableBody');
    const pagination = document.getElementById('pagination');
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');
    const exportBtn = document.getElementById('exportBtn');
    const exportBtnText = document.getElementById('exportBtnText');
    const clearFiltersBtn = document.querySelector('button[onclick="clearFilters()"]');

    // Modals
    const subjectModal = document.getElementById('subjectModal');
    const toggleStatusModal = document.getElementById('toggleStatusModal');
    const subjectForm = document.getElementById('subjectForm');

    // Form fields
    const subjectIdField = document.getElementById('subjectId');
    const subjectCodeField = document.getElementById('subjectCode');
    const subjectNameField = document.getElementById('subjectName');
    const subjectDescField = document.getElementById('subjectDesc');
    const modalTitle = document.getElementById('subjectModalTitle');

    // Toggle fields
    const toggleSubjectIdField = document.getElementById('toggleSubjectId');
    const toggleSubjectStatusField = document.getElementById('toggleSubjectStatus');
    const toggleStatusMessage = document.getElementById('toggleStatusMessage');

    const loadSubjects = async () => {
        const loadingState = document.getElementById("subjLoadingState");
        const errorState = document.getElementById("subjErrorState");
        const contentState = document.getElementById("subjContent");

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

    const escapeHtml = (unsafe) => {
        if (unsafe == null) return '';
        return String(unsafe)
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
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
            const docText = docCount === 1 ? '1 document' : `${docCount} documents`;
            
            let descHtml = '<span style="color: var(--text-muted); font-style: italic;">No description</span>';
            if (item.description) {
                descHtml = `<div style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis; max-width: 250px;" title="${item.description.replace(/"/g, '&quot;')}">${item.description}</div>`;
            }

            return `
            <tr>
                <td style="font-weight: 500;">${escapeHtml(item.subjectCode)}</td>
                <td>${escapeHtml(item.subjectName)}</td>
                <td>${item.description ? `<div style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis; max-width: 250px;" title="${escapeHtml(item.description)}">${escapeHtml(item.description)}</div>` : '<span style="color: var(--text-muted); font-style: italic;">No description</span>'}</td>
                <td style="color: var(--text-muted);">${docText}</td>
                <td><span class="admin-badge ${statusClass}">${statusText}</span></td>
                <td>${formatDateTime(item.createdAt)}</td>
                <td>
                    <button class="btn btn-sm btn-secondary" onclick='openSubjectModal(${JSON.stringify(item).replace(/'/g, "&#39;")})'>Edit</button>
                    ${item.status === 'ACTIVE'
                        ? `<button class="btn btn-sm btn-outline" style="color: var(--text-muted); border-color: var(--border-color);" onclick="openToggleModal(${item.subjectId}, 'INACTIVE', '${escapeHtml(item.subjectCode)}')">Disable</button>`
                        : `<button class="btn btn-sm btn-primary" onclick="openToggleModal(${item.subjectId}, 'ACTIVE', '${escapeHtml(item.subjectCode)}')">Enable</button>`
                    }
                </td>
            </tr>
        `}).join('');
    };

    const formatDateTime = (dateStr) => {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) + ' &middot; ' + 
               date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
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

    // Modal Helpers
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

    window.closeModal = (modalId) => {
        document.getElementById(modalId).classList.remove('active');
    };

    // Actions
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

    let currentSearchTimeout = null;
    searchInput.addEventListener('input', () => {
        if (currentSearchTimeout) clearTimeout(currentSearchTimeout);
        currentSearchTimeout = setTimeout(() => {
            currentPage = 1;
            loadSubjects();
        }, 500);
    });

    [statusFilter].forEach(el => {
        if (el) {
            el.addEventListener('change', () => {
                currentPage = 1;
                loadSubjects();
            });
        }
    });

    window.clearFilters = () => {
        searchInput.value = '';
        statusFilter.value = '';
        currentPage = 1;
        loadSubjects();
    };

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

    // Initial Load
    loadSubjects();
}
