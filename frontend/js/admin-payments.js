document.addEventListener('DOMContentLoaded', () => {
    // Check authentication and layout rendering happens via layout.js automatically.
    // We just need to load data and handle UI interactions.
    loadPayments();

    // Bind search input Enter key
    document.getElementById('filterSearch').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            loadPayments(0);
        }
    });

    // Make inputs trigger search on keyup just like user search
    document.getElementById('filterSearch').addEventListener('keyup', function(e) {
        if (e.key === 'Enter') {
            loadPayments(0);
        }
    });

    // Bind change events for select filters and date inputs
    ['filterPlan', 'filterStatus', 'filterProvider', 'filterStartDate', 'filterEndDate'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', () => loadPayments(0));
        }
    });
});

let currentPage = 0;
const PAGE_SIZE = 10;
let currentSearchTimeout = null;

function handleSearch(event) {
    if (currentSearchTimeout) {
        clearTimeout(currentSearchTimeout);
    }
    currentSearchTimeout = setTimeout(() => {
        loadPayments(0);
    }, 500);
}

/**
 * Loads paginated payments and updates the table.
 * @param {number} page
 */
async function loadPayments(page = currentPage) {
    try {
        // Show loading state
        const contentState = document.getElementById('paymentsContent');
        if (contentState.style.display === "none" || contentState.style.display === "") {
            document.getElementById('paymentsLoadingState').style.display = 'flex';
            document.getElementById('paymentsErrorState').style.display = 'none';
        } else {
            document.getElementById('paymentsErrorState').style.display = 'none';
        }

        const startDateVal = document.getElementById('filterStartDate').value;
        const endDateVal = document.getElementById('filterEndDate').value;

        const params = {
            page: page,
            size: PAGE_SIZE,
            sortBy: 'createdAt',
            direction: 'desc',
            search: document.getElementById('filterSearch').value.trim(),
            plan: document.getElementById('filterPlan').value,
            status: document.getElementById('filterStatus').value,
            provider: document.getElementById('filterProvider') ? document.getElementById('filterProvider').value : '',
            startDate: startDateVal ? `${startDateVal}T00:00:00` : '',
            endDate: endDateVal ? `${endDateVal}T23:59:59` : ''
        };

        const response = await getAdminPayments(params);

        // Hide loading state, show content
        document.getElementById('paymentsLoadingState').style.display = 'none';
        document.getElementById('paymentsErrorState').style.display = 'none';
        document.getElementById('paymentsContent').style.display = 'block';

        if (response.success && response.data) {
            currentPage = page;
            renderPayments(response.data.payments);
            updatePagination(response.data.currentPage, response.data.totalPages, response.data.totalElements);
            renderActiveFilterChips();
        } else {
            document.getElementById('paymentsContent').style.display = 'none';
            document.getElementById('paymentsErrorState').style.display = 'flex';
            document.getElementById('paymentsErrorMessage').textContent = response.message || 'Failed to load data';
        }
    } catch (error) {
        console.error("Error loading payments:", error);
        document.getElementById('paymentsLoadingState').style.display = 'none';
        document.getElementById('paymentsContent').style.display = 'none';
        document.getElementById('paymentsErrorState').style.display = 'flex';
        document.getElementById('paymentsErrorMessage').textContent = 'An error occurred while loading data.';
    }
}

/**
 * Renders the payments array into the table body.
 * @param {Array} payments
 */
function renderPayments(payments) {
    const tableBody = document.getElementById('paymentsTableBody');
    tableBody.innerHTML = '';

    let sumRevenue = 0;
    let countSuccess = 0;
    let countPending = 0;
    let countFailed = 0;

    if (!payments || payments.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 32px 16px; color: var(--text-muted, #64748b);">No payments found matching the selected criteria.</td></tr>';
        return;
    }

    payments.forEach(payment => {
        const row = document.createElement('tr');

        // Trxn ID
        const tdId = document.createElement('td');
        tdId.textContent = `#${payment.paymentId}`;
        tdId.style.fontWeight = '600';
        tdId.style.color = 'var(--text-muted, #64748b)';
        tdId.style.fontSize = '13px';

        // Customer (Avatar + Email/Name)
        const tdCustomer = document.createElement('td');
        const customerCell = document.createElement('div');
        customerCell.className = 'customer-cell';

        const rawEmail = payment.userEmail || 'N/A';
        const namePart = rawEmail.includes('@') ? rawEmail.split('@')[0] : rawEmail;
        const initial = namePart.charAt(0).toUpperCase() || 'U';

        customerCell.innerHTML = `
            <div class="customer-avatar-pill">${initial}</div>
            <div class="customer-info">
                <span class="customer-name">${namePart}</span>
                <span class="customer-email">${rawEmail}</span>
            </div>
        `;
        tdCustomer.appendChild(customerCell);

        // Plan
        const tdPlan = document.createElement('td');
        let planStr = payment.planCode || 'N/A';
        if (planStr.includes('_1_MONTH')) {
            planStr = planStr.replace('_1_MONTH', '').charAt(0).toUpperCase() + planStr.replace('_1_MONTH', '').slice(1).toLowerCase() + ' · 1 mo';
        }
        tdPlan.textContent = planStr;
        tdPlan.style.fontWeight = '500';
        tdPlan.style.fontSize = '12.5px';
        tdPlan.style.whiteSpace = 'nowrap';

        // Amount (VND Format)
        const tdAmount = document.createElement('td');
        const formatter = new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        });
        tdAmount.textContent = formatter.format(payment.amount);
        tdAmount.style.fontWeight = '700';
        tdAmount.style.color = 'var(--text-main, #172033)';

        // Status Badge
        const tdStatus = document.createElement('td');
        const badge = document.createElement('span');

        let statusKey = (payment.status || 'PENDING').toLowerCase();
        let statusText = payment.status;

        if (payment.status === 'SUCCESS') {
            statusText = 'Success';
            statusKey = 'success';
        } else if (payment.status === 'PENDING') {
            const createdAtDate = new Date(payment.createdAt);
            const expiresAtDate = new Date(createdAtDate.getTime() + 15 * 60000); // 15 mins
            const now = new Date();
            if (now < expiresAtDate) {
                const diffMin = Math.ceil((expiresAtDate - now) / 60000);
                statusText = `Pending (${diffMin}m)`;
                statusKey = 'pending';
            } else {
                statusText = 'Expired';
                statusKey = 'expired';
            }
        } else if (payment.status === 'FAILED') {
            statusText = 'Failed';
            statusKey = 'failed';
        } else if (payment.status === 'CANCELLED') {
            statusText = 'Cancelled';
            statusKey = 'cancelled';
        } else if (payment.status === 'EXPIRED') {
            statusText = 'Expired';
            statusKey = 'expired';
        }

        badge.className = `status-badge status-${statusKey}`;
        badge.textContent = statusText;
        tdStatus.appendChild(badge);

        // Date
        const tdDate = document.createElement('td');
        const createdDate = new Date(payment.createdAt);
        const timeStr = createdDate.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
        const dateStr = createdDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });

        tdDate.innerHTML = `
            <div style="display: flex; flex-direction: column; line-height: 1.25;">
                <span style="font-weight: 600; font-size: 13px; color: var(--text-main, #172033);">${timeStr}</span>
                <span style="font-size: 11.5px; color: var(--text-muted, #64748b);">${dateStr}</span>
            </div>
        `;

        // Actions
        const tdActions = document.createElement('td');
        tdActions.style.textAlign = 'center';
        tdActions.style.verticalAlign = 'middle';
        const actionGroup = document.createElement('div');
        actionGroup.className = 'admin-action-group';
        const viewBtn = document.createElement('button');
        viewBtn.className = 'btn btn-sm btn-outline';
        viewBtn.textContent = 'View';
        viewBtn.onclick = () => viewPaymentDetails(payment.paymentId);
        actionGroup.appendChild(viewBtn);
        tdActions.appendChild(actionGroup);

        row.appendChild(tdId);
        row.appendChild(tdCustomer);
        row.appendChild(tdPlan);
        row.appendChild(tdAmount);
        row.appendChild(tdStatus);
        row.appendChild(tdDate);
        row.appendChild(tdActions);

        tableBody.appendChild(row);

        // Accumulate stats
        if (statusKey === 'success') {
            countSuccess++;
            sumRevenue += (payment.amount || 0);
        } else if (statusKey === 'pending') {
            countPending++;
        } else {
            countFailed++;
        }
    });

    // Update summary cards
    const formatter = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });
    document.getElementById('cardRevenue').textContent = formatter.format(sumRevenue);
    document.getElementById('cardSuccess').textContent = countSuccess;
    document.getElementById('cardPending').textContent = countPending;
    document.getElementById('cardFailed').textContent = countFailed;
}

/**
 * Renders active filter chips in the row 2 container.
 */
function renderActiveFilterChips() {
    const container = document.getElementById('activeFilterChips');
    if (!container) return;

    container.innerHTML = '';

    const search = document.getElementById('filterSearch').value.trim();
    const plan = document.getElementById('filterPlan').value;
    const status = document.getElementById('filterStatus').value;
    const provider = document.getElementById('filterProvider') ? document.getElementById('filterProvider').value : '';
    const startDate = document.getElementById('filterStartDate').value;
    const endDate = document.getElementById('filterEndDate').value;

    const chips = [];

    if (search) {
        chips.push({ label: `Search: "${search}"`, reset: () => { document.getElementById('filterSearch').value = ''; } });
    }
    if (plan) {
        const planText = plan.replace('_1_MONTH', '');
        chips.push({ label: `Plan: ${planText}`, reset: () => { document.getElementById('filterPlan').value = ''; } });
    }
    if (status) {
        chips.push({ label: `Status: ${status}`, reset: () => { document.getElementById('filterStatus').value = ''; } });
    }
    if (provider) {
        chips.push({ label: `Provider: ${provider}`, reset: () => { document.getElementById('filterProvider').value = ''; } });
    }
    if (startDate) {
        chips.push({ label: `From: ${startDate}`, reset: () => {
            document.getElementById('filterStartDate').value = '';
            document.getElementById('startDateDisplay').textContent = 'Start Date';
            document.getElementById('startDateDisplay').style.fontWeight = '500';
        } });
    }
    if (endDate) {
        chips.push({ label: `To: ${endDate}`, reset: () => {
            document.getElementById('filterEndDate').value = '';
            document.getElementById('endDateDisplay').textContent = 'End Date';
            document.getElementById('endDateDisplay').style.fontWeight = '500';
        } });
    }

    chips.forEach(chip => {
        const span = document.createElement('span');
        span.className = 'filter-chip';
        span.innerHTML = `
            ${chip.label}
            <span class="filter-chip-remove" title="Remove filter">&times;</span>
        `;
        span.querySelector('.filter-chip-remove').onclick = () => {
            chip.reset();
            loadPayments(0);
        };
        container.appendChild(span);
    });
}

/**
 * Updates the pagination UI state.
 */
function updatePagination(pageNumber, totalPages, totalElements) {
    const paginationContainer = document.getElementById('paginationControls');
    if (!paginationContainer) return;

    if (!totalElements || totalElements === 0) {
        paginationContainer.innerHTML = '';
        return;
    }

    const startItem = pageNumber * PAGE_SIZE + 1;
    const endItem = Math.min((pageNumber + 1) * PAGE_SIZE, totalElements);

    let html = `<span class="admin-pagination-info">Showing ${startItem} - ${endItem} of ${totalElements} payments</span>
    <div style="display: flex; gap: 4px;">`;

    for (let i = 0; i < totalPages; i++) {
        html += `<button class="admin-pagination-btn ${i === pageNumber ? 'active' : ''}" onclick="window.goToPage(${i})">${i + 1}</button>`;
    }
    html += `</div>`;
    paginationContainer.innerHTML = html;
}

window.goToPage = (page) => {
    loadPayments(page);
};

/**
 * Handles exporting filtered payments to Excel.
 */
function handleExport() {
    const startDateVal = document.getElementById('filterStartDate').value;
    const endDateVal = document.getElementById('filterEndDate').value;

    const params = {
        search: document.getElementById('filterSearch').value.trim(),
        plan: document.getElementById('filterPlan').value,
        status: document.getElementById('filterStatus').value,
        provider: document.getElementById('filterProvider') ? document.getElementById('filterProvider').value : '',
        startDate: startDateVal ? `${startDateVal}T00:00:00` : '',
        endDate: endDateVal ? `${endDateVal}T23:59:59` : ''
    };
    exportAdminPayments(params);
}

/**
 * Resets all filters to default and reloads data.
 */
function clearFilters() {
    document.getElementById('filterSearch').value = '';
    document.getElementById('filterPlan').value = '';
    document.getElementById('filterStatus').value = '';
    if (document.getElementById('filterProvider')) document.getElementById('filterProvider').value = '';
    document.getElementById('filterStartDate').value = '';
    document.getElementById('filterEndDate').value = '';

    // Reset the custom date placeholders
    document.getElementById('startDateDisplay').textContent = 'Start Date';
    document.getElementById('startDateDisplay').style.fontWeight = '600';
    document.getElementById('endDateDisplay').textContent = 'End Date';
    document.getElementById('endDateDisplay').style.fontWeight = '600';

    ['filterPlan', 'filterStatus', 'filterProvider'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.dispatchEvent(new Event("syncCustom"));
    });

    loadPayments(0);
}

async function viewPaymentDetails(paymentId) {
    document.getElementById("paymentDetailModal").classList.add("active");
    const body = document.getElementById("paymentDetailBody");
    body.innerHTML = '<p>Loading...</p>';
    try {
        const response = await fetchAdmin(`/api/admin/payments/${paymentId}`, { method: 'GET' });
        if (response && response.success && response.data) {
            const p = response.data;
            const formatter = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });

            let displayStatus = p.status || 'PENDING';
            if (displayStatus === 'PENDING') {
                const createdDate = new Date(p.createdAt);
                if (createdDate.getTime() + 15 * 60000 < Date.now()) {
                    displayStatus = 'EXPIRED';
                }
            }

            const formatDateTime = (dateString) => {
                if (!dateString) return 'Not available';
                const d = new Date(dateString);
                const datePart = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                const timePart = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                return `${datePart} &middot; ${timePart}`;
            };

            body.innerHTML = `
                <div style="display: flex; flex-direction: column; gap: 24px;">
                    <!-- Payment Section -->
                    <div>
                        <h4 style="margin: 0 0 12px 0; font-size: 14px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid var(--border-light); padding-bottom: 8px;">Payment</h4>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                            <div><strong>Trxn ID:</strong> #${p.paymentId}</div>
                            <div><strong>Plan:</strong> ${p.planCode || p.planName || '-'}</div>
                            <div><strong>Amount:</strong> <span style="font-weight:bold">${formatter.format(p.amount)}</span></div>
                            <div><strong>Status:</strong> <span class="status-badge status-${displayStatus.toLowerCase()}">${displayStatus === 'SUCCESS' ? 'Success' : displayStatus}</span></div>
                            <div><strong>Created At:</strong> ${formatDateTime(p.createdAt)}</div>
                            <div><strong>Paid At:</strong> ${formatDateTime(p.paidAt)}</div>
                        </div>
                    </div>

                    <!-- Customer Section -->
                    <div>
                        <h4 style="margin: 0 0 12px 0; font-size: 14px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid var(--border-light); padding-bottom: 8px;">Customer</h4>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                            <div><strong>User Email:</strong> ${p.userEmail || p.userId}</div>
                        </div>
                    </div>

                    <!-- VNPay Section -->
                    <div>
                        <h4 style="margin: 0 0 12px 0; font-size: 14px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid var(--border-light); padding-bottom: 8px;">VNPay Details</h4>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                            <div><strong>Provider:</strong> ${p.paymentProvider || 'Not available'}</div>
                            <div><strong>Trans. No:</strong> ${p.transactionNo || 'Not available'}</div>
                        </div>
                    </div>
                </div>
            `;
        } else {
            body.innerHTML = '<p style="color:var(--danger)">Failed to load details.</p>';
        }
    } catch (e) {
        body.innerHTML = '<p style="color:var(--danger)">An error occurred.</p>';
    }
}

function closePaymentDetailModal() {
    document.getElementById("paymentDetailModal").classList.remove("active");
}
