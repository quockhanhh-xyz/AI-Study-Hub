document.addEventListener('DOMContentLoaded', () => {
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
        try {
            tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Loading...</td></tr>';
            
            const params = {
                page: currentPage - 1,
                size: pageSize
            };

            if (searchInput.value) params.search = searchInput.value;
            if (statusFilter.value) params.status = statusFilter.value;

            let response;
            try {
                response = await getAdminSubjects(params);
            } catch (error) {
                console.warn('Backend not ready or error:', error);
                // Mock fallback
                response = {
                    data: {
                        subjects: [
                            { subjectId: 1, subjectCode: 'SWP391', subjectName: 'Software Project', description: 'System subject for SWP', status: 'ACTIVE', createdAt: '2026-07-17T10:00:00Z', isSystem: true },
                            { subjectId: 2, subjectCode: 'PRJ301', subjectName: 'Java Web', description: 'System subject for PRJ', status: 'INACTIVE', createdAt: '2026-07-16T15:30:00Z', isSystem: true }
                        ],
                        totalElements: 2,
                        totalPages: 1
                    }
                };
            }

            const data = response.data;
            renderTable(data.subjects);
            renderPagination(data.totalPages);

        } catch (error) {
            console.error('Error loading subjects:', error);
            tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: red;">Failed to load data</td></tr>';
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
            const params = {};
            if (searchInput.value) params.search = searchInput.value;
            if (statusFilter.value) params.status = statusFilter.value;
            
            const blob = await exportAdminSubjects(params);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `System_Subjects_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (error) {
            alert('Failed to export data');
        }
    });

    // Initial Load
    loadSubjects();
});
