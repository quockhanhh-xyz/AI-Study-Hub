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
            const response = await getAdminSubjects({ size: 1000 }); // From admin-subject-api.js

            if (response && response.success && response.data && response.data.subjects) {
                // Keep the "All Subjects" option
                subjectFilter.innerHTML = '<option value="">All Subjects</option>';
                response.data.subjects.forEach(sub => {
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
                renderPagination(data.totalPages, data.totalElements);

                loadingState.style.display = "none";
                contentState.style.display = "block";
                
                // Fetch counts for tabs
                updateTabCounts();
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

    const getApprovalBadgeClass = (status) => {
        if (!status) return 'badge-secondary';
        switch(status.toUpperCase()) {
            case 'PENDING': return 'badge-warning';
            case 'APPROVED': return 'badge-success';
            case 'REJECTED': return 'badge-danger';
            default: return 'badge-secondary';
        }
    };
    
    const getApprovalLabel = (status) => {
        if (!status) return 'Pending Review';
        if (status.toUpperCase() === 'PENDING') return 'Pending Review';
        if (status.toUpperCase() === 'APPROVED') return 'Approved';
        if (status.toUpperCase() === 'REJECTED') return 'Rejected';
        return status;
    };

    const getVisibilityBadgeClass = (visibility) => {
        if (!visibility) return 'badge-secondary';
        return visibility.toUpperCase() === 'PUBLIC' ? 'badge-primary' : 'badge-secondary';
    };

    const getAIBadgeInfo = (status) => {
        if (!status) return { text: 'Not processed', cls: 'badge-secondary' };
        switch(status.toUpperCase()) {
            case 'PENDING': return { text: 'Not processed', cls: 'badge-secondary' };
            case 'PROCESSING': return { text: 'Processing', cls: 'badge-warning' };
            case 'COMPLETED': return { text: 'Ready for AI', cls: 'badge-success' };
            case 'FAILED': return { text: 'Failed', cls: 'badge-danger' };
            case 'UNSUPPORTED': return { text: 'Unsupported', cls: 'badge-secondary' };
            case 'EMPTY_CONTENT': return { text: 'Empty content', cls: 'badge-warning' };
            default: return { text: status, cls: 'badge-secondary' };
        }
    };

    const renderTable = (documents) => {
        if (!documents || documents.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="8" style="text-align: center;">No documents found.</td></tr>';
            return;
        }

        tableBody.innerHTML = documents.map(doc => {
            const aiInfo = getAIBadgeInfo(doc.processingStatus);
            return `
            <tr>
                <td>${doc.title || '-'}</td>
                <td style="color: ${doc.displayName ? 'inherit' : 'var(--text-muted)'}">${doc.displayName || 'Unknown owner'}</td>
                <td style="color: ${doc.subjectCode ? 'inherit' : 'var(--text-muted)'}">${doc.subjectCode ? `${doc.subjectCode} - ${doc.subjectName}` : 'No subject'}</td>
                <td>${doc.fileType || '-'}</td>
                <td><span class="badge ${getVisibilityBadgeClass(doc.visibility)}">${doc.visibility ? doc.visibility.charAt(0).toUpperCase() + doc.visibility.slice(1).toLowerCase() : '-'}</span></td>
                <td><span class="badge ${getApprovalBadgeClass(doc.approvalStatus)}">${getApprovalLabel(doc.approvalStatus)}</span></td>
                <td><span class="badge ${aiInfo.cls}">${aiInfo.text}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline" onclick="window.location.href='admin-document-detail.html?id=${doc.documentId}'">View</button>
                    ${doc.approvalStatus === 'PENDING' ? `
                        <button class="btn btn-sm btn-primary" onclick="openApproveModal(${doc.documentId})">Approve</button>
                        <button class="btn btn-sm btn-danger" onclick="openRejectModal(${doc.documentId})">Reject</button>
                    ` : doc.approvalStatus === 'APPROVED' ? `
                        <button class="btn btn-sm btn-warning" onclick="openPendingConfirmModal(${doc.documentId})">Move to Pending</button>
                        <button class="btn btn-sm btn-secondary" onclick="openUnpublishConfirmModal(${doc.documentId})">Unpublish</button>
                    ` : doc.approvalStatus === 'REJECTED' ? `
                        <button class="btn btn-sm btn-warning" onclick="openPendingConfirmModal(${doc.documentId})">Move to Pending</button>
                    ` : ''}
                </td>
            </tr>
        `}).join('');
    };

    const renderPagination = (totalPages, totalItems) => {
        let html = `<div style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: 8px;">
            Showing ${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, totalItems)} of ${totalItems} documents
        </div>
        <div style="display: flex; gap: 4px;">`;
        for (let i = 1; i <= totalPages; i++) {
            html += `<button class="${i === currentPage ? 'active' : ''}" onclick="window.goToPage(${i})">${i}</button>`;
        }
        html += `</div>`;
        pagination.innerHTML = html;
    };
    
    window.goToPage = (page) => {
        currentPage = page;
        loadDocuments();
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

    let currentSearchTimeout = null;
    searchInput.addEventListener('input', () => {
        if (currentSearchTimeout) clearTimeout(currentSearchTimeout);
        currentSearchTimeout = setTimeout(() => {
            currentPage = 1;
            loadDocuments();
        }, 500);
    });

    [subjectFilter, statusFilter, fileTypeFilter].forEach(el => {
        if (el) {
            el.addEventListener('change', () => {
                currentPage = 1;
                loadDocuments();
            });
        }
    });

    window.clearFilters = () => {
        searchInput.value = '';
        if (subjectFilter) subjectFilter.value = '';
        statusFilter.value = '';
        fileTypeFilter.value = '';
        currentPage = 1;
        loadDocuments();
    };

    // Quick Tabs Logic
    const tabs = document.querySelectorAll('.admin-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => {
                t.classList.remove('active');
                t.style.borderBottomColor = 'transparent';
                t.style.color = 'var(--text-muted)';
            });
            tab.classList.add('active');
            tab.style.borderBottomColor = 'var(--primary)';
            tab.style.color = 'var(--primary)';
            
            const status = tab.dataset.tab;
            statusFilter.value = status === 'ALL' ? '' : status;
            currentPage = 1;
            loadDocuments();
        });
    });

    window.updateTabCounts = async () => {
        try {
            const reqs = [
                getAdminPublicDocuments({ page: 0, size: 1, approvalStatus: 'PENDING' }),
                getAdminPublicDocuments({ page: 0, size: 1, approvalStatus: 'APPROVED' }),
                getAdminPublicDocuments({ page: 0, size: 1, approvalStatus: 'REJECTED' }),
                getAdminPublicDocuments({ page: 0, size: 1 })
            ];
            const [pendingRes, approvedRes, rejectedRes, allRes] = await Promise.all(reqs);
            
            if (pendingRes && pendingRes.success) document.getElementById('tabCountPending').textContent = pendingRes.data.totalElements;
            if (approvedRes && approvedRes.success) document.getElementById('tabCountApproved').textContent = approvedRes.data.totalElements;
            if (rejectedRes && rejectedRes.success) document.getElementById('tabCountRejected').textContent = rejectedRes.data.totalElements;
            if (allRes && allRes.success) document.getElementById('tabCountAll').textContent = allRes.data.totalElements;
        } catch (e) {
            console.warn("Could not fetch tab counts", e);
        }
    };

    exportBtn.addEventListener('click', async () => {
        try {
            const params = {};
            if (searchInput.value) params.search = searchInput.value;
            if (subjectFilter && subjectFilter.value) params.subjectId = subjectFilter.value;
            if (statusFilter.value) params.approvalStatus = statusFilter.value;
            if (fileTypeFilter.value) params.fileType = fileTypeFilter.value;
            
            const hasFilters = Object.keys(params).length > 0;
            const confirmMsg = hasFilters ? "Export filtered documents?" : "Export all public documents?";
            if (!confirm(confirmMsg)) return;

            exportBtn.disabled = true;
            exportBtn.innerHTML = 'Exporting...';

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
