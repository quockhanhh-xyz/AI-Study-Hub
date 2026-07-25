document.addEventListener("DOMContentLoaded", async function () {
  // Wait for layout.js auth guard to finish verifying user
  if (window.authReady) {
    const isAuthenticated = await window.authReady;
    if (!isAuthenticated) return;
  }

  // State
  let currentPage = 0;
  const pageSize = 10;
  let totalPages = 0;

  // Elements
  const statusFilter = document.getElementById("statusFilter");
  const reasonFilter = document.getElementById("reasonFilter");
  const searchInput = document.getElementById("searchInput");
  const clearFiltersBtn = document.getElementById("clearFiltersBtn");
  const exportBtn = document.getElementById("exportBtn");
  const exportBtnText = document.getElementById("exportBtnText");

  const reportsTableBody = document.getElementById("reportsTableBody");
  const reportsLoadingState = document.getElementById("reportsLoadingState");
  const reportsErrorState = document.getElementById("reportsErrorState");
  const reportsErrorMessage = document.getElementById("reportsErrorMessage");
  const reportsContent = document.getElementById("reportsContent");

  const prevPageBtn = document.getElementById("prevPageBtn");
  const nextPageBtn = document.getElementById("nextPageBtn");
  const paginationInfo = document.getElementById("paginationInfo");

  const actionReportModal = document.getElementById("actionReportModal");
  const actionModalTitle = document.getElementById("actionModalTitle");
  const actionModalSubtitle = document.getElementById("actionModalSubtitle");
  const actionReportId = document.getElementById("actionReportId");
  const actionType = document.getElementById("actionType");
  const resolutionNoteInput = document.getElementById("resolutionNoteInput");
  const actionModalError = document.getElementById("actionModalError");
  const cancelActionBtn = document.getElementById("cancelActionBtn");
  const confirmActionBtn = document.getElementById("confirmActionBtn");

  // Init
  init();

  function init() {
    if (typeof renderNavigation === "function") {
      renderNavigation();
    }

    // Status Filter listener
    if (statusFilter) {
      statusFilter.addEventListener("change", () => {
        currentPage = 0;
        updateFiltersUI();
        loadReports();
      });
    }

    // Reason Filter listener
    if (reasonFilter) {
      reasonFilter.addEventListener("change", () => {
        currentPage = 0;
        updateFiltersUI();
        loadReports();
      });
    }

    // Search Input listener
    if (searchInput) {
      let timeout = null;
      searchInput.addEventListener("input", () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          currentPage = 0;
          updateFiltersUI();
          loadReports();
        }, 300);
      });
    }

    // Export Excel listener
    if (exportBtn) {
      exportBtn.addEventListener("click", handleExportExcel);
    }

    // Pagination Listeners
    if (prevPageBtn) {
      prevPageBtn.addEventListener("click", () => {
        if (currentPage > 0) {
          currentPage--;
          loadReports();
        }
      });
    }

    if (nextPageBtn) {
      nextPageBtn.addEventListener("click", () => {
        if (currentPage < totalPages - 1) {
          currentPage++;
          loadReports();
        }
      });
    }

    // Modal listeners
    if (cancelActionBtn) {
      cancelActionBtn.addEventListener("click", () => {
        actionReportModal.classList.remove("active");
      });
    }

    if (confirmActionBtn) {
      confirmActionBtn.addEventListener("click", handleModalConfirm);
    }

    loadReports();
  }

  // Clear filters function
  window.clearFilters = function () {
    if (statusFilter) statusFilter.value = "";
    if (reasonFilter) reasonFilter.value = "";
    if (searchInput) searchInput.value = "";
    currentPage = 0;
    updateFiltersUI();
    loadReports();
  };

  function updateFiltersUI() {
    const hasFilters = (statusFilter && statusFilter.value) ||
                       (reasonFilter && reasonFilter.value) ||
                       (searchInput && searchInput.value.trim());
    if (clearFiltersBtn) {
      clearFiltersBtn.style.display = hasFilters ? "inline-flex" : "none";
    }
    if (exportBtnText) {
      exportBtnText.textContent = hasFilters ? "Export filtered reports" : "Export all reports";
    }
  }

  async function handleExportExcel() {
    if (!exportBtn) return;
    const statusVal = statusFilter ? statusFilter.value : "";
    const reasonVal = reasonFilter ? reasonFilter.value : "";
    const searchVal = searchInput ? searchInput.value.trim() : "";

    try {
      exportBtn.disabled = true;
      const originalText = exportBtnText.textContent;
      exportBtnText.textContent = "Exporting...";

      await exportAdminReports({
        status: statusVal,
        reason: reasonVal,
        search: searchVal
      });

      exportBtnText.textContent = originalText;
      exportBtn.disabled = false;
    } catch (err) {
      console.error("Export failed", err);
      if (typeof showToast === "function") showToast("Failed to export Excel file.", "error");
      exportBtn.disabled = false;
      updateFiltersUI();
    }
  }

  async function loadReportStats() {
    try {
      const searchVal = searchInput ? searchInput.value.trim() : "";
      const reasonVal = reasonFilter ? reasonFilter.value : "";
      const statusVal = statusFilter ? statusFilter.value : "";
      const params = new URLSearchParams();
      if (searchVal) params.append("search", searchVal);
      if (reasonVal) params.append("reason", reasonVal);
      // Don't pass status to stats so totals remain globally accurate per reason/search
      const queryString = params.toString() ? `?${params.toString()}` : "";

      const res = await get(`/api/admin/document-reports/stats${queryString}`, { skipUnauthorizedRedirect: true });
      if (res && res.success) {
        const stats = res.data;
        document.getElementById("cardTotalReports").textContent = stats.total || 0;
        document.getElementById("cardPendingReports").textContent = stats.pending || 0;
        document.getElementById("cardResolvedReports").textContent = stats.resolved || 0;
        document.getElementById("cardDismissedReports").textContent = stats.dismissed || 0;
      }
    } catch (err) {
      console.error("Failed to load report stats", err);
    }
  }

  async function loadReports() {
    reportsLoadingState.style.display = "flex";
    reportsErrorState.style.display = "none";
    reportsContent.style.display = "none";

    const statusVal = statusFilter ? statusFilter.value : "";
    const reasonVal = reasonFilter ? reasonFilter.value : "";
    const searchVal = searchInput ? searchInput.value.trim() : "";

    // Load stats in parallel
    loadReportStats();

    try {
      const res = await getAdminReports(statusVal, reasonVal, searchVal, currentPage, pageSize);
      if (res && res.success) {
        reportsLoadingState.style.display = "none";
        reportsContent.style.display = "block";

        const data = res.data;
        const reports = data ? data.content || [] : [];
        totalPages = data ? data.totalPages || 0 : 0;
        const totalElements = data ? data.totalElements || 0 : 0;

        renderReportsTable(reports);
        updatePagination(totalElements);
      } else {
        throw new Error(res.message || "Failed to retrieve reports.");
      }
    } catch (err) {
      reportsLoadingState.style.display = "none";
      reportsErrorState.style.display = "flex";
      reportsErrorMessage.textContent = err.message || "Failed to load violation reports.";
    }
  }

  function renderReportsTable(reports) {
    reportsTableBody.innerHTML = "";

    if (reports.length === 0) {
      reportsTableBody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 30px; color: var(--text-muted);">
            No violation reports found matching current status/search filters.
          </td>
        </tr>
      `;
      return;
    }

    reports.forEach(r => {
      const tr = document.createElement("tr");

      // ID column (centered)
      const idTd = document.createElement("td");
      idTd.textContent = `#${r.reportId}`;
      idTd.style.fontWeight = "600";
      idTd.style.textAlign = "center";

      // Document Title column (centered)
      const docTd = document.createElement("td");
      docTd.style.textAlign = "center";
      if (r.documentId) {
        const a = document.createElement("a");
        a.href = `admin-document-detail.html?id=${r.documentId}`;
        a.style.color = "#f97316"; // Beautiful soft orange
        a.style.fontSize = "13px"; // Slightly smaller for better balance
        a.style.fontWeight = "500";
        a.style.textDecoration = "none";
        a.textContent = r.documentTitle || `Doc ID: ${r.documentId}`;
        a.addEventListener("mouseenter", () => { a.style.textDecoration = "underline"; });
        a.addEventListener("mouseleave", () => { a.style.textDecoration = "none"; });
        docTd.appendChild(a);
      } else {
        docTd.textContent = "Deleted Document";
        docTd.style.color = "var(--text-muted)";
      }

      // Reporter info column (centered)
      const reporterTd = document.createElement("td");
      reporterTd.style.textAlign = "center";
      reporterTd.innerHTML = `
        <div style="font-weight:600;">${escapeHtml(r.reporterName || "Unknown")}</div>
        <div style="font-size:0.75rem; color:var(--text-muted);">${escapeHtml(r.reporterEmail || "")}</div>
      `;

      // Reason column (centered with badges)
      const reasonTd = document.createElement("td");
      reasonTd.style.textAlign = "center";
      const reasonBadge = document.createElement("span");
      const reasonUpper = (r.reason || "OTHER").toUpperCase();
      reasonBadge.textContent = reasonUpper;
      
      let reasonClass = "reason-other";
      if (reasonUpper === "SPAM") reasonClass = "reason-spam";
      else if (reasonUpper === "COPYRIGHT") reasonClass = "reason-copyright";
      else if (reasonUpper === "INAPPROPRIATE_CONTENT" || reasonUpper === "INAPPROPRIATE") reasonClass = "reason-inappropriate";
      else if (reasonUpper === "DUPLICATE_CONTENT" || reasonUpper === "DUPLICATE") reasonClass = "reason-duplicate";
      
      reasonBadge.className = `reason-badge ${reasonClass}`;
      reasonTd.appendChild(reasonBadge);

      // Description column (centered)
      const descTd = document.createElement("td");
      descTd.style.textAlign = "center";
      descTd.textContent = r.description || "–";
      descTd.style.maxWidth = "200px";
      descTd.style.overflow = "hidden";
      descTd.style.textOverflow = "ellipsis";
      descTd.style.whiteSpace = "nowrap";
      if (r.description) {
        descTd.title = r.description;
      }

      // Status column (centered)
      const statusTd = document.createElement("td");
      statusTd.style.textAlign = "center";
      const badge = document.createElement("span");
      const statusLower = (r.status || "PENDING").toLowerCase();
      badge.className = `status-badge badge-${statusLower}`;
      badge.textContent = r.status || "PENDING";
      statusTd.appendChild(badge);

      // Date column (centered)
      const dateTd = document.createElement("td");
      dateTd.style.textAlign = "center";
      dateTd.textContent = r.createdAt ? formatDate(r.createdAt) : "–";

      // Actions column (centered & aligned cleanly)
      const actionsTd = document.createElement("td");
      actionsTd.style.textAlign = "center";
      actionsTd.style.verticalAlign = "middle";
      
      if (r.status === "PENDING") {
        const actionGroup = document.createElement("div");
        actionGroup.className = "admin-action-group";

        const resolveBtn = document.createElement("button");
        resolveBtn.className = "btn btn-sm btn-primary";
        resolveBtn.textContent = "Resolve";
        resolveBtn.addEventListener("click", () => openActionModal(r.reportId, "resolve"));

        const dismissBtn = document.createElement("button");
        dismissBtn.className = "btn btn-sm btn-outline";
        dismissBtn.textContent = "Dismiss";
        dismissBtn.addEventListener("click", () => openActionModal(r.reportId, "dismiss"));

        actionGroup.append(resolveBtn, dismissBtn);
        actionsTd.appendChild(actionGroup);
      } else {
        actionsTd.innerHTML = `
          <div style="font-size: 11px; line-height: 1.35; color: var(--text-muted); display: inline-block; text-align: center;">
            <div style="font-weight: 500; color: var(--text-muted);">Resolved by: <span style="font-weight: 600; color: var(--text-main);">${escapeHtml(r.resolvedByName || "Admin")}</span></div>
            <div style="color: var(--text-muted); max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 2px;" title="${escapeHtml(r.resolutionNote || '')}">
              Note: ${escapeHtml(r.resolutionNote || 'N/A')}
            </div>
          </div>
        `;
      }

      tr.append(idTd, docTd, reporterTd, reasonTd, descTd, statusTd, dateTd, actionsTd);
      reportsTableBody.appendChild(tr);
    });
  }

  function updatePagination(totalElements) {
    const paginationContainer = document.getElementById("pagination");
    if (!paginationContainer) return;

    if (totalElements === 0) {
      paginationContainer.innerHTML = '';
      return;
    }

    const start = totalElements === 0 ? 0 : currentPage * pageSize + 1;
    const end = Math.min((currentPage + 1) * pageSize, totalElements);

    let html = `<span class="admin-pagination-info">Showing ${start} - ${end} of ${totalElements} entries</span><div style="display: flex; gap: 4px;">`;
    for (let i = 0; i < totalPages; i++) {
        html += `<button class="admin-pagination-btn ${i === currentPage ? 'active' : ''}" onclick="window.goToPage(${i})">${i + 1}</button>`;
    }
    html += `</div>`;
    paginationContainer.innerHTML = html;
  }

  window.goToPage = (page) => {
    currentPage = page;
    loadReports();
  };

  function openActionModal(reportId, type) {
    actionReportId.value = reportId;
    actionType.value = type;
    resolutionNoteInput.value = "";
    actionModalError.style.display = "none";

    if (type === "resolve") {
      actionModalTitle.textContent = "Resolve Violation Report";
      actionModalSubtitle.textContent = "Confirming this action will mark the report as resolved and unpublish (hide) the associated document from the Community Library.";
      confirmActionBtn.textContent = "Resolve & Unpublish";
      confirmActionBtn.className = "btn btn-primary";
      confirmActionBtn.style.backgroundColor = "var(--danger)";
      confirmActionBtn.style.borderColor = "var(--danger)";
    } else {
      actionModalTitle.textContent = "Dismiss Violation Report";
      actionModalSubtitle.textContent = "Dismissing this report means no violation was found. The document will remain active in the Community Library.";
      confirmActionBtn.textContent = "Dismiss Report";
      confirmActionBtn.className = "btn btn-outline";
      confirmActionBtn.style.backgroundColor = "";
      confirmActionBtn.style.borderColor = "";
    }

    actionReportModal.classList.add("active");
  }

  async function handleModalConfirm() {
    const id = actionReportId.value;
    const type = actionType.value;
    const note = resolutionNoteInput.value.trim();

    if (!note) {
      actionModalError.textContent = "Resolution note is required.";
      actionModalError.style.display = "block";
      return;
    }

    try {
      let res;
      if (type === "resolve") {
        res = await resolveReport(id, note);
      } else {
        res = await dismissReport(id, note);
      }

      if (res && res.success) {
        actionReportModal.classList.remove("active");
        if (typeof showToast === "function") showToast("Report action completed successfully.", "success");
        loadReports();
      } else {
        actionModalError.textContent = res.message || "Operation failed.";
        actionModalError.style.display = "block";
      }
    } catch (err) {
      actionModalError.textContent = err.message || "Operation failed.";
      actionModalError.style.display = "block";
    }
  }

  function formatDate(dateStr) {
    if (!dateStr) return "–";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric"
      });
    } catch (e) {
      return dateStr;
    }
  }

  // Simple escaping function to prevent XSS
  function escapeHtml(str) {
    if (!str) return "";
    return str.toString()
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
});
