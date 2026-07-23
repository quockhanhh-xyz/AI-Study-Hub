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
                <td style="text-align: center; vertical-align: middle;">
                    <div class="admin-action-group">
                        <button class="btn btn-sm btn-outline" onclick="viewDocumentDetails(${doc.documentId})">View</button>
                        ${doc.approvalStatus === 'PENDING' ? `
                            <button class="btn btn-sm btn-primary" onclick="openApproveModal(${doc.documentId})">Approve</button>
                            <button class="btn btn-sm btn-outline-danger" onclick="openRejectModal(${doc.documentId})">Reject</button>
                        ` : doc.approvalStatus === 'APPROVED' ? `
                            <button class="btn btn-sm btn-outline" onclick="openPendingConfirmModal(${doc.documentId})">Reopen</button>
                            <button class="btn btn-sm btn-outline-danger" onclick="openUnpublishConfirmModal(${doc.documentId})">Unpublish</button>
                        ` : doc.approvalStatus === 'REJECTED' ? `
                            <button class="btn btn-sm btn-primary" onclick="openApproveModal(${doc.documentId})">Approve</button>
                            <button class="btn btn-sm btn-outline" onclick="openPendingConfirmModal(${doc.documentId})">Reopen</button>
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
            if (document.getElementById("documentDetailModal").classList.contains("active")) {
                viewDocumentDetails(id);
            }
            if (typeof window.showToast === "function") {
                window.showToast("Document approved successfully!", "success");
            }
        } catch (error) {
            if (typeof window.showToast === "function") {
                window.showToast('Failed to approve document: ' + error.message, 'error');
            } else {
                alert('Failed to approve document: ' + error.message);
            }
        }
    });

    document.getElementById('confirmRejectBtn').addEventListener('click', async () => {
        const id = rejectDocId.value;
        const reason = rejectReason.value;
        try {
            await rejectAdminDocument(id, reason);
            closeModal('rejectModal');
            loadDocuments();
            if (document.getElementById("documentDetailModal").classList.contains("active")) {
                viewDocumentDetails(id);
            }
            if (typeof window.showToast === "function") {
                window.showToast("Document rejected successfully.", "success");
            }
        } catch (error) {
            if (typeof window.showToast === "function") {
                window.showToast('Failed to reject document: ' + error.message, 'error');
            } else {
                alert('Failed to reject document: ' + error.message);
            }
        }
    });

    document.getElementById('confirmPendingBtn').addEventListener('click', async () => {
        const id = pendingDocId.value;
        try {
            await makeAdminDocumentPending(id);
            closeModal('pendingModal');
            loadDocuments();
            if (document.getElementById("documentDetailModal").classList.contains("active")) {
                viewDocumentDetails(id);
            }
            if (typeof window.showToast === "function") {
                window.showToast("Document moved back to review.", "success");
            }
        } catch (error) {
            if (typeof window.showToast === "function") {
                window.showToast('Failed to move document back to review: ' + error.message, 'error');
            } else {
                alert('Failed to move document back to review: ' + error.message);
            }
        }
    });

    document.getElementById('confirmUnpublishBtn').addEventListener('click', async () => {
        const id = unpublishDocId.value;
        try {
            await unpublishAdminDocument(id);
            closeModal('unpublishModal');
            loadDocuments();
            if (document.getElementById("documentDetailModal").classList.contains("active")) {
                viewDocumentDetails(id);
            }
            if (typeof window.showToast === "function") {
                window.showToast("Document unpublished successfully.", "success");
            }
        } catch (error) {
            if (typeof window.showToast === "function") {
                window.showToast('Failed to unpublish document: ' + error.message, 'error');
            } else {
                alert('Failed to unpublish document: ' + error.message);
            }
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

            if (pendingRes && pendingRes.success) {
                const count = pendingRes.data?.totalElements ?? pendingRes.data?.totalItems ?? pendingRes.data?.total ?? 0;
                const card = document.getElementById('cardPendingDocs');
                if (card) card.textContent = count;
            }
            if (approvedRes && approvedRes.success) {
                const count = approvedRes.data?.totalElements ?? approvedRes.data?.totalItems ?? approvedRes.data?.total ?? 0;
                const card = document.getElementById('cardApprovedDocs');
                if (card) card.textContent = count;
            }
            if (rejectedRes && rejectedRes.success) {
                const count = rejectedRes.data?.totalElements ?? rejectedRes.data?.totalItems ?? rejectedRes.data?.total ?? 0;
                const card = document.getElementById('cardRejectedDocs');
                if (card) card.textContent = count;
            }
            if (allRes && allRes.success) {
                const count = allRes.data?.totalElements ?? allRes.data?.totalItems ?? allRes.data?.total ?? 0;
                const card = document.getElementById('cardTotalDocs');
                if (card) card.textContent = count;
            }
        } catch (e) {
            console.warn("Could not fetch tab counts", e);
        }
    };

    let confirmCallback = null;

    window.showConfirmModal = function(title, bodyText, onConfirm) {
        document.getElementById("modalTitle").textContent = title;
        document.getElementById("modalBody").innerHTML = bodyText;
        confirmCallback = onConfirm;

        const confirmBtn = document.getElementById("modalConfirmBtn");
        confirmBtn.onclick = async () => {
            confirmBtn.disabled = true;
            const originalText = confirmBtn.textContent;
            confirmBtn.textContent = "Processing...";
            try {
                await confirmCallback();
                closeConfirmModal();
            } catch (e) {
                console.error("Action error:", e);
            } finally {
                confirmBtn.disabled = false;
                confirmBtn.textContent = originalText;
            }
        };

        document.getElementById("confirmModal").classList.add("active");
    };

    window.closeConfirmModal = function() {
        document.getElementById("confirmModal").classList.remove("active");
        confirmCallback = null;
    };

    exportBtn.addEventListener('click', () => {
        const params = {};
        if (searchInput.value) params.search = searchInput.value;
        const subjId = getSelectedSubjectId();
        if (subjId) params.subjectId = subjId;
        if (statusFilter.value) params.approvalStatus = statusFilter.value;
        if (fileTypeFilter.value) params.fileType = fileTypeFilter.value;

        const hasFilters = Object.keys(params).length > 0;
        const confirmMsg = hasFilters ? "Export filtered documents?" : "Export all public documents?";
        
        showConfirmModal("Confirm Excel Export", confirmMsg, async () => {
            try {
                exportBtn.disabled = true;
                exportBtn.innerHTML = 'Exporting...';
                await exportAdminPublicDocuments(params);
            } catch (error) {
                console.error('Failed to export data', error);
                if (typeof window.showToast === "function") {
                    window.showToast("Failed to export Excel: " + error.message, "error");
                }
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
    });

    window.viewDocumentDetails = async function(docId) {
        const modal = document.getElementById("documentDetailModal");
        const body = document.getElementById("documentDetailBody");
        const alertBox = document.getElementById("detailAlert");
        
        if (alertBox) {
            alertBox.style.display = "none";
            alertBox.textContent = "";
        }
        
        modal.classList.add("active");
        body.innerHTML = `
            <div style="display: flex; justify-content: center; align-items: center; padding: 40px 0;">
                <svg style="animation: spin 1s linear infinite; height: 32px; width: 32px; color: var(--primary);" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle style="opacity: 0.25;" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path style="opacity: 0.75;" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            </div>
        `;
        
        try {
            const response = await fetchAdmin(`/api/admin/documents/${docId}`, { method: 'GET' });
            if (response && response.success && response.data) {
                const doc = response.data;
                const ownerDisplay = doc.displayName || doc.ownerName || doc.ownerEmail || doc.fullName || doc.email || doc.uploaderName || 'Unknown owner';
                const subjectDisplay = doc.subjectCode ? `${doc.subjectCode}${doc.subjectName ? ` - ${doc.subjectName}` : ''}` : (doc.subject?.name || doc.subjectName || 'No subject');
                const dateDisplay = doc.createdAt ? new Date(doc.createdAt).toLocaleString() : 'N/A';
                
                body.innerHTML = `
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; font-size: 14px; background: var(--surface); padding: 16px; border-radius: 8px; border: 1px solid var(--border);">
                        <div><strong>ID:</strong> <span>#${doc.documentId}</span></div>
                        <div><strong>Title:</strong> <span>${escapeHtml(doc.title || '-')}</span></div>
                        <div><strong>Owner:</strong> <span>${escapeHtml(ownerDisplay)}</span></div>
                        <div><strong>Subject:</strong> <span>${escapeHtml(subjectDisplay)}</span></div>
                        <div><strong>File Type:</strong> <span class="admin-badge ${getTypeBadgeClass(doc.fileType)}">${doc.fileType || '-'}</span></div>
                        <div><strong>Visibility:</strong> <span class="admin-badge ${doc.visibility === 'PUBLIC' ? 'admin-badge-success' : 'admin-badge-neutral'}">${doc.visibility}</span></div>
                        <div><strong>Approval Status:</strong> <span class="admin-badge ${getApprovalBadgeClass(doc.approvalStatus)}">${getApprovalLabel(doc.approvalStatus)}</span></div>
                        <div><strong>Processing Status:</strong> <span class="admin-badge ${getAIBadgeInfo(doc.processingStatus).cls}">${getAIBadgeInfo(doc.processingStatus).text}</span></div>
                        <div style="grid-column: span 2;"><strong>Uploaded At:</strong> <span>${dateDisplay}</span></div>
                    </div>
                    
                    <div id="modalPreviewContainer" class="admin-card" style="display:none; height: 400px; padding: 0; margin-top: 15px; border: 1px solid var(--border);"></div>
                `;
                
                // Wire up download
                document.getElementById("modalDownloadBtn").onclick = () => {
                    downloadFile(`/api/admin/documents/${doc.documentId}/download`, doc.title || 'document');
                };

                // Populate moderation buttons on right actions
                const rightActions = document.getElementById("modalModerationActions");
                rightActions.innerHTML = ""; // Clear
                
                let modButtonsHtml = "";
                if (doc.approvalStatus === 'PENDING') {
                    modButtonsHtml = `
                        <button class="btn btn-primary" id="modalApproveBtn" style="width: auto !important; min-width: 100px; padding: 8px 16px; height: 38px; font-size: 14px; font-weight: 600; background-color: var(--success, #10b981) !important; border-color: var(--success, #10b981) !important; color: #ffffff !important;">Approve</button>
                        <button class="btn btn-danger" id="modalRejectBtn" style="width: auto !important; min-width: 90px; padding: 8px 16px; height: 38px; font-size: 14px; font-weight: 600; background-color: var(--danger, #ef4444) !important; border-color: var(--danger, #ef4444) !important; color: #ffffff !important;">Reject</button>
                    `;
                } else if (doc.approvalStatus === 'APPROVED') {
                    modButtonsHtml = `
                        <button class="btn" id="modalPendingBtn" style="width: auto !important; min-width: 100px; padding: 8px 16px; height: 38px; font-size: 14px; font-weight: 600; background-color: #f1f5f9 !important; border-color: #cbd5e1 !important; color: #334155 !important;">Reopen</button>
                        <button class="btn btn-danger" id="modalUnpublishBtn" style="width: auto !important; min-width: 110px; padding: 8px 16px; height: 38px; font-size: 14px; font-weight: 600; background-color: var(--danger, #ef4444) !important; border-color: var(--danger, #ef4444) !important; color: #ffffff !important;">Unpublish</button>
                    `;
                } else if (doc.approvalStatus === 'REJECTED') {
                    modButtonsHtml = `
                        <button class="btn btn-primary" id="modalApproveBtn" style="width: auto !important; min-width: 100px; padding: 8px 16px; height: 38px; font-size: 14px; font-weight: 600; background-color: var(--success, #10b981) !important; border-color: var(--success, #10b981) !important; color: #ffffff !important;">Approve</button>
                        <button class="btn" id="modalPendingBtn" style="width: auto !important; min-width: 100px; padding: 8px 16px; height: 38px; font-size: 14px; font-weight: 600; background-color: #f1f5f9 !important; border-color: #cbd5e1 !important; color: #334155 !important;">Reopen</button>
                    `;
                }
                
                rightActions.innerHTML = `
                    ${modButtonsHtml}
                    <button class="btn btn-outline" onclick="closeDocumentDetailModal()" style="width: auto !important; min-width: 90px; padding: 8px 16px; height: 38px; font-size: 14px; font-weight: 600;">Close</button>
                `;

                // Wire up moderation triggers
                const approveBtn = document.getElementById("modalApproveBtn");
                const rejectBtn = document.getElementById("modalRejectBtn");
                const pendingBtn = document.getElementById("modalPendingBtn");
                const unpublishBtn = document.getElementById("modalUnpublishBtn");
                
                if (approveBtn) {
                    approveBtn.onclick = () => {
                        openApproveModal(doc.documentId);
                    };
                }
                
                if (rejectBtn) {
                    rejectBtn.onclick = () => {
                        openRejectModal(doc.documentId);
                    };
                }
                
                if (pendingBtn) {
                    pendingBtn.onclick = () => {
                        openPendingConfirmModal(doc.documentId);
                    };
                }
                
                if (unpublishBtn) {
                    unpublishBtn.onclick = () => {
                        openUnpublishConfirmModal(doc.documentId);
                    };
                }

                // Wire up toggle preview logic
                const previewBtn = document.getElementById("modalPreviewBtn");
                const previewContainer = document.getElementById("modalPreviewContainer");
                
                previewContainer.style.display = 'none';
                previewBtn.textContent = "Preview Document";
                let previewLoaded = false;
                
                previewBtn.onclick = async () => {
                    if (previewContainer.style.display === 'block') {
                        previewContainer.style.display = 'none';
                        previewBtn.textContent = "Preview Document";
                    } else {
                        previewContainer.style.display = 'block';
                        previewBtn.textContent = "Hide Preview";
                        
                        if (!previewLoaded) {
                            previewContainer.innerHTML = `
                                <div style="display: flex; justify-content: center; align-items: center; height: 100%;">
                                    <svg style="animation: spin 1s linear infinite; height: 24px; width: 24px; color: var(--primary);" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle style="opacity: 0.25;" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                        <path style="opacity: 0.75;" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                </div>
                            `;
                            
                            try {
                                const res = await fetchAdmin(`/api/admin/documents/${doc.documentId}/preview`, { method: 'GET' });
                                if (res && res.success && res.data) {
                                    const previewInfo = res.data;
                                    const mode = previewInfo.previewMode || "FALLBACK";
                                    const previewUrl = previewInfo.previewUrl || previewInfo.fileUrl;
                                    
                                    if (mode === "FALLBACK" || !previewUrl) {
                                        previewContainer.innerHTML = `
                                          <div style="padding: 40px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%;">
                                            <h4 style="margin-bottom: 10px; margin-top: 0;">Preview Unavailable</h4>
                                            <p style="margin-bottom: 20px; color: #666; font-size: 0.9rem;">This file type cannot be previewed natively.</p>
                                            <a href="${previewInfo.fileUrl}" target="_blank" class="btn btn-outline" style="width: auto !important; padding: 6px 12px; font-size: 13px;">Open File</a>
                                          </div>
                                        `;
                                        previewLoaded = true;
                                        return;
                                    }
                                    
                                    if (mode === "OFFICE_VIEWER") {
                                        const viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(previewUrl)}`;
                                        previewContainer.innerHTML = `
                                          <div style="height: 100%; display: flex; flex-direction: column;">
                                            <div style="padding: 8px; background: #f8f9fa; border-bottom: 1px solid #ddd; text-align: center; font-size: 0.8rem; color: #555;">
                                              If the preview does not load, <a href="${previewInfo.fileUrl}" target="_blank">open</a> the file.
                                            </div>
                                            <iframe src="${viewerUrl}" style="flex: 1; border: none; width: 100%; height: 100%;"></iframe>
                                          </div>
                                        `;
                                    } else if (mode === "IMAGE") {
                                        previewContainer.innerHTML = `
                                          <div style="display: flex; justify-content: center; align-items: center; padding: 10px; background: #f0f0f0; height: 100%; overflow-y: auto;">
                                            <img src="${previewUrl}" alt="Preview" style="max-width: 100%; max-height: 100%; border: 1px solid #ddd; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" />
                                          </div>
                                        `;
                                    } else {
                                        previewContainer.innerHTML = `
                                          <iframe src="${previewUrl}" style="border: none; width: 100%; height: 100%;"></iframe>
                                        `;
                                    }
                                    previewLoaded = true;
                                } else {
                                    showDetailError("Failed to load preview info");
                                }
                            } catch (e) {
                                showDetailError("Error loading preview: " + e.message);
                            }
                        }
                    }
                };
                
            } else {
                throw new Error(response?.message || "Failed to load document");
            }
        } catch (e) {
            showDetailError(e.message || "An error occurred.");
        }
    };

    window.closeDocumentDetailModal = function() {
        document.getElementById("documentDetailModal").classList.remove("active");
    };

    function showDetailError(msg) {
        const alertBox = document.getElementById("detailAlert");
        if (alertBox) {
            alertBox.style.display = "block";
            alertBox.textContent = msg;
        }
    }

    // Initial Load
    loadDocuments();
}
