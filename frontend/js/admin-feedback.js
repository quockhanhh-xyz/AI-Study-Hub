/**
 * Javascript logic for Admin Feedback Management Page
 */

let currentPage = 0;
const pageSize = 10;
let activeReviewId = null;
let currentFilters = {
    search: '',
    rating: '',
    category: '',
    status: ''
};

document.addEventListener('DOMContentLoaded', () => {
    // Check auth and admin role
    if (typeof checkAuth === 'function') {
        checkAuth();
    }
    // Verify admin role explicitly
    const userJson = localStorage.getItem('currentUser');
    if (userJson) {
        try {
            const user = JSON.parse(userJson);
            if (user.role !== 'ADMIN' && user.role !== 'ROLE_ADMIN') {
                window.location.href = 'dashboard.html';
                return;
            }
        } catch (e) {
            window.location.href = 'login.html';
            return;
        }
    }

    initFilters();
    loadPageData();

    // Modal close hooks
    const overlays = document.querySelectorAll('.admin-modal-overlay');
    overlays.forEach(overlay => {
        const closeBtns = overlay.querySelectorAll('.btn-close-modal');
        closeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                overlay.classList.remove('active');
                activeReviewId = null;
            });
        });
    });

    // Pagination hooks
    document.getElementById('btnPrevPage').addEventListener('click', () => {
        if (currentPage > 0) {
            currentPage--;
            loadTableData();
        }
    });

    document.getElementById('btnNextPage').addEventListener('click', () => {
        currentPage++;
        loadTableData();
    });

    // Status change inside Modal
    document.getElementById('modalReviewStatusSelect').addEventListener('change', handleModalStatusChange);

    // Admin Reply form submit
    document.getElementById('adminReplyForm').addEventListener('submit', handleAdminReplySubmit);

    // Check for reviewId in URL query to auto open detail modal
    const urlParams = new URLSearchParams(window.location.search);
    const preselectedReviewId = urlParams.get('reviewId');
    if (preselectedReviewId) {
        setTimeout(() => {
            openReviewDetailsModal(parseInt(preselectedReviewId));
        }, 400);
    }
});

function initFilters() {
    const searchInput = document.getElementById('filterSearch');
    const ratingSelect = document.getElementById('filterRating');
    const categorySelect = document.getElementById('filterCategory');
    const statusSelect = document.getElementById('filterStatus');

    // Debounced search input
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            currentFilters.search = e.target.value.trim();
            currentPage = 0;
            loadTableData();
        }, 400);
    });

    ratingSelect.addEventListener('change', (e) => {
        currentFilters.rating = e.target.value;
        currentPage = 0;
        loadTableData();
    });

    categorySelect.addEventListener('change', (e) => {
        currentFilters.category = e.target.value;
        currentPage = 0;
        loadTableData();
    });

    statusSelect.addEventListener('change', (e) => {
        currentFilters.status = e.target.value;
        currentPage = 0;
        loadTableData();
    });
}

async function loadPageData() {
    document.getElementById('adminLoadingState').style.display = 'flex';
    document.getElementById('adminErrorState').style.display = 'none';
    document.getElementById('feedbackStatsSection').style.display = 'none';
    document.getElementById('feedbackFilterSection').style.display = 'none';
    document.getElementById('feedbackTableSection').style.display = 'none';

    try {
        await Promise.all([
            loadStatistics(),
            loadTableData()
        ]);

        document.getElementById('adminLoadingState').style.display = 'none';
        document.getElementById('feedbackStatsSection').style.display = 'grid';
        document.getElementById('feedbackFilterSection').style.display = 'block';
        document.getElementById('feedbackTableSection').style.display = 'block';
    } catch (error) {
        console.error('Failed to load admin feedback page data:', error);
        document.getElementById('adminLoadingState').style.display = 'none';
        document.getElementById('adminErrorState').style.display = 'flex';
        document.getElementById('adminErrorMessage').textContent = error.message || 'Failed to connect to feedback APIs.';
    }
}

async function loadStatistics() {
    const result = await getAdminReviewStatistics();
    if (result && result.success && result.data) {
        const stats = result.data;
        document.getElementById('statTotalReviews').textContent = stats.totalActiveReviews;
        document.getElementById('statAvgRating').firstElementChild.textContent = stats.averageRating.toFixed(2);
        document.getElementById('statUnresponded').textContent = stats.unrespondedCount;

        // Render rating distribution bars
        const container = document.getElementById('distributionBars');
        container.innerHTML = '';

        // Star bars from 5 down to 1
        for (let i = 5; i >= 1; i--) {
            const count = stats.ratingDistribution[i] || 0;
            const percent = stats.totalActiveReviews > 0 ? (count / stats.totalActiveReviews) * 100 : 0;

            const row = document.createElement('div');
            row.className = 'distribution-row';
            row.innerHTML = `
                <div class="distribution-label">${i} <span class="star-gold">★</span></div>
                <div class="distribution-bar-wrapper">
                    <div class="distribution-bar" style="width: ${percent}%"></div>
                </div>
                <div class="distribution-count">${count}</div>
            `;
            container.appendChild(row);
        }
    }
}

async function loadTableData() {
    const params = {
        page: currentPage,
        size: pageSize,
        sortBy: 'createdAt',
        direction: 'desc'
    };

    if (currentFilters.search) params.search = currentFilters.search;
    if (currentFilters.rating) params.rating = currentFilters.rating;
    if (currentFilters.category) params.category = currentFilters.category;
    if (currentFilters.status) params.status = currentFilters.status;

    const result = await getAdminReviews(params);
    if (result && result.success && result.data) {
        const pageData = result.data;
        renderTable(pageData.content);
        renderPagination(pageData);
    } else {
        throw new Error(result.message || 'Failed to fetch reviews list.');
    }
}

function renderTable(reviews) {
    const tbody = document.getElementById('reviewsTableBody');
    const emptyState = document.getElementById('tableEmptyState');
    tbody.innerHTML = '';

    if (!reviews || reviews.length === 0) {
        emptyState.style.display = 'flex';
        return;
    }
    emptyState.style.display = 'none';

    reviews.forEach(r => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div class="user-name" style="font-weight: 600;">${escapeHTML(r.userFullName || 'Anonymous')}</div>
                <div class="user-email-text" style="font-size: 0.75rem;">${escapeHTML(r.userEmail)}</div>
            </td>
            <td>
                <div style="display: flex; gap: 2px;">
                    ${getStarStarsSvg(r.rating)}
                </div>
            </td>
            <td><span class="status-badge status-new" style="background: var(--bg-color, #f1f5f9); color: var(--text-color, #475569);">${escapeHTML(r.category)}</span></td>
            <td>
                <div style="font-weight: 500; max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHTML(r.title)}</div>
            </td>
            <td><span class="status-badge status-${r.status.toLowerCase()}">${r.status.replace('_', ' ')}</span></td>
            <td style="font-size: 0.8rem; color: var(--text-muted);">${formatDate(r.createdAt)}</td>
            <td style="text-align: center;">
                <button class="btn btn-sm btn-outline btn-detail-action" data-id="${r.reviewId}">Detail</button>
            </td>
        `;

        tr.querySelector('.btn-detail-action').addEventListener('click', () => {
            openReviewDetailsModal(r.reviewId);
        });

        tbody.appendChild(tr);
    });
}

function getStarStarsSvg(rating) {
    let html = '';
    for (let i = 1; i <= 5; i++) {
        html += `<span class="${i <= rating ? 'star-gold' : ''}" style="font-size: 1.1rem; color: ${i <= rating ? '#fbbf24' : '#cbd5e1'}">★</span>`;
    }
    return html;
}

function renderPagination(pageData) {
    const totalElements = pageData.totalElements;
    const totalPages = pageData.totalPages;
    const start = totalElements === 0 ? 0 : (currentPage * pageSize) + 1;
    const end = Math.min((currentPage + 1) * pageSize, totalElements);

    document.getElementById('pagStart').textContent = start;
    document.getElementById('pagEnd').textContent = end;
    document.getElementById('pagTotal').textContent = totalElements;

    document.getElementById('btnPrevPage').disabled = currentPage === 0;
    document.getElementById('btnNextPage').disabled = currentPage >= totalPages - 1 || totalPages === 0;
}

async function openReviewDetailsModal(reviewId) {
    try {
        const result = await getAdminReviewDetails(reviewId);
        if (result && result.success && result.data) {
            const review = result.data;
            activeReviewId = review.reviewId;

            // Fill modal header & summary info
            document.getElementById('modalReviewUser').textContent = `From: ${review.userFullName} (${review.userEmail})`;
            document.getElementById('modalReviewCategory').textContent = review.category;
            document.getElementById('modalReviewRatingStars').innerHTML = getStarStarsSvg(review.rating);
            document.getElementById('modalReviewStatusSelect').value = review.status;
            document.getElementById('modalReviewTitle').textContent = review.title;
            document.getElementById('modalReviewContent').textContent = review.content;

            // Render Timeline
            renderModalTimeline(review.replies || [], review.userEmail);

            // Clear input area
            document.getElementById('adminReplyContent').value = '';

            // Show Modal
            document.getElementById('reviewDetailModalOverlay').classList.add('active');
        }
    } catch (error) {
        console.error('Failed to load review detail modal:', error);
        if (window.showToast) {
            window.showToast('Failed to retrieve feedback conversation detail.', 'error');
        }
    }
}

function renderModalTimeline(replies, userEmail) {
    const container = document.getElementById('modalChatMessages');
    container.innerHTML = '';

    replies.forEach(r => {
        const isUser = r.senderEmail === userEmail;
        const bubble = document.createElement('div');
        bubble.className = `admin-chat-bubble ${isUser ? 'user' : 'admin'}`;
        
        const contentSpan = document.createElement('span');
        contentSpan.textContent = r.content;
        bubble.appendChild(contentSpan);

        const meta = document.createElement('div');
        meta.className = 'admin-chat-meta';
        const senderLabel = isUser ? (r.senderFullName || 'User') : 'You (Admin)';
        meta.textContent = `${senderLabel} • ${formatDate(r.createdAt)}`;
        bubble.appendChild(meta);

        container.appendChild(bubble);
    });

    container.scrollTop = container.scrollHeight;
}

async function handleModalStatusChange(e) {
    if (!activeReviewId) return;

    const newStatus = e.target.value;
    try {
        const result = await updateAdminReviewStatus(activeReviewId, newStatus);
        if (result && result.success) {
            if (window.showToast) {
                window.showToast('Review status updated successfully.', 'success');
            }
            loadStatistics();
            loadTableData();
        } else {
            if (window.showToast) {
                window.showToast(result.message || 'Failed to update review status.', 'error');
            }
        }
    } catch (error) {
        console.error('Failed to update status:', error);
        if (window.showToast) {
            window.showToast('Error changing feedback status.', 'error');
        }
    }
}

async function handleAdminReplySubmit(e) {
    e.preventDefault();
    if (!activeReviewId) return;

    const input = document.getElementById('adminReplyContent');
    const content = input.value.trim();

    if (!content) return;

    try {
        const result = await addAdminReviewReply(activeReviewId, content);
        if (result && result.success) {
            input.value = '';
            if (window.showToast) {
                window.showToast('Reply submitted successfully!', 'success');
            }
            // Reload timeline details and external list
            openReviewDetailsModal(activeReviewId);
            loadStatistics();
            loadTableData();
        } else {
            if (window.showToast) {
                window.showToast(result.message || 'Failed to submit response.', 'error');
            }
        }
    } catch (error) {
        console.error('Admin reply submission error:', error);
        if (window.showToast) {
            window.showToast('Failed to post reply.', 'error');
        }
    }
}

function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + d.toLocaleDateString();
    } catch (e) {
        return dateStr;
    }
}
