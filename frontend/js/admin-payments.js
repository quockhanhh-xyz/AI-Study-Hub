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
        document.getElementById('paymentsLoadingState').style.display = 'flex';
        document.getElementById('paymentsErrorState').style.display = 'none';
        document.getElementById('paymentsContent').style.display = 'none';

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
            provider: document.getElementById('filterProvider').value,
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
        tableBody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 24px; color: #666;">No payments found matching the criteria.</td></tr>';
        return;
    }

    payments.forEach(payment => {
        const row = document.createElement('tr');

        // Trxn ID
        const tdId = document.createElement('td');
        tdId.textContent = `#${payment.paymentId}`;
        tdId.style.fontWeight = '500';

        // Customer (Email)
        const tdCustomer = document.createElement('td');
        const customerWrapper = document.createElement('div');
        customerWrapper.className = 'user-info';
        // Backend only provides userEmail, no userFullName
        customerWrapper.innerHTML = `
            <div class="user-details">
                <span class="user-name" style="font-weight: 500;">${payment.userEmail ? payment.userEmail.split('@')[0] : 'N/A'}</span>
                <span class="user-email" style="font-size: 13px; color: #64748b;">${payment.userEmail || ''}</span>
            </div>
        `;
        tdCustomer.appendChild(customerWrapper);

        // Plan
        const tdPlan = document.createElement('td');
        let planStr = payment.planCode || 'N/A';
        if (planStr.includes('_1_MONTH')) {
            planStr = planStr.replace('_1_MONTH', '').charAt(0).toUpperCase() + planStr.replace('_1_MONTH', '').slice(1).toLowerCase() + ' · 1 month';
        }
        tdPlan.textContent = planStr;

        // Amount (VND Format)
        const tdAmount = document.createElement('td');
        const formatter = new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        });
        tdAmount.textContent = formatter.format(payment.amount);
        tdAmount.style.fontWeight = '600';

        // Provider
        const tdProvider = document.createElement('td');
        let provStr = payment.paymentProvider || 'UNKNOWN';
        if (provStr === 'VNPAY_SANDBOX') provStr = 'VNPay (Sandbox)';
        else if (provStr === 'MOCK') provStr = 'Mock Provider';
        tdProvider.textContent = provStr;

        // Status Badge
        const tdStatus = document.createElement('td');
        const badge = document.createElement('span');
        badge.className = `status-badge status-${(payment.status || 'PENDING').toLowerCase()}`;
        
        let statusText = payment.status;
        if (statusText === 'SUCCESS') statusText = 'Paid';
        else if (statusText === 'PENDING') statusText = 'Pending';
        else if (statusText === 'FAILED') statusText = 'Failed';
        else if (statusText === 'CANCELLED') statusText = 'Cancelled';
        else if (statusText === 'EXPIRED') statusText = 'Expired';
        
        if (payment.status === 'PENDING') {
            const createdAtDate = new Date(payment.createdAt);
            const expiresAtDate = new Date(createdAtDate.getTime() + 15 * 60000); // 15 mins
            const now = new Date();
            if (now < expiresAtDate) {
                const diffMin = Math.ceil((expiresAtDate - now) / 60000);
                statusText = `Pending · expires in ${diffMin} min`;
            } else {
                statusText = 'Expired';
                badge.className = 'status-badge status-expired';
            }
        }
        
        badge.textContent = statusText;
        tdStatus.appendChild(badge);

        // Date (CreatedAt in local timezone)
        const tdDate = document.createElement('td');
        const localDate = new Date(payment.createdAt).toLocaleString('en-US', {
            month: 'short',
            day: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        }).replace(',', ' ·');
        tdDate.textContent = localDate;

        // Actions
        const tdActions = document.createElement('td');
        tdActions.style.textAlign = 'right';
        const viewBtn = document.createElement('button');
        viewBtn.className = 'btn btn-sm btn-outline';
        viewBtn.textContent = 'View';
        viewBtn.onclick = () => viewPaymentDetails(payment.paymentId);
        tdActions.appendChild(viewBtn);

        row.appendChild(tdId);
        row.appendChild(tdCustomer);
        row.appendChild(tdPlan);
        row.appendChild(tdAmount);
        row.appendChild(tdProvider);
        row.appendChild(tdStatus);
        row.appendChild(tdDate);
        row.appendChild(tdActions);

        tableBody.appendChild(row);
        
        // Accumulate stats
        if (payment.status === 'SUCCESS') {
            countSuccess++;
            sumRevenue += (payment.amount || 0);
        } else if (payment.status === 'PENDING') {
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
 * Updates the pagination UI state.
 */
function updatePagination(pageNumber, totalPages, totalElements) {
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    const indicator = document.getElementById('pageIndicator');
    const paginationContainer = document.getElementById('paginationControls');

    if (totalPages <= 1) {
        if (paginationContainer) paginationContainer.style.display = 'none';
    } else {
        if (paginationContainer) paginationContainer.style.display = 'flex';

        if (indicator) {
            indicator.textContent = `Page ${pageNumber + 1} of ${Math.max(1, totalPages)} (${totalElements} total)`;
        }

        if (prevBtn) prevBtn.disabled = (pageNumber <= 0);
        if (nextBtn) nextBtn.disabled = (pageNumber >= totalPages - 1);
    }
}

/**
 * Navigation handler for pagination buttons.
 */
function changePage(delta) {
    loadPayments(currentPage + delta);
}

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
        provider: document.getElementById('filterProvider').value,
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
    document.getElementById('filterProvider').value = '';
    document.getElementById('filterStartDate').value = '';
    document.getElementById('filterEndDate').value = '';

    // Reset the custom date placeholders
    document.getElementById('startDateDisplay').textContent = 'Start Date';
    document.getElementById('startDateDisplay').style.fontWeight = '600';
    document.getElementById('endDateDisplay').textContent = 'End Date';
    document.getElementById('endDateDisplay').style.fontWeight = '600';

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

            body.innerHTML = `
                <div style="display: flex; flex-direction: column; gap: 24px;">
                    <!-- Payment Section -->
                    <div>
                        <h4 style="margin: 0 0 12px 0; font-size: 14px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid var(--border-light); padding-bottom: 8px;">Payment</h4>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                            <div><strong>Trxn ID:</strong> #${p.paymentId}</div>
                            <div><strong>Plan:</strong> ${p.planCode || p.planName || '-'}</div>
                            <div><strong>Amount:</strong> <span style="font-weight:bold">${formatter.format(p.amount)}</span></div>
                            <div><strong>Status:</strong> <span class="badge status-${displayStatus.toLowerCase()}">${displayStatus}</span></div>
                            <div><strong>Created At:</strong> ${p.createdAt ? new Date(p.createdAt).toLocaleString() : 'Not available'}</div>
                            <div><strong>Paid At:</strong> ${p.paidAt ? new Date(p.paidAt).toLocaleString() : 'Not available'}</div>
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
