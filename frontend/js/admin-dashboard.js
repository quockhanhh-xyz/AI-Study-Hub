/**
 * Admin Dashboard View Logic
 * Handles data fetching, UI state rendering, and Chart.js integration
 */

let chartInstances = {};
let autoRefreshInterval = null;

document.addEventListener("DOMContentLoaded", () => {
    // Wait for the auth layout system to finish verifying the user
    if (window.authReady) {
        window.authReady.then((isAuthenticated) => {
            if (isAuthenticated) {
                loadDashboardData();
            }
        });
    } else {
        loadDashboardData();
    }
});

async function loadDashboardData(isManualRefresh = false) {
    const loadingState = document.getElementById("dashboardLoadingState");
    const errorState = document.getElementById("dashboardErrorState");
    const contentState = document.getElementById("dashboardContent");
    const refreshBtn = document.getElementById("btnRefreshDashboard");

    if (!isManualRefresh) {
        loadingState.style.display = "flex";
        errorState.style.display = "none";
        contentState.style.display = "none";
    } else {
        if (refreshBtn) refreshBtn.disabled = true;
    }

    try {
        const days = document.getElementById("chartDateRange") ? parseInt(document.getElementById("chartDateRange").value) : 30;
        const [summaryResponse, chartsResponse] = await Promise.all([
            fetchAdminDashboardSummary(),
            fetchAdminDashboardCharts(days)
        ]);

        if (summaryResponse && summaryResponse.success && chartsResponse && chartsResponse.success) {
            renderDashboardStats(summaryResponse.data);
            renderDashboardCharts(chartsResponse.data);

            if (!isManualRefresh) {
                loadingState.style.display = "none";
                contentState.style.display = "block";
            }

            // Setup auto-refresh if not already running
            if (!autoRefreshInterval) {
                autoRefreshInterval = setInterval(() => loadDashboardData(true), 60000);
            }
            
            // Show last updated time
            const now = new Date();
            const timeString = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            const dateString = now.toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'});
            document.getElementById("dashboardLastUpdated").textContent = `Last updated: ${dateString}, ${timeString}`;
            
            const autoRefreshText = document.getElementById("dashboardAutoRefreshText");
            if (autoRefreshText) autoRefreshText.style.display = "block";
        } else {
            throw new Error("Failed to load dashboard data");
        }
    } catch (error) {
        console.error("Dashboard error:", error);
        if (!isManualRefresh) {
            loadingState.style.display = "none";
            errorState.style.display = "flex";
            document.getElementById("dashboardErrorMessage").textContent = error.message || "An unexpected error occurred.";
        }
    } finally {
        if (refreshBtn) refreshBtn.disabled = false;
    }
}

async function loadDashboardChartsData() {
    const days = parseInt(document.getElementById("chartDateRange").value);
    try {
        const chartsResponse = await fetchAdminDashboardCharts(days);
        if (chartsResponse && chartsResponse.success) {
            renderDashboardCharts(chartsResponse.data);
        }
    } catch (e) {
        console.error("Failed to fetch dashboard charts:", e);
    }
}

function renderDashboardStats(data) {
    document.getElementById("statTotalUsers").textContent = data.totalUsers || 0;
    document.getElementById("statTotalDocs").textContent = data.totalDocuments || 0;
    document.getElementById("statPendingDocs").textContent = data.pendingPublicDocuments || 0;
    document.getElementById("statAiRequests").textContent = data.aiRequestsToday || 0;

    const revenue = data.lifetimeRevenue || 0;
    document.getElementById("statTotalRevenue").textContent = revenue.toLocaleString('vi-VN') + " đ";
    
    const successPayments = data.allTimeSuccessfulPayments || 0;
    const successPaymentsEl = document.getElementById("statTotalSuccessPayments");
    if (successPaymentsEl) successPaymentsEl.textContent = `${successPayments} successful payments`;

    // Render Needs Attention
    const needsAttSection = document.getElementById("needsAttentionSection");
    const needsAttList = document.getElementById("needsAttentionList");
    needsAttList.innerHTML = "";
    
    const needsInfo = data.needsAttention;
    if (needsInfo) {
        let hasItems = false;
        if (needsInfo.pendingPublicDocuments > 0) {
            hasItems = true;
            needsAttList.innerHTML += `<div style="font-size: 0.95rem;">• Pending public documents: <strong>${needsInfo.pendingPublicDocuments}</strong> <a href="admin-documents.html?filter=pending" style="margin-left: 8px; color: var(--primary);">Review now</a></div>`;
        }
        if (needsInfo.pendingSubjectRequests > 0) {
            hasItems = true;
            needsAttList.innerHTML += `<div style="font-size: 0.95rem;">• Subject requests: <strong>${needsInfo.pendingSubjectRequests}</strong> <a href="admin-subject-requests.html" style="margin-left: 8px; color: var(--primary);">View</a></div>`;
        }
        if (needsInfo.failedPayments > 0) {
            hasItems = true;
            needsAttList.innerHTML += `<div style="font-size: 0.95rem;">• Failed payments: <strong>${needsInfo.failedPayments}</strong> <a href="admin-payments.html?filter=failed" style="margin-left: 8px; color: var(--primary);">View</a></div>`;
        }
        
        if (!hasItems) {
            needsAttList.innerHTML = `<div style="color: var(--success); font-weight: 500;">All clear! Nothing urgently requires your attention.</div>`;
            needsAttSection.style.borderLeftColor = "var(--success)";
            needsAttSection.querySelector("h3").style.color = "var(--success)";
        } else {
            needsAttSection.style.borderLeftColor = "var(--danger)";
            needsAttSection.querySelector("h3").style.color = "var(--danger)";
        }
        needsAttSection.style.display = "block";
    } else {
        needsAttSection.style.display = "none";
    }
}

function renderDashboardCharts(data) {
    // Clean up old instances if re-rendering
    Object.values(chartInstances).forEach(chart => chart.destroy());
    chartInstances = {};

    // 1. Users by Tier (Bar Chart instead of Pie for readability)
    const usersByTier = data.userTierDistribution || [];
    renderChart("chartUsersByTier", "chartUsersByTierContainer", "bar", usersByTier, "tier", "count", ['#3b82f6', '#8b5cf6', '#ec4899'], "No users found.");

    // 2. Documents by Status (Bar Chart)
    const docsByStatus = data.documentApprovalStatus || [];
    renderChart("chartDocsByStatus", "chartDocsByStatusContainer", "bar", docsByStatus, "approvalStatus", "count", ['#f59e0b', '#16a34a', '#ff5858', '#9ca3af'], "No documents found.");

    // Format date labels for daily charts
    const formatDate = (dateStr) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
    };

    // 3. Revenue by Day (Line Chart)
    const revenueByDay = data.revenueByDay || [];
    const formattedRevenue = revenueByDay.map(i => ({ ...i, date: formatDate(i.date) }));
    renderChart("chartRevenue", "chartRevenueContainer", "line", formattedRevenue, "date", "revenue", ['#16a34a'], "No revenue recorded in this range.");

    // 4. AI Usage by Day (Bar Chart)
    const aiUsageByDay = data.aiUsageByDay || [];
    const formattedAiUsage = aiUsageByDay.map(i => ({ ...i, date: formatDate(i.date) }));
    renderChart("chartAiUsage", "chartAiUsageContainer", "bar", formattedAiUsage, "date", "count", ['#8b5cf6'], "No AI usage for selected period.");
}

function renderChart(canvasId, containerId, type, dataArray, labelKey, dataKey, colors, emptyMessage = "No data available") {
    const container = document.getElementById(containerId);
    const canvas = document.getElementById(canvasId);

    // Fallback state if no data
    if (!dataArray || dataArray.length === 0 || dataArray.every(item => item[dataKey] === 0)) {
        canvas.style.display = "none";
        let emptyState = container.querySelector(".admin-chart-empty");
        if (!emptyState) {
            emptyState = document.createElement("div");
            emptyState.className = "admin-chart-empty";
            container.appendChild(emptyState);
        }
        emptyState.textContent = emptyMessage;
        emptyState.style.display = "block";
        return;
    }

    // Hide empty state if data exists
    const emptyState = container.querySelector(".admin-chart-empty");
    if (emptyState) emptyState.style.display = "none";
    canvas.style.display = "block";

    const labels = dataArray.map(item => item[labelKey]);
    const values = dataArray.map(item => item[dataKey]);

    const config = {
        type: type,
        data: {
            labels: labels,
            datasets: [{
                label: labelKey.toUpperCase(),
                data: values,
                backgroundColor: type === 'line' ? colors[0] + '33' : colors,
                borderColor: type === 'line' ? colors[0] : colors,
                borderWidth: 2,
                fill: type === 'line',
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: type === 'pie'
                }
            }
        }
    };

    chartInstances[canvasId] = new Chart(canvas, config);
}
