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
        const [summaryResponse, chartsResponse] = await Promise.all([
            fetchAdminDashboardSummary(),
            fetchAdminDashboardCharts()
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

function renderDashboardStats(data) {
    document.getElementById("statTotalUsers").textContent = data.totalUsers || 0;
    document.getElementById("statTotalDocs").textContent = data.totalDocuments || 0;
    document.getElementById("statPendingDocs").textContent = data.pendingPublicDocuments || 0;
    document.getElementById("statAiRequests").textContent = data.aiRequestsToday || 0;

    const revenue = data.totalRevenue || 0;
    document.getElementById("statTotalRevenue").textContent = revenue.toLocaleString('vi-VN') + " đ";
}

function renderDashboardCharts(data) {
    // Clean up old instances if re-rendering
    Object.values(chartInstances).forEach(chart => chart.destroy());
    chartInstances = {};

    const colorPalette = ['#ff5858', '#f59e0b', '#16a34a', '#3b82f6', '#8b5cf6', '#ec4899'];

    // 1. Users by Tier (Pie Chart)
    const usersByTier = data.userTierDistribution || [];
    renderChart("chartUsersByTier", "chartUsersByTierContainer", "pie", usersByTier, "tier", "count", colorPalette);

    // 2. Documents by Status (Bar Chart)
    const docsByStatus = data.documentApprovalStatus || [];
    renderChart("chartDocsByStatus", "chartDocsByStatusContainer", "bar", docsByStatus, "approvalStatus", "count", colorPalette);

    // 3. Revenue by Day (Line Chart)
    const revenueByDay = data.revenueByDay || [];
    renderChart("chartRevenue", "chartRevenueContainer", "line", revenueByDay, "date", "revenue", ['#16a34a']);

    // 4. AI Usage by Day (Bar Chart)
    const aiUsageByDay = data.aiUsageByDay || [];
    renderChart("chartAiUsage", "chartAiUsageContainer", "bar", aiUsageByDay, "date", "count", ['#8b5cf6']);
}

function renderChart(canvasId, containerId, type, dataArray, labelKey, dataKey, colors) {
    const container = document.getElementById(containerId);
    const canvas = document.getElementById(canvasId);

    // Fallback state if no data
    if (!dataArray || dataArray.length === 0) {
        canvas.style.display = "none";
        let emptyState = container.querySelector(".admin-chart-empty");
        if (!emptyState) {
            emptyState = document.createElement("div");
            emptyState.className = "admin-chart-empty";
            emptyState.textContent = "No data available";
            container.appendChild(emptyState);
        }
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
