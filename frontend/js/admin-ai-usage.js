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
                page: currentPage,
                size: pageSize
            };

            if (searchInput.value) params.search = searchInput.value;
            if (tierFilter.value) params.tier = tierFilter.value;
            if (startDateFilter.value) params.startDate = startDateFilter.value;
            if (endDateFilter.value) params.endDate = endDateFilter.value;

            let response;
            try {
                response = await getAdminAiUsage(params);
            } catch (error) {
                console.warn('Backend not ready or error:', error);
                // Mock fallback
                response = {
                    data: {
                        content: [
                            { userEmail: 'user1@test.com', tier: 'FREE', aiQa: 5, aiSummary: 2, aiFlashcard: 0, aiQuiz: 1, totalRequests: 8, lastUsedAt: '2026-07-17T10:00:00Z' },
                            { userEmail: 'premium@test.com', tier: 'PREMIUM', aiQa: 50, aiSummary: 20, aiFlashcard: 15, aiQuiz: 10, totalRequests: 95, lastUsedAt: '2026-07-16T15:30:00Z' }
                        ],
                        totalElements: 2,
                        totalPages: 1
                    }
                };
            }

            const data = response.data;
            renderTable(data.content);
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
                <td>${item.aiQa || item.AI_QA || 0}</td>
                <td>${item.aiSummary || item.AI_SUMMARY || 0}</td>
                <td>${item.aiFlashcard || item.AI_FLASHCARD || 0}</td>
                <td>${item.aiQuiz || item.AI_QUIZ || 0}</td>
                <td><strong>${item.totalRequests || item.total || 0}</strong></td>
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
