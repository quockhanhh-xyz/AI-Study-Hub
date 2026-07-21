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

function renderDashboardCharts(data, summaryData = null) {
    // Clean up old instances if re-rendering
    Object.values(chartInstances).forEach(chart => chart.destroy());
    chartInstances = {};

    // 1. Users by Tier (Doughnut Chart)
    const usersByTier = data.userTierDistribution || [];
    renderChart("chartUsersByTier", "chartUsersByTierContainer", "doughnut", usersByTier, "tier", "count", ['#3b82f6', '#8b5cf6', '#ec4899'], "No users found.");

    // 2. Documents by Status (Pie Chart)
    const docsByStatus = data.documentApprovalStatus || [];
    renderChart("chartDocsByStatus", "chartDocsByStatusContainer", "pie", docsByStatus, "approvalStatus", "count", ['#f59e0b', '#16a34a', '#ff5858', '#9ca3af'], "No documents found.");

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

    // 5. AI Feature Distribution (Doughnut Chart)
    if (summaryData) {
        const aiFeatures = summaryData.aiUsageByFeature || [];
        renderChart("chartAiFeature", "chartAiFeatureContainer", "doughnut", aiFeatures, "feature", "count", ['#ec4899', '#f59e0b', '#3b82f6', '#10b981'], "No AI usage data.");
    }
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

    const labels = dataArray.map(item => {
        const lbl = item[labelKey];
        const val = item[dataKey];
        return (type === 'doughnut' || type === 'pie') ? `${lbl} (${val})` : lbl;
    });
    const values = dataArray.map(item => item[dataKey]);

    const isDoughnut = type === 'doughnut';
    const isPie = type === 'pie';
    const isBar = type === 'bar';

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
                        const {ctx, chartArea} = chart;
                        if (!chartArea) return colors[0] + '22';
                        const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                        // Convert hex to rgb for gradient if possible, but hex with alpha works in modern browsers
                        gradient.addColorStop(0, colors[0] + '80'); // 50% opacity at top
                        gradient.addColorStop(1, colors[0] + '00'); // 0% opacity at bottom
                        return gradient;
                    }
                    return colors;
                },
                borderColor: type === 'line' ? colors[0] : (isDoughnut || isPie ? '#ffffff' : colors),
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
                        callback: function(value) {
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
            beforeDraw: function(chart) {
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

                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                
                ctx.font = "600 11px Inter, sans-serif";
                ctx.fillStyle = "rgba(100, 116, 139, 0.8)";
                ctx.fillText(text1, centerX, centerY - 12);

                ctx.font = "bold 26px Inter, sans-serif";
                ctx.fillStyle = "#1e293b";
                ctx.fillText(text2, centerX, centerY + 10);

                ctx.save();
            }
        }]
    };

    chartInstances[canvasId] = new Chart(canvas, config);
}
