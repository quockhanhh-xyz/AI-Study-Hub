document.addEventListener('DOMContentLoaded', () => {
    // State
    let currentPage = 1;
    const pageSize = 10;
    let totalElements = 0;

    // Elements
    const tableBody = document.getElementById('documentsTableBody');
    const pagination = document.getElementById('pagination');
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');
    const fileTypeFilter = document.getElementById('fileTypeFilter');
    const filterBtn = document.getElementById('filterBtn');
    const exportBtn = document.getElementById('exportBtn');

    // Modals
    const approveModal = document.getElementById('approveModal');
    const rejectModal = document.getElementById('rejectModal');
    const approveDocId = document.getElementById('approveDocId');
    const rejectDocId = document.getElementById('rejectDocId');
    const rejectReason = document.getElementById('rejectReason');

    // Load Data
    const loadDocuments = async () => {
        try {
            tableBody.innerHTML = '<tr><td colspan="8" style="text-align: center;">Loading...</td></tr>';
            
            const params = {
                page: currentPage,
                size: pageSize
            };

            if (searchInput.value) params.search = searchInput.value;
            if (statusFilter.value) params.approvalStatus = statusFilter.value;
            if (fileTypeFilter.value) params.fileType = fileTypeFilter.value;

            // Wait for backend or mock response
            let response;
            try {
                response = await getAdminPublicDocuments(params);
            } catch (error) {
                // Mock fallback for UI dev if backend not ready
                console.warn('Backend not ready or error:', error);
                response = {
                    data: {
                        content: [
                            { id: 1, title: 'Math 101', ownerEmail: 'user1@test.com', subjectName: 'Math', fileType: 'PDF', visibility: 'PUBLIC', approvalStatus: 'PENDING', processingStatus: 'COMPLETED' },
                            { id: 2, title: 'History Notes', ownerEmail: 'user2@test.com', subjectName: 'History', fileType: 'DOCX', visibility: 'PUBLIC', approvalStatus: 'APPROVED', processingStatus: 'COMPLETED' }
                        ],
                        totalElements: 2,
                        totalPages: 1
                    }
                };
            }

            const data = response.data;
            totalElements = data.totalElements;
            
            renderTable(data.content);
            renderPagination(data.totalPages);

        } catch (error) {
            console.error('Error loading documents:', error);
            tableBody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: red;">Failed to load documents</td></tr>';
        }
    };

    const renderTable = (documents) => {
        if (!documents || documents.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="8" style="text-align: center;">No documents found.</td></tr>';
            return;
        }

        tableBody.innerHTML = documents.map(doc => `
            <tr>
                <td>${doc.title || '-'}</td>
                <td>${doc.ownerEmail || doc.owner || '-'}</td>
                <td>${doc.subjectName || doc.subject || '-'}</td>
                <td>${doc.fileType || '-'}</td>
                <td><span class="badge active">${doc.visibility}</span></td>
                <td><span class="badge ${doc.approvalStatus.toLowerCase()}">${doc.approvalStatus}</span></td>
                <td>${doc.processingStatus}</td>
                <td>
                    ${doc.approvalStatus === 'PENDING' ? `
                        <button class="btn btn-sm btn-primary" onclick="openApproveModal(${doc.id})">Approve</button>
                        <button class="btn btn-sm btn-danger" onclick="openRejectModal(${doc.id})">Reject</button>
                    ` : '-'}
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
                loadDocuments();
            };
            pagination.appendChild(btn);
        }
    };

    // Modal helpers (global so inline onclick works)
    window.openApproveModal = (id) => {
        approveDocId.value = id;
        approveModal.classList.add('active');
    };

    window.openRejectModal = (id) => {
        rejectDocId.value = id;
        rejectReason.value = ''; // clear previous reason
        rejectModal.classList.add('active');
    };

    window.closeModal = (modalId) => {
        document.getElementById(modalId).classList.remove('active');
    };

    // Actions
    document.getElementById('confirmApproveBtn').addEventListener('click', async () => {
        const id = approveDocId.value;
        try {
            await approveAdminDocument(id);
            closeModal('approveModal');
            loadDocuments();
        } catch (error) {
            alert('Failed to approve document: ' + error.message);
        }
    });

    document.getElementById('confirmRejectBtn').addEventListener('click', async () => {
        const id = rejectDocId.value;
        const reason = rejectReason.value; // Step 15A: Optional reason
        try {
            await rejectAdminDocument(id);
            closeModal('rejectModal');
            loadDocuments();
        } catch (error) {
            alert('Failed to reject document: ' + error.message);
        }
    });

    filterBtn.addEventListener('click', () => {
        currentPage = 1;
        loadDocuments();
    });

    exportBtn.addEventListener('click', async () => {
        try {
            const params = {};
            if (searchInput.value) params.search = searchInput.value;
            if (statusFilter.value) params.approvalStatus = statusFilter.value;
            if (fileTypeFilter.value) params.fileType = fileTypeFilter.value;
            
            const blob = await exportAdminPublicDocuments(params);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Public_Documents_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (error) {
            alert('Failed to export data');
        }
    });

    // Initial Load
    loadDocuments();
});
