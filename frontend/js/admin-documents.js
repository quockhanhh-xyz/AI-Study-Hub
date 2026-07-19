document.addEventListener('DOMContentLoaded', () => {
    // Wait for the auth layout system to finish verifying the user
    if (window.authReady) {
        window.authReady.then((isAuthenticated) => {
            if (isAuthenticated) {
                initAdminDocuments();
            }
        });
    } else {
        initAdminDocuments();
    }
});

function initAdminDocuments() {
    // Populate Subject Dropdown
    const populateSubjectDropdown = async () => {
        try {
            const subjectFilter = document.getElementById('subjectFilter');
            const response = await getSubjects(); // From subject-api.js

            if (response && response.success && response.data) {
                // Keep the "All Subjects" option
                subjectFilter.innerHTML = '<option value="">All Subjects</option>';
                response.data.forEach(sub => {
                    const option = document.createElement('option');
                    option.value = sub.subjectId;
                    option.textContent = `${sub.subjectCode} - ${sub.subjectName}`;
                    subjectFilter.appendChild(option);
                });
            }
        } catch (error) {
            console.warn('Failed to load subjects for filter:', error);
        }
    };

    // Call it immediately
    populateSubjectDropdown();
    // State
    let currentPage = 1;
    const pageSize = 10;
    let totalElements = 0;

    // Elements
    const tableBody = document.getElementById('documentsTableBody');
    const pagination = document.getElementById('pagination');
    const searchInput = document.getElementById('searchInput');
    const subjectFilter = document.getElementById('subjectFilter');
    const statusFilter = document.getElementById('statusFilter');
    const fileTypeFilter = document.getElementById('fileTypeFilter');
    const filterBtn = document.getElementById('filterBtn');
    const exportBtn = document.getElementById('exportBtn');

    // Modals
    const approveModal = document.getElementById('approveModal');
    const rejectModal = document.getElementById('rejectModal');
    const pendingModal = document.getElementById('pendingModal');
    const unpublishModal = document.getElementById('unpublishModal');

    const approveDocId = document.getElementById('approveDocId');
    const rejectDocId = document.getElementById('rejectDocId');
    const pendingDocId = document.getElementById('pendingDocId');
    const unpublishDocId = document.getElementById('unpublishDocId');

    const rejectReason = document.getElementById('rejectReason');

    const loadDocuments = async () => {
        const loadingState = document.getElementById("docsLoadingState");
        const errorState = document.getElementById("docsErrorState");
        const contentState = document.getElementById("docsContent");

        loadingState.style.display = "flex";
        errorState.style.display = "none";
        contentState.style.display = "none";

        try {
            const params = {
                page: currentPage - 1,
                size: pageSize
            };

            if (searchInput.value) params.search = searchInput.value;
            if (subjectFilter && subjectFilter.value) params.subjectId = subjectFilter.value;
            if (statusFilter.value) params.approvalStatus = statusFilter.value;
            if (fileTypeFilter.value) params.fileType = fileTypeFilter.value;

            const response = await getAdminPublicDocuments(params);

            if (response && response.success && response.data) {
                const data = response.data;
                totalElements = data.totalElements;

                renderTable(data.items);
                renderPagination(data.totalPages);

                loadingState.style.display = "none";
                contentState.style.display = "block";
            } else {
                throw new Error(response?.message || "Failed to load documents");
            }

        } catch (error) {
            console.error('Error loading documents:', error);
            loadingState.style.display = "none";
            errorState.style.display = "flex";
            document.getElementById("docsErrorMessage").textContent = error.message || "An unexpected error occurred.";
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
                <td>${doc.subject || '-'}</td>
                <td>${doc.fileType || '-'}</td>
                <td><span class="badge active">${doc.visibility}</span></td>
                <td><span class="badge ${doc.approvalStatus.toLowerCase()}">${doc.approvalStatus}</span></td>
                <td>${doc.processingStatus}</td>
                <td>
                    <button class="btn btn-sm btn-outline" onclick="window.location.href='admin-document-detail.html?id=${doc.documentId}'">View</button>
                    ${doc.approvalStatus === 'PENDING' ? `
                        <button class="btn btn-sm btn-primary" onclick="openApproveModal(${doc.documentId})">Approve</button>
                        <button class="btn btn-sm btn-danger" onclick="openRejectModal(${doc.documentId})">Reject</button>
                    ` : doc.approvalStatus === 'APPROVED' ? `
                        <button class="btn btn-sm btn-warning" onclick="openPendingConfirmModal(${doc.documentId})">Re-review</button>
                        <button class="btn btn-sm btn-danger" onclick="openRejectModal(${doc.documentId})">Reject</button>
                        <button class="btn btn-sm btn-secondary" onclick="openUnpublishConfirmModal(${doc.documentId})">Unpublish</button>
                    ` : doc.approvalStatus === 'REJECTED' ? `
                        <button class="btn btn-sm btn-warning" onclick="openPendingConfirmModal(${doc.documentId})">Re-review</button>
                        <button class="btn btn-sm btn-primary" onclick="openApproveModal(${doc.documentId})">Approve</button>
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

    window.openPendingConfirmModal = (id) => {
        pendingDocId.value = id;
        pendingModal.classList.add('active');
    };

    window.openUnpublishConfirmModal = (id) => {
        unpublishDocId.value = id;
        unpublishModal.classList.add('active');
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
            await rejectAdminDocument(id, reason);
            closeModal('rejectModal');
            loadDocuments();
        } catch (error) {
            alert('Failed to reject document: ' + error.message);
        }
    });

    document.getElementById('confirmPendingBtn').addEventListener('click', async () => {
        const id = pendingDocId.value;
        try {
            await makeAdminDocumentPending(id);
            closeModal('pendingModal');
            loadDocuments();
        } catch (error) {
            alert('Failed to move document back to review: ' + error.message);
        }
    });

    document.getElementById('confirmUnpublishBtn').addEventListener('click', async () => {
        const id = unpublishDocId.value;
        try {
            await unpublishAdminDocument(id);
            closeModal('unpublishModal');
            loadDocuments();
        } catch (error) {
            alert('Failed to unpublish document: ' + error.message);
        }
    });

    filterBtn.addEventListener('click', () => {
        currentPage = 1;
        loadDocuments();
    });

    exportBtn.addEventListener('click', async () => {
        try {
            exportBtn.disabled = true;
            exportBtn.innerHTML = 'Exporting...';
            const params = {};
            if (searchInput.value) params.search = searchInput.value;
            if (subjectFilter.value) params.subjectId = subjectFilter.value;
            if (statusFilter.value) params.approvalStatus = statusFilter.value;
            if (fileTypeFilter.value) params.fileType = fileTypeFilter.value;

            await exportAdminPublicDocuments(params);
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
    loadDocuments();
}
