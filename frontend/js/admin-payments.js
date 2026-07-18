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

    if (!payments || payments.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 24px; color: #666;">No payments found matching the criteria.</td></tr>';
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
        tdPlan.textContent = payment.planCode || 'N/A';

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
        tdProvider.textContent = payment.paymentProvider || 'UNKNOWN';

        // Status Badge
        const tdStatus = document.createElement('td');
        const badge = document.createElement('span');
        badge.className = `status-badge status-${(payment.status || 'PENDING').toLowerCase()}`;
        badge.textContent = payment.status;
        tdStatus.appendChild(badge);

        // Date (CreatedAt in local timezone)
        const tdDate = document.createElement('td');
        const localDate = new Date(payment.createdAt).toLocaleString('vi-VN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
        tdDate.textContent = localDate;

        row.appendChild(tdId);
        row.appendChild(tdCustomer);
        row.appendChild(tdPlan);
        row.appendChild(tdAmount);
        row.appendChild(tdProvider);
        row.appendChild(tdStatus);
        row.appendChild(tdDate);

        tableBody.appendChild(row);
    });
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
