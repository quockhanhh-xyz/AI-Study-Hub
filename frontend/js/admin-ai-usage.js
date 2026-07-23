document.addEventListener('DOMContentLoaded', () => {
    // Wait for the auth layout system to finish verifying the user
    if (window.authReady) {
        window.authReady.then((isAuthenticated) => {
            if (isAuthenticated) {
                initAdminAiUsage();
            }
        });
    } else {
        initAdminAiUsage();
    }
});

function initAdminAiUsage() {
    let currentPage = 1;
    let pageSize = 10;

    // Elements
    const tableBody = document.getElementById('usageTableBody');
    const paginationControls = document.getElementById('paginationControls');
    const pageInfo = document.getElementById('pageInfo');
    const pageSizeSelect = document.getElementById('pageSize');
    const searchInput = document.getElementById('searchInput');
    const tierFilter = document.getElementById('tierFilter');
    const featureFilter = document.getElementById('featureFilter');
    const statusFilter = document.getElementById('statusFilter');
    const startDateFilter = document.getElementById('startDateFilter');
    const endDateFilter = document.getElementById('endDateFilter');
    const exportBtn = document.getElementById('exportBtn');
    const exportBtnText = document.getElementById('exportBtnText');
    const dynamicSubtitle = document.getElementById('dynamicSubtitle');
    const emptyState = document.getElementById('emptyState');
    const usageTable = document.querySelector('.admin-table');

    const loadUsage = async () => {
        const loadingState = document.getElementById("usageLoadingState");
        const errorState = document.getElementById("usageErrorState");
        const contentState = document.getElementById("usageContent");

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
            if (tierFilter.value) params.tier = tierFilter.value;
            if (featureFilter.value) params.feature = featureFilter.value;
            if (statusFilter.value) params.status = statusFilter.value;
            if (startDateFilter.value) params.startDate = `${startDateFilter.value}T00:00:00`;
            if (endDateFilter.value) params.endDate = `${endDateFilter.value}T23:59:59`;

            updateSubtitle();
            updateExportBtn();

            const response = await getAdminAiUsage(params);

            if (response && response.success && response.data) {
                const data = response.data;
                renderTable(data.usages);
                renderPagination(data.totalPages, data.totalElements);
                renderSummary(data.summary);

                loadingState.style.display = "none";
                contentState.style.display = "block";
            } else {
                throw new Error(response?.message || "Failed to load AI usage data");
            }

        } catch (error) {
            console.error('Error loading AI usage:', error);
            loadingState.style.display = "none";
            errorState.style.display = "flex";
            document.getElementById("usageErrorMessage").textContent = error.message || "An unexpected error occurred.";
        }
    };

    const renderTable = (items) => {
        if (!items || items.length === 0) {
            usageTable.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        usageTable.style.display = 'table';
        emptyState.style.display = 'none';

        tableBody.innerHTML = items.map(item => {
            // Determine tier badge color
            let tierClass = 'badge-neutral';
            if (item.tier === 'PREMIUM') tierClass = 'badge-warning';
            else if (item.tier === 'ULTRA') tierClass = 'badge-primary';

            return `
            <tr>
                <td>${item.userEmail || item.user || '-'}</td>
                <td><span class="badge ${tierClass}">${item.tier || '-'}</span></td>
                <td>${item.aiQaUsed || item.AI_QA || 0}</td>
                <td>${item.summaryUsed || item.AI_SUMMARY || 0}</td>
                <td>${item.flashcardUsed || item.AI_FLASHCARD || 0}</td>
                <td>${item.quizUsed || item.AI_QUIZ || 0}</td>
                <td><strong>${item.totalAiRequests || item.total || 0}</strong></td>
                <td>${formatDateTime(item.lastUsedAt)}</td>
            </tr>
        `}).join('');
    };

    const renderSummary = (summary) => {
        if (!summary) return;
        document.getElementById('kpiTotal').textContent = summary.totalRequests || 0;
        document.getElementById('kpiSuccess').textContent = summary.successCount || 0;
        document.getElementById('kpiFailed').textContent = summary.failedCount || 0;
        document.getElementById('kpiQuota').textContent = summary.quotaBlockedCount || 0;
        document.getElementById('kpiUsers').textContent = summary.activeUsers || 0;
    };

    const formatDateTime = (dateStr) => {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) + ' &middot; ' +
            date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    };

    const updateSubtitle = () => {
        let text = [];
        if (featureFilter.value) {
            text.push(`Users who used: ${featureFilter.options[featureFilter.selectedIndex].text}`);
        }

        let dateText = "Showing all-time AI usage logs.";
        if (startDateFilter.value && endDateFilter.value) {
            const start = new Date(startDateFilter.value).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
            const end = new Date(endDateFilter.value).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
            dateText = `Showing usage from ${start} to ${end}.`;
        } else if (startDateFilter.value) {
            const start = new Date(startDateFilter.value).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
            dateText = `Showing usage since ${start}.`;
        } else if (endDateFilter.value) {
            const end = new Date(endDateFilter.value).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
            dateText = `Showing usage until ${end}.`;
        }

        if (text.length > 0) {
            dynamicSubtitle.innerHTML = `<strong>${text.join(', ')}</strong>. Other feature counts still reflect the selected date range.<br>${dateText}`;
        } else {
            dynamicSubtitle.textContent = dateText;
        }
    };

    const updateExportBtn = () => {
        const hasFilters = searchInput.value || tierFilter.value || featureFilter.value || statusFilter.value || startDateFilter.value || endDateFilter.value;
        exportBtnText.textContent = hasFilters ? "Export filtered AI usage" : "Export all AI usage logs";
    };

    const renderPagination = (totalPages, totalElements) => {
        const startItem = totalElements === 0 ? 0 : (currentPage - 1) * pageSize + 1;
        const endItem = Math.min(currentPage * pageSize, totalElements);
        pageInfo.textContent = `Showing ${startItem}-${endItem} of ${totalElements} users`;

        paginationControls.innerHTML = '';
        if (totalPages <= 1) return;

        let html = '';
        for (let i = 1; i <= totalPages; i++) {
            html += `<button class="admin-pagination-btn ${i === currentPage ? 'active' : ''}" onclick="window.goToPage(${i})">${i}</button>`;
        }
        paginationControls.innerHTML = html;
    };

    window.goToPage = (page) => {
        currentPage = page;
        loadUsage();
    };

    let currentSearchTimeout = null;
    searchInput.addEventListener('input', () => {
        if (currentSearchTimeout) clearTimeout(currentSearchTimeout);
        currentSearchTimeout = setTimeout(() => {
            currentPage = 1;
            loadUsage();
        }, 500);
    });

    pageSizeSelect.addEventListener('change', () => {
        pageSize = parseInt(pageSizeSelect.value, 10);
        currentPage = 1;
        loadUsage();
    });

    [tierFilter, featureFilter, statusFilter, startDateFilter, endDateFilter].forEach(el => {
        if (el) {
            el.addEventListener('change', () => {
                currentPage = 1;
                loadUsage();
            });
        }
    });

    window.clearFilters = () => {
        searchInput.value = '';
        tierFilter.value = '';
        featureFilter.value = '';
        statusFilter.value = '';
        startDateFilter.value = '';
        endDateFilter.value = '';
        [tierFilter, featureFilter, statusFilter].forEach(el => {
            if (el) el.dispatchEvent(new Event("syncCustom"));
        });
        currentPage = 1;
        loadUsage();
    };

    exportBtn.addEventListener('click', async () => {
        try {
            exportBtn.disabled = true;
            exportBtn.innerHTML = 'Exporting...';
            const params = {};
            if (searchInput.value) params.search = searchInput.value;
            if (tierFilter.value) params.tier = tierFilter.value;
            if (featureFilter.value) params.feature = featureFilter.value;
            if (statusFilter.value) params.status = statusFilter.value;
            if (startDateFilter.value) params.startDate = `${startDateFilter.value}T00:00:00`;
            if (endDateFilter.value) params.endDate = `${endDateFilter.value}T23:59:59`;

            await exportAdminAiUsage(params);
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
    loadUsage();
}
