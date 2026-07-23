function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, ch => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "\"": "&quot;",
        "'": "&#039;"
    }[ch]));
}

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
            const subjectDatalist = document.getElementById('subjectDatalist');
            const response = await getAdminSubjects({ size: 1000 }); // From admin-subject-api.js

            if (response && response.success && response.data && response.data.subjects) {
                if (subjectDatalist) {
                    subjectDatalist.innerHTML = '';
                    response.data.subjects.forEach(sub => {
                        const option = document.createElement('option');
                        option.value = `${sub.subjectCode} - ${sub.subjectName}`;
                        option.dataset.id = sub.subjectId;
                        subjectDatalist.appendChild(option);
                    });
                    if (subjectFilter) subjectFilter.dispatchEvent(new Event('syncCustom'));
                }
            }
        } catch (error) {
            console.warn('Failed to load subjects for filter:', error);
        }
    };

    function getSelectedSubjectId() {
        const subjectFilter = document.getElementById('subjectFilter');
        const subjectDatalist = document.getElementById('subjectDatalist');
        if (!subjectFilter || !subjectDatalist) return '';

        const typedText = subjectFilter.value.trim();
        if (!typedText) return '';

        const options = subjectDatalist.options;
        for (let i = 0; i < options.length; i++) {
            if (options[i].value === typedText) {
                return options[i].dataset.id || '';
            }
        }
        return '';
    }

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
            const subjId = getSelectedSubjectId();
            if (subjId) params.subjectId = subjId;
            if (statusFilter.value) params.approvalStatus = statusFilter.value;
            if (fileTypeFilter.value) params.fileType = fileTypeFilter.value;

            const response = await getAdminPublicDocuments(params);

            if (response && response.success && response.data) {
                const data = response.data;
                const rows = data.items || data.content || data.documents || data.list || [];
                const totalItems = data.totalElements ?? data.totalItems ?? data.total ?? rows.length;
                const totalPagesCount = data.totalPages ?? Math.max(1, Math.ceil(totalItems / pageSize));

                totalElements = totalItems;

                renderTable(rows);
                renderPagination(totalPagesCount, totalItems);

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
        if (!status) return 'admin-badge-neutral';
        switch(status.toUpperCase()) {
            case 'PENDING': return 'admin-badge-warning';
            case 'APPROVED': return 'admin-badge-success';
            case 'REJECTED': return 'admin-badge-danger';
            default: return 'admin-badge-neutral';
        }
    };

    const getApprovalLabel = (status) => {
        if (!status) return 'Pending';
        if (status.toUpperCase() === 'PENDING') return 'Pending';
        if (status.toUpperCase() === 'APPROVED') return 'Approved';
        if (status.toUpperCase() === 'REJECTED') return 'Rejected';
        return status;
    };

    const getTypeBadgeClass = (fileType) => {
        if (!fileType) return 'file-icon-other';
        const t = fileType.toUpperCase();
        if (t === 'PDF') return 'file-icon-pdf';
        if (['DOC', 'DOCX'].includes(t)) return 'file-icon-word';
        if (['XLS', 'XLSX', 'CSV'].includes(t)) return 'file-icon-excel';
        if (['PPT', 'PPTX'].includes(t)) return 'file-icon-powerpoint';
        if (['PNG', 'JPG', 'JPEG', 'GIF'].includes(t)) return 'file-icon-image';
        return 'file-icon-other';
    };

    const getAIBadgeInfo = (status) => {
        if (!status) return { text: 'Pending', cls: 'admin-badge-danger' };
        switch(status.toUpperCase()) {
            case 'PENDING': return { text: 'Pending', cls: 'admin-badge-danger' };
            case 'PROCESSING': return { text: 'Processing', cls: 'admin-badge-warning' };
            case 'COMPLETED': return { text: 'Ready', cls: 'admin-badge-success' };
            case 'FAILED': return { text: 'Failed', cls: 'admin-badge-danger' };
            case 'UNSUPPORTED': return { text: 'Unsupported', cls: 'admin-badge-neutral' };
            case 'EMPTY_CONTENT': return { text: 'Empty', cls: 'admin-badge-warning' };
            default: return { text: status, cls: 'admin-badge-neutral' };
        }
    };

    const formatBytes = (bytes) => {
        if (!bytes || bytes === 0) return '';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return "N/A";
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    };

    const renderTable = (documents) => {
        if (!documents || documents.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 32px; color: var(--text-muted);">No documents found matching your filter criteria.</td></tr>';
            return;
        }

        tableBody.innerHTML = documents.map(doc => {
            const aiInfo = getAIBadgeInfo(doc.processingStatus);
            const ownerDisplay = doc.displayName || doc.ownerName || doc.ownerEmail || doc.fullName || doc.email || doc.uploaderName || 'Unknown owner';
            const subjectDisplay = doc.subjectCode ? `${doc.subjectCode}${doc.subjectName ? ` - ${doc.subjectName}` : ''}` : (doc.subject?.name || doc.subjectName || 'No subject');
            const updatedDisplay = formatDate(doc.updatedAt || doc.createdAt);
            const fileSizeDisplay = doc.fileSize ? formatBytes(doc.fileSize) : '';
            const subtext = [doc.fileType, fileSizeDisplay].filter(Boolean).join(' · ');

            return `
            <tr>
                <td>
                    <div style="font-weight: 600; color: var(--text-main, #0f172a); max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHtml(doc.title || '-')}">${escapeHtml(doc.title || '-')}</div>
                    ${subtext ? `<div style="font-size: 0.75rem; color: var(--text-muted, #64748b); margin-top: 2px;">${escapeHtml(subtext)}</div>` : ''}
                </td>
                <td><span class="table-muted-text" style="max-width: 140px; display: inline-block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHtml(ownerDisplay)}">${escapeHtml(ownerDisplay)}</span></td>
                <td><span class="table-muted-text" style="max-width: 130px; display: inline-block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(subjectDisplay)}</span></td>
                <td><span class="admin-badge ${getTypeBadgeClass(doc.fileType)}">${doc.fileType || '-'}</span></td>
                <td><span class="admin-badge ${getApprovalBadgeClass(doc.approvalStatus)}">${getApprovalLabel(doc.approvalStatus)}</span></td>
                <td><span class="admin-badge ${aiInfo.cls}">${aiInfo.text}</span></td>
                <td><span class="table-muted-text" style="font-size: 0.8rem; white-space: nowrap;">${updatedDisplay}</span></td>
                <td style="text-align: right;">
                    <div class="admin-action-group">
                        <button class="btn btn-sm btn-outline" onclick="window.location.href='admin-document-detail.html?id=${doc.documentId}'" style="border-radius: 20px; height: 30px; font-size: 13px; font-weight: 500;">View</button>
                        ${doc.approvalStatus === 'PENDING' ? `
                            <button class="btn btn-sm btn-primary" onclick="openApproveModal(${doc.documentId})" style="border-radius: 20px; height: 30px; font-size: 13px; font-weight: 500;">Approve</button>
                            <button class="btn btn-sm btn-outline-danger" onclick="openRejectModal(${doc.documentId})" style="border-radius: 20px; height: 30px; font-size: 13px; font-weight: 500;">Reject</button>
                        ` : doc.approvalStatus === 'APPROVED' ? `
                            <button class="btn btn-sm btn-outline" onclick="openPendingConfirmModal(${doc.documentId})" style="border-radius: 20px; height: 30px; font-size: 13px; font-weight: 500;">Move to Pending</button>
                            <button class="btn btn-sm btn-outline-danger" onclick="openUnpublishConfirmModal(${doc.documentId})" style="border-radius: 20px; height: 30px; font-size: 13px; font-weight: 500;">Unpublish</button>
                        ` : doc.approvalStatus === 'REJECTED' ? `
                            <button class="btn btn-sm btn-outline" onclick="openPendingConfirmModal(${doc.documentId})" style="border-radius: 20px; height: 30px; font-size: 13px; font-weight: 500;">Move to Pending</button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `}).join('');
    };

    const renderPagination = (totalPagesCount, totalItems) => {
        const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
        const endItem = Math.min(currentPage * pageSize, totalItems);

        let html = `<span class="admin-pagination-info">
            Showing ${startItem} - ${endItem} of ${totalItems} documents
        </span>
        <div style="display: flex; gap: 4px;">`;
        for (let i = 1; i <= totalPagesCount; i++) {
            html += `<button class="admin-pagination-btn ${i === currentPage ? 'active' : ''}" onclick="window.goToPage(${i})">${i}</button>`;
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
        [subjectFilter, statusFilter, fileTypeFilter].forEach(el => {
            if (el) el.dispatchEvent(new Event('syncCustom'));
        });
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
            const subjId = getSelectedSubjectId();
            if (subjId) params.subjectId = subjId;
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
