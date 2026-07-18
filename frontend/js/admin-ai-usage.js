document.addEventListener('DOMContentLoaded', () => {
    // State
    let currentPage = 1;
    const pageSize = 10;
    
    // Elements
    const tableBody = document.getElementById('usageTableBody');
    const pagination = document.getElementById('pagination');
    const searchInput = document.getElementById('searchInput');
    const tierFilter = document.getElementById('tierFilter');
    const startDateFilter = document.getElementById('startDateFilter');
    const endDateFilter = document.getElementById('endDateFilter');
    const filterBtn = document.getElementById('filterBtn');
    const exportBtn = document.getElementById('exportBtn');

    const loadUsage = async () => {
        try {
            tableBody.innerHTML = '<tr><td colspan="8" style="text-align: center;">Loading...</td></tr>';
            
            const params = {
                page: currentPage - 1,
                size: pageSize
            };

            if (searchInput.value) params.search = searchInput.value;
            if (tierFilter.value) params.tier = tierFilter.value;
            if (startDateFilter.value) params.startDate = `${startDateFilter.value}T00:00:00`;
            if (endDateFilter.value) params.endDate = `${endDateFilter.value}T23:59:59`;

            let response;
            try {
                response = await getAdminAiUsage(params);
            } catch (error) {
                console.warn('Backend not ready or error:', error);
                // Mock fallback
                response = {
                    data: {
                        usages: [
                            { userEmail: 'user1@test.com', tier: 'FREE', aiQaUsed: 5, summaryUsed: 2, flashcardUsed: 0, quizUsed: 1, totalAiRequests: 8, lastUsedAt: '2026-07-17T10:00:00Z' },
                            { userEmail: 'premium@test.com', tier: 'PREMIUM', aiQaUsed: 50, summaryUsed: 20, flashcardUsed: 15, quizUsed: 10, totalAiRequests: 95, lastUsedAt: '2026-07-16T15:30:00Z' }
                        ],
                        totalElements: 2,
                        totalPages: 1
                    }
                };
            }

            const data = response.data;
            renderTable(data.usages);
            renderPagination(data.totalPages);

        } catch (error) {
            console.error('Error loading AI usage:', error);
            tableBody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: red;">Failed to load data</td></tr>';
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

    filterBtn.addEventListener('click', () => {
        currentPage = 1;
        loadUsage();
    });

    exportBtn.addEventListener('click', async () => {
        try {
            const params = {};
            if (searchInput.value) params.search = searchInput.value;
            if (tierFilter.value) params.tier = tierFilter.value;
            if (startDateFilter.value) params.startDate = startDateFilter.value;
            if (endDateFilter.value) params.endDate = endDateFilter.value;

            const blob = await exportAdminAiUsage(params);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `AI_Usage_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (error) {
            alert('Failed to export data');
        }
    });

    // Initial Load
    loadUsage();
});
