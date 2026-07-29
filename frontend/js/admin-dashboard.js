/**
 * Admin Dashboard View Logic
 * Handles data fetching, UI state rendering, and Chart.js integration
 */

let chartInstances = {};
let autoRefreshInterval = null;
let lastSummaryData = null;

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
        if (contentState.style.display === "none" || contentState.style.display === "") {
            loadingState.style.display = "flex";
            errorState.style.display = "none";
        } else {
            errorState.style.display = "none";
        }
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
            lastSummaryData = summaryResponse.data;
            renderDashboardStats(summaryResponse.data);
            renderDashboardCharts(chartsResponse.data, summaryResponse.data);

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
            const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const dateString = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
            renderDashboardCharts(chartsResponse.data, lastSummaryData);
        }
    } catch (e) {
        console.error("Failed to fetch dashboard charts:", e);
    }
}

const FEATURE_FRIENDLY_NAMES = {
    "AI_ASK": "AI Q&A",
    "AI_SUMMARY": "Summary",
    "AI_FLASHCARD": "Flashcards",
    "AI_QUIZ": "Quiz"
};

const CHART_COLOR_MAP = {
    // Document Approval Status
    "APPROVED": "#16a34a", // Green
    "PENDING": "#f59e0b",  // Amber/Orange
    "REJECTED": "#ef4444", // Red
    "PRIVATE": "#64748b",  // Gray

    // Account Tiers
    "FREE": "#64748b",     // Gray
    "PREMIUM": "#3b82f6",  // Blue
    "ULTRA": "#8b5cf6",    // Violet

    // AI Features
    "AI Q&A": "#6366f1",   // Indigo
    "Summary": "#3b82f6",  // Blue
    "Flashcards": "#8b5cf6",// Violet
    "Quiz": "#06b6d4"      // Cyan
};

function formatAdminRevenue(amount) {
    if (!amount || amount === 0) return "0 ₫";
    if (amount >= 1000000000) {
        return (amount / 1000000000).toFixed(2) + "B ₫";
    }
    if (amount >= 10000000) {
        return (amount / 1000000).toFixed(2) + "M ₫";
    }
    return amount.toLocaleString('vi-VN') + " ₫";
}

function renderDashboardStats(data) {
    document.getElementById("statTotalUsers").textContent = (data.totalUsers || 0).toLocaleString();
    document.getElementById("statTotalDocs").textContent = (data.totalDocuments || 0).toLocaleString();
    debugger;
    document.getElementById("statPendingDocs").textContent = (data.pendingPublicDocuments || 0).toLocaleString();
    document.getElementById("statAiRequests").textContent = (data.aiRequestsToday || 0).toLocaleString();

    const revenue = data.lifetimeRevenue || 0;
    document.getElementById("statTotalRevenue").textContent = formatAdminRevenue(revenue);

    const successPayments = data.allTimeSuccessfulPayments || 0;
    const successPaymentsEl = document.getElementById("statTotalSuccessPayments");
    if (successPaymentsEl) successPaymentsEl.textContent = `${successPayments.toLocaleString()} successful payments`;

    // Render Needs Attention Action Cards
    const needsAttSection = document.getElementById("needsAttentionSection");
    const needsAttList = document.getElementById("needsAttentionList");
    const needsAttTitle = document.getElementById("needsAttentionTitle");
    needsAttList.innerHTML = "";

    const needsInfo = data.needsAttention;
    if (needsInfo) {
        let cardsHtml = "";
        let count = 0;

        if (needsInfo.pendingPublicDocuments > 0) {
            count++;
            cardsHtml += `
                <div class="attention-card attention-card-danger">
                    <div class="attention-card-header">
                        <span class="attention-card-icon">📄</span>
                        <span class="attention-card-title">Pending public documents</span>
                    </div>
                    <div class="attention-card-body">
                        <span class="attention-card-count">${needsInfo.pendingPublicDocuments}</span>
                        <span class="attention-card-label">waiting for review</span>
                    </div>
                    <a href="admin-documents.html?filter=pending" class="attention-card-btn btn-outline-danger">Review now &rarr;</a>
                </div>
            `;
        }

        if (needsInfo.pendingSubjectRequests > 0) {
            count++;
            cardsHtml += `
                <div class="attention-card attention-card-warning">
                    <div class="attention-card-header">
                        <span class="attention-card-icon">🏷️</span>
                        <span class="attention-card-title">Subject requests</span>
                    </div>
                    <div class="attention-card-body">
                        <span class="attention-card-count">${needsInfo.pendingSubjectRequests}</span>
                        <span class="attention-card-label">pending requests</span>
                    </div>
                    <a href="admin-subject-requests.html" class="attention-card-btn btn-outline-warning">View requests &rarr;</a>
                </div>
            `;
        }

        if (needsInfo.failedPayments > 0) {
            count++;
            cardsHtml += `
                <div class="attention-card attention-card-danger">
                    <div class="attention-card-header">
                        <span class="attention-card-icon">💳</span>
                        <span class="attention-card-title">Failed payments</span>
                    </div>
                    <div class="attention-card-body">
                        <span class="attention-card-count">${needsInfo.failedPayments}</span>
                        <span class="attention-card-label">need checking</span>
                    </div>
                    <a href="admin-payments.html?filter=failed" class="attention-card-btn btn-outline-danger">View payments &rarr;</a>
                </div>
            `;
        }

        if (needsInfo.pendingReports > 0) {
            count++;
            cardsHtml += `
                <div class="attention-card attention-card-danger">
                    <div class="attention-card-header">
                        <span class="attention-card-icon">⚠️</span>
                        <span class="attention-card-title">Reported documents</span>
                    </div>
                    <div class="attention-card-body">
                        <span class="attention-card-count">${needsInfo.pendingReports}</span>
                        <span class="attention-card-label">pending reports</span>
                    </div>
                    <a href="admin-reports.html" class="attention-card-btn btn-outline-danger">Review reports &rarr;</a>
                </div>
            `;
        }

        if (count === 0) {
            if (needsAttTitle) {
                needsAttTitle.style.color = "var(--success, #16a34a)";
                needsAttTitle.textContent = "All Systems Clear";
            }
            needsAttList.innerHTML = `
                <div class="attention-card attention-card-success" style="grid-column: 1 / -1;">
                    <div style="display: flex; align-items: center; gap: 10px; color: var(--success, #16a34a); font-weight: 600;">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="20" width="20" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>All clear! No pending items require your attention right now.</span>
                    </div>
                </div>
            `;
        } else {
            if (needsAttTitle) {
                needsAttTitle.style.color = "var(--danger, #dc2626)";
                needsAttTitle.textContent = "Needs Attention";
            }
            needsAttList.innerHTML = cardsHtml;
        }
        needsAttSection.style.display = "block";
    } else {
        needsAttSection.style.display = "none";
    }
}

function renderDashboardCharts(data, summaryData = null) {
    // Clean up old instances if re-rendering
    Object.values(chartInstances).forEach(chart => chart.destroy());
    chartInstances = {};

    // 1. Users by Tier (Doughnut Chart)
    const usersByTier = data.userTierDistribution || [];
    renderChart("chartUsersByTier", "chartUsersByTierContainer", "doughnut", usersByTier, "tier", "count", ['#64748b', '#3b82f6', '#8b5cf6'], "No users found.");

    // 2. Document Approval Status (Pie Chart)
    const docsByStatus = data.documentApprovalStatus || [];
    renderChart("chartDocsByStatus", "chartDocsByStatusContainer", "pie", docsByStatus, "approvalStatus", "count", ['#f59e0b', '#16a34a', '#ef4444', '#64748b'], "No documents found.");

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
    renderChart("chartAiUsage", "chartAiUsageContainer", "bar", formattedAiUsage, "date", "count", ['#6366f1'], "No AI usage for selected period.");

    // 5. AI Feature Distribution (Doughnut Chart) - Friendly Labels
    if (summaryData) {
        const rawFeatures = summaryData.aiUsageByFeature || [];
        const aiFeatures = rawFeatures.map(item => ({
            ...item,
            feature: FEATURE_FRIENDLY_NAMES[item.feature] || item.feature
        }));
        renderChart("chartAiFeature", "chartAiFeatureContainer", "doughnut", aiFeatures, "feature", "count", ['#6366f1', '#3b82f6', '#8b5cf6', '#06b6d4'], "No AI usage data.");
    }
}

function renderChart(canvasId, containerId, type, dataArray, labelKey, dataKey, colors, emptyMessage = "No data available") {
    const container = document.getElementById(containerId);
    const canvas = document.getElementById(canvasId);

    // Fallback state if no data
    if (!dataArray || dataArray.length === 0 || ((type === 'pie' || type === 'doughnut') && dataArray.every(item => item[dataKey] === 0))) {
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

    const labels = dataArray.map(item => {
        const lbl = item[labelKey];
        const val = item[dataKey];
        return (type === 'doughnut' || type === 'pie') ? `${lbl} (${val})` : lbl;
    });
    const values = dataArray.map(item => item[dataKey]);

    const isDoughnut = type === 'doughnut';
    const isPie = type === 'pie';
    const isBar = type === 'bar';

    // Map exact colors from CHART_COLOR_MAP if defined, else fallback to passed colors array
    const computedColors = dataArray.map((item, idx) => {
        const rawLabel = String(item[labelKey] || "").trim();
        if (CHART_COLOR_MAP[rawLabel]) return CHART_COLOR_MAP[rawLabel];
        return colors[idx % colors.length];
    });

    const config = {
        type: type,
        data: {
            labels: labels,
            datasets: [{
                label: labelKey.toUpperCase(),
                data: values,
                backgroundColor: (context) => {
                    if (type === 'line') {
                        const chart = context.chart;
                        const { ctx, chartArea } = chart;
                        if (!chartArea) return colors[0] + '22';
                        const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                        gradient.addColorStop(0, colors[0] + '80');
                        gradient.addColorStop(1, colors[0] + '00');
                        return gradient;
                    }
                    return computedColors;
                },
                borderColor: type === 'line' ? colors[0] : (isDoughnut || isPie ? '#ffffff' : computedColors),
                borderWidth: isDoughnut || isPie ? 2 : (type === 'line' ? 3 : 0),
                borderRadius: isBar ? 6 : 0,
                fill: type === 'line',
                tension: 0.4,
                cutout: isDoughnut ? '70%' : undefined,
                pointBackgroundColor: '#ffffff',
                pointBorderColor: type === 'line' ? colors[0] : undefined,
                pointBorderWidth: 2,
                pointRadius: type === 'line' ? 4 : 0,
                pointHoverRadius: type === 'line' ? 6 : 0,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: isDoughnut || isPie,
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        padding: 20,
                        font: {
                            family: "'Inter', sans-serif",
                            size: 12
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleFont: { family: "'Inter', sans-serif", size: 13 },
                    bodyFont: { family: "'Inter', sans-serif", size: 13 },
                    padding: 12,
                    cornerRadius: 8,
                    displayColors: true
                }
            },
            scales: (isDoughnut || isPie) ? {} : {
                x: {
                    grid: { display: false },
                    ticks: { font: { family: "'Inter', sans-serif" } }
                },
                y: {
                    border: { display: false },
                    grid: { color: 'rgba(0, 0, 0, 0.04)' },
                    ticks: {
                        font: { family: "'Inter', sans-serif" },
                        callback: function (value) {
                            if (value >= 1000000) {
                                return (value / 1000000).toFixed(value % 1000000 === 0 ? 0 : 1) + 'M';
                            } else if (value >= 1000) {
                                return (value / 1000).toFixed(value % 1000 === 0 ? 0 : 1) + 'K';
                            }
                            return value;
                        }
                    }
                }
            }
        },
        plugins: [{
            id: 'centerText',
            beforeDraw: function (chart) {
                if (chart.config.type !== 'doughnut') return;
                const ctx = chart.ctx;
                const width = chart.width;
                const height = chart.height;

                ctx.restore();

                const dataLabels = chart.config.data.labels || [];
                const dataValues = chart.config.data.datasets[0].data || [];
                let total = 0;
                let targetValue = 0;
                let targetLabel = "";

                for (let i = 0; i < dataValues.length; i++) {
                    total += dataValues[i];
                    // Find a tier to highlight, normally "PRO" or "PREMIUM"
                    if (dataLabels[i].toUpperCase().includes('PRO') || dataLabels[i].toUpperCase().includes('PREMIUM')) {
                        targetValue = dataValues[i];
                        targetLabel = dataLabels[i].split(' ')[0].toUpperCase();
                    }
                }

                // If not found, just use the largest
                if (targetValue === 0 && dataValues.length > 0) {
                    targetValue = Math.max(...dataValues);
                    const index = dataValues.indexOf(targetValue);
                    targetLabel = dataLabels[index] ? dataLabels[index].split(' ')[0].toUpperCase() : "TOTAL";
                }

                const percent = total > 0 ? Math.round((targetValue / total) * 100) : 0;
                const text1 = targetLabel + (targetLabel === "TOTAL" ? "" : " TIER");
                const text2 = percent + "%";

                const centerX = (chart.chartArea.left + chart.chartArea.right) / 2;
                const centerY = (chart.chartArea.top + chart.chartArea.bottom) / 2;

                const isDark = document.documentElement.dataset.theme === 'dark';

                ctx.textAlign = "center";
                ctx.textBaseline = "middle";

                ctx.font = "600 11px Inter, sans-serif";
                ctx.fillStyle = isDark ? "#94a3b8" : "rgba(100, 116, 139, 0.8)";
                ctx.fillText(text1, centerX, centerY - 12);

                ctx.font = "bold 26px Inter, sans-serif";
                ctx.fillStyle = isDark ? "#f8fafc" : "#1e293b";
                ctx.fillText(text2, centerX, centerY + 10);

                ctx.save();
            }
        }]
    };

    chartInstances[canvasId] = new Chart(canvas, config);
}


// Handle Dark Mode for Charts
window.addEventListener('themeChanged', (e) => {
    if (typeof Chart === 'undefined' || typeof chartInstances === 'undefined') return;

    const isDark = e.detail.theme === 'dark';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.04)';
    const textColor = isDark ? '#94a3b8' : '#64748b';

    Chart.defaults.color = textColor;
    Chart.defaults.borderColor = gridColor;

    for (const id in chartInstances) {
        const chart = chartInstances[id];
        if (chart.options.scales && chart.options.scales.x) {
            if (chart.options.scales.x.ticks) chart.options.scales.x.ticks.color = textColor;
            if (chart.options.scales.y && chart.options.scales.y.ticks) chart.options.scales.y.ticks.color = textColor;
            if (chart.options.scales.y && chart.options.scales.y.grid) chart.options.scales.y.grid.color = gridColor;
        }
        chart.update();
    }
});

// Initial application if loaded in dark mode
if (document.documentElement.dataset.theme === 'dark' && typeof Chart !== 'undefined') {
    Chart.defaults.color = '#94a3b8';
    Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.1)';
}