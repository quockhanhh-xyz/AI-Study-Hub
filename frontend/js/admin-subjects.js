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
    const filterBtn = document.getElementById('filterBtn');
    const exportBtn = document.getElementById('exportBtn');

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

        loadingState.style.display = "flex";
        errorState.style.display = "none";
        contentState.style.display = "none";

        try {
            const params = {
                page: currentPage - 1,
                size: pageSize
            };

            if (searchInput.value) params.search = searchInput.value;
            if (statusFilter.value) params.status = statusFilter.value;

            const response = await getAdminSubjects(params);

            if (response && response.success && response.data) {
                const data = response.data;
                renderTable(data.subjects);
                renderPagination(data.totalPages);

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

        tableBody.innerHTML = items.map(item => `
            <tr>
                <td>${item.subjectCode}</td>
                <td>${item.subjectName}</td>
                <td>${item.description || '-'}</td>
                <td><span class="badge ${item.status.toLowerCase()}">${item.status}</span></td>
                <td>${item.createdAt ? new Date(item.createdAt).toLocaleString() : '-'}</td>
                <td>
                    <button class="btn btn-sm btn-secondary" onclick='openSubjectModal(${JSON.stringify(item)})'>Edit</button>
                    ${item.status === 'ACTIVE'
                        ? `<button class="btn btn-sm btn-danger" onclick="openToggleModal(${item.subjectId}, 'INACTIVE', '${item.subjectName}')">Disable</button>`
                        : `<button class="btn btn-sm btn-primary" onclick="openToggleModal(${item.subjectId}, 'ACTIVE', '${item.subjectName}')">Enable</button>`
                    }
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
                loadSubjects();
            };
            pagination.appendChild(btn);
        }
    };

    // Modal Helpers
    window.openSubjectModal = (subject = null) => {
        subjectForm.reset();
        if (subject) {
            modalTitle.textContent = 'Edit Subject';
            subjectIdField.value = subject.subjectId;
            subjectCodeField.value = subject.subjectCode;
            subjectNameField.value = subject.subjectName;
            subjectDescField.value = subject.description || '';
        } else {
            modalTitle.textContent = 'Create Subject';
            subjectIdField.value = '';
        }
        subjectModal.classList.add('active');
    };

    window.openToggleModal = (id, newStatus, name) => {
        toggleSubjectIdField.value = id;
        toggleSubjectStatusField.value = newStatus;
        toggleStatusMessage.textContent = `Are you sure you want to ${newStatus === 'ACTIVE' ? 'enable' : 'disable'} subject "${name}"?`;
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
            subjectCode: subjectCodeField.value,
            subjectName: subjectNameField.value,
            description: subjectDescField.value
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

    filterBtn.addEventListener('click', () => {
        currentPage = 1;
        loadSubjects();
    });

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
