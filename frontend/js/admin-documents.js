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

    const updateClearFiltersVisibility = () => {
        const clearBtn = document.getElementById('clearFiltersBtn');
        if (!clearBtn) return;
        const hasFilter = Boolean(searchInput.value || (subjectFilter && subjectFilter.value) || statusFilter.value || fileTypeFilter.value);
        clearBtn.style.display = hasFilter ? 'inline-flex' : 'none';
    };

    const formatCompactDate = (dateStr) => {
        if (!dateStr) return "N/A";
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return "N/A";
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const month = months[d.getMonth()];
        const day = String(d.getDate()).padStart(2, "0");
        const year = d.getFullYear();
        const hours = String(d.getHours()).padStart(2, "0");
        const minutes = String(d.getMinutes()).padStart(2, "0");
        return `${month} ${day}, ${year} · ${hours}:${minutes}`;
    };

    const loadDocuments = async () => {
        const loadingState = document.getElementById("docsLoadingState");
        const errorState = document.getElementById("docsErrorState");
        const contentState = document.getElementById("docsContent");

        if (contentState.style.display === "none") {
            loadingState.style.display = "flex";
            errorState.style.display = "none";
        }

        updateClearFiltersVisibility();

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
                let items = [];
                let totalItems = 0;
                let totalPagesCount = 1;

                if (Array.isArray(data)) {
                    items = data;
                    totalItems = data.length;
                    totalPagesCount = Math.max(1, Math.ceil(totalItems / pageSize));
                } else if (data && typeof data === 'object') {
                    items = data.items || data.content || data.documents || (Array.isArray(data) ? data : []);
                    totalItems = typeof data.totalElements === 'number' ? data.totalElements : (typeof data.total === 'number' ? data.total : items.length);
                    totalPagesCount = typeof data.totalPages === 'number' ? data.totalPages : Math.max(1, Math.ceil(totalItems / pageSize));
                }

                totalElements = totalItems;

                renderTable(items);
                renderPagination(totalPagesCount, totalItems);

                loadingState.style.display = "none";
                errorState.style.display = "none";
                contentState.style.display = "block";
                
                // Fetch counts for tabs
                updateTabCounts();
            } else {
                throw new Error(response?.message || "Failed to load documents");
            }

        } catch (error) {
            console.error('Error loading documents:', error);
            loadingState.style.display = "none";
            contentState.style.display = "none";
            errorState.style.display = "flex";
            document.getElementById("docsErrorMessage").textContent = error.message || "An unexpected error occurred.";
        }
    };

    const getOwnerDisplayName = (doc) => {
        if (!doc) return 'Unknown owner';
        return doc.ownerName || doc.uploaderName || doc.userName || doc.ownerEmail || doc.uploaderEmail || doc.displayName || 'Unknown owner';
    };

    const getSubjectDisplayName = (doc) => {
        if (!doc) return 'No subject';
        if (doc.subjectName) {
            return doc.subjectCode ? `${doc.subjectCode} - ${doc.subjectName}` : doc.subjectName;
        }
        if (doc.subject && typeof doc.subject === 'object') {
            if (doc.subject.name) {
                return doc.subject.code ? `${doc.subject.code} - ${doc.subject.name}` : doc.subject.name;
            }
        }
        if (doc.subjectCode) return doc.subjectCode;
        return 'No subject';
    };

    const getApprovalBadgeClass = (status) => {
        if (!status) return 'admin-badge-neutral';
        switch(status.toUpperCase()) {
            case 'PENDING': return 'admin-badge-warning';
            case 'APPROVED': return 'admin-badge-success';
            case 'REJECTED': return 'admin-badge-danger';
            default: return 'admin-badge-neutral';
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
        if (!visibility) return 'admin-badge-neutral';
        return visibility.toUpperCase() === 'PUBLIC' ? 'admin-badge-public' : 'admin-badge-neutral';
    };

    const getFileTypeBadgeClass = (fileType) => {
        if (!fileType) return 'admin-badge-neutral';
        const type = fileType.toUpperCase();
        if (type === 'PDF') return 'admin-badge-pdf';
        if (type === 'DOCX' || type === 'DOC') return 'admin-badge-docx';
        if (type === 'TXT') return 'admin-badge-txt';
        return 'admin-badge-neutral';
    };

    const getAIBadgeInfo = (status) => {
        if (!status) return { text: 'Not processed', cls: 'admin-badge-neutral' };
        switch(status.toUpperCase()) {
            case 'PENDING': return { text: 'Not processed', cls: 'admin-badge-neutral' };
            case 'PROCESSING': return { text: 'Processing', cls: 'admin-badge-warning' };
            case 'COMPLETED': return { text: 'Ready for AI', cls: 'admin-badge-success' };
            case 'FAILED': return { text: 'Failed', cls: 'admin-badge-danger' };
            case 'UNSUPPORTED': return { text: 'Unsupported', cls: 'admin-badge-neutral' };
            case 'EMPTY_CONTENT': return { text: 'Empty content', cls: 'admin-badge-warning' };
            default: return { text: status, cls: 'admin-badge-neutral' };
        }
    };

    const renderTable = (documents) => {
        if (!documents || documents.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 32px; color: #64748B;">No documents found.</td></tr>';
            return;
        }

        tableBody.innerHTML = documents.map(doc => {
            const aiInfo = getAIBadgeInfo(doc.processingStatus);
            const formattedDate = formatCompactDate(doc.updatedAt || doc.createdAt);
            const ownerName = getOwnerDisplayName(doc);
            const subjectName = getSubjectDisplayName(doc);

            return `
            <tr>
                <td><div class="user-name-cell" style="font-weight: 600;" title="${escapeHtml(doc.title || '-')}">${escapeHtml(doc.title || '-')}</div></td>
                <td><div class="user-email-cell" title="${escapeHtml(ownerName)}">${escapeHtml(ownerName)}</div></td>
                <td><div class="user-email-cell" style="font-size: 13px; color: #475569;" title="${escapeHtml(subjectName)}">${escapeHtml(subjectName)}</div></td>
                <td><span class="admin-badge ${getFileTypeBadgeClass(doc.fileType)}">${doc.fileType ? doc.fileType.toUpperCase() : '-'}</span></td>
                <td><span class="admin-badge ${getVisibilityBadgeClass(doc.visibility)}">${doc.visibility ? doc.visibility.charAt(0).toUpperCase() + doc.visibility.slice(1).toLowerCase() : '-'}</span></td>
                <td><span class="admin-badge ${getApprovalBadgeClass(doc.approvalStatus)}">${getApprovalLabel(doc.approvalStatus)}</span></td>
                <td><span class="admin-badge ${aiInfo.cls}">${aiInfo.text}</span></td>
                <td><span style="color: #64748B; font-size: 13px; white-space: nowrap;">${formattedDate}</span></td>
                <td style="text-align: right; white-space: nowrap;">
                    <div class="admin-action-group" style="justify-content: flex-end;">
                        <button class="btn-action btn-action-ghost" onclick="window.location.href='admin-document-detail.html?id=${doc.documentId}'">View</button>
                        ${doc.approvalStatus === 'PENDING' ? `
                            <button class="btn-action btn-action-primary" onclick="openApproveModal(${doc.documentId})">Approve</button>
                            <button class="btn-action btn-action-danger-outline" onclick="openRejectModal(${doc.documentId})">Reject</button>
                        ` : doc.approvalStatus === 'APPROVED' ? `
                            <button class="btn-action btn-action-warning-outline" onclick="openPendingConfirmModal(${doc.documentId})">Pending</button>
                            <button class="btn-action btn-action-danger-outline" onclick="openUnpublishConfirmModal(${doc.documentId})">Unpublish</button>
                        ` : doc.approvalStatus === 'REJECTED' ? `
                            <button class="btn-action btn-action-warning-outline" onclick="openPendingConfirmModal(${doc.documentId})">Pending</button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `}).join('');
    };

    const renderPagination = (totalPagesCount, totalItemsCount) => {
        const safeTotal = typeof totalItemsCount === 'number' && !isNaN(totalItemsCount) ? totalItemsCount : 0;
        const safePages = typeof totalPagesCount === 'number' && !isNaN(totalPagesCount) && totalPagesCount > 0 ? totalPagesCount : 1;

        const startItem = safeTotal === 0 ? 0 : (currentPage - 1) * pageSize + 1;
        const endItem = Math.min(currentPage * pageSize, safeTotal);

        let html = `<div style="font-size: 0.875rem; color: #64748B;">
            Showing ${startItem}-${endItem} of ${safeTotal} documents
        </div>
        <div style="display: flex; gap: 4px;">`;

        if (safePages > 1) {
            for (let i = 1; i <= safePages; i++) {
                html += `<button class="admin-pagination-btn ${i === currentPage ? 'active' : ''}" onclick="window.goToPage(${i})">${i}</button>`;
            }
        }
        html += `</div>`;
        pagination.innerHTML = html;
    };
    
    window.goToPage = (page) => {
        currentPage = page;
        loadDocuments();
    };

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

    // Modal helpers (global so inline onclick works)
    window.openApproveModal = (id) => {
        approveDocId.value = id;
        approveModal.classList.add('active');
    };

    window.openRejectModal = (id) => {
        rejectDocId.value = id;
        rejectReason.value = '';
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
        const reason = rejectReason.value;
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
    const tabs = document.querySelectorAll('.admin-tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
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
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="18" width="18" stroke="currentColor" stroke-width="2" style="margin-right: 6px;">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Export Excel
            `;
        }
    });

    // Initial Load
    loadDocuments();
}
