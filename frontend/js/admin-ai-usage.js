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
    // State
    let currentPage = 1;
    const pageSize = 10;

    // Elements
    const tableBody = document.getElementById('usageTableBody');
    const pagination = document.getElementById('pagination');
    const searchInput = document.getElementById('searchInput');
    const tierFilter = document.getElementById('tierFilter');
    const featureFilter = document.getElementById('featureFilter');
    const startDateFilter = document.getElementById('startDateFilter');
    const endDateFilter = document.getElementById('endDateFilter');
    const exportBtn = document.getElementById('exportBtn');

    const loadUsage = async () => {
        const loadingState = document.getElementById("usageLoadingState");
        const errorState = document.getElementById("usageErrorState");
        const contentState = document.getElementById("usageContent");

        loadingState.style.display = "flex";
        errorState.style.display = "none";
        contentState.style.display = "none";

        try {
            const params = {
                page: currentPage - 1,
                size: pageSize
            };

            if (searchInput.value) params.search = searchInput.value;
            if (tierFilter.value) params.tier = tierFilter.value;
            if (featureFilter && featureFilter.value) params.feature = featureFilter.value;
            if (startDateFilter.value) params.startDate = `${startDateFilter.value}T00:00:00`;
            if (endDateFilter.value) params.endDate = `${endDateFilter.value}T23:59:59`;

            const response = await getAdminAiUsage(params);

            if (response && response.success && response.data) {
                const data = response.data;
                renderTable(data.usages);
                renderPagination(data.totalPages);

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
            tableBody.innerHTML = '<tr><td colspan="8" style="text-align: center;">No usage found.</td></tr>';
            return;
        }

        tableBody.innerHTML = items.map(item => `
            <tr>
                <td>${item.userEmail || item.user || '-'}</td>
                <td><span class="badge ${item.tier ? item.tier.toLowerCase() : ''}">${item.tier || '-'}</span></td>
                <td>${item.aiQaUsed || item.AI_QA || 0}</td>
                <td>${item.summaryUsed || item.AI_SUMMARY || 0}</td>
                <td>${item.flashcardUsed || item.AI_FLASHCARD || 0}</td>
                <td>${item.quizUsed || item.AI_QUIZ || 0}</td>
                <td><strong>${item.totalAiRequests || item.total || 0}</strong></td>
                <td>${item.lastUsedAt ? new Date(item.lastUsedAt).toLocaleString() : '-'}</td>
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
                loadUsage();
            };
            pagination.appendChild(btn);
        }
    };

    let currentSearchTimeout = null;
    searchInput.addEventListener('input', () => {
        if (currentSearchTimeout) clearTimeout(currentSearchTimeout);
        currentSearchTimeout = setTimeout(() => {
            currentPage = 1;
            loadUsage();
        }, 500);
    });

    [tierFilter, featureFilter, startDateFilter, endDateFilter].forEach(el => {
        if (el) {
            el.addEventListener('change', () => {
                currentPage = 1;
                loadUsage();
            });
        }
    });

    window.clearFilters = () => {
        searchInput.value = '';
        if (tierFilter) tierFilter.value = '';
        if (featureFilter) featureFilter.value = '';
        startDateFilter.value = '';
        endDateFilter.value = '';
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
            if (featureFilter && featureFilter.value) params.feature = featureFilter.value;
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
