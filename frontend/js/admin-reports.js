document.addEventListener("DOMContentLoaded", async function () {
  // Check Authentication & Admin status
  if (window.authReady) {
    const isAuthenticated = await window.authReady;
    if (!isAuthenticated) return;
  }

  const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
  if (currentUser.role !== "ADMIN") {
    window.location.href = "dashboard.html";
    return;
  }

  // State
  let currentPage = 0;
  const pageSize = 10;
  let totalPages = 0;

  // Elements
  const statusFilter = document.getElementById("statusFilter");
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
        loadReports();
      });
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

  async function loadReports() {
    reportsLoadingState.style.display = "flex";
    reportsErrorState.style.display = "none";
    reportsContent.style.display = "none";

    const statusVal = statusFilter ? statusFilter.value : "";

    try {
      const res = await getAdminReports(statusVal, currentPage, pageSize);
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
            No violation reports found matching current status filter.
          </td>
        </tr>
      `;
      return;
    }

    reports.forEach(r => {
      const tr = document.createElement("tr");

      // ID column
      const idTd = document.createElement("td");
      idTd.textContent = `#${r.reportId}`;
      idTd.style.fontWeight = "600";

      // Document Title column
      const docTd = document.createElement("td");
      if (r.documentId) {
        const a = document.createElement("a");
        a.href = `admin-document-detail.html?id=${r.documentId}`;
        a.style.color = "var(--primary)";
        a.style.fontWeight = "600";
        a.textContent = r.documentTitle || `Doc ID: ${r.documentId}`;
        docTd.appendChild(a);
      } else {
        docTd.textContent = "Deleted Document";
        docTd.style.color = "var(--text-muted)";
      }

      // Reporter info column
      const reporterTd = document.createElement("td");
      reporterTd.innerHTML = `
        <div style="font-weight:600;">${r.reporterName || "Unknown"}</div>
        <div style="font-size:0.75rem; color:var(--text-muted);">${r.reporterEmail || ""}</div>
      `;

      // Reason column
      const reasonTd = document.createElement("td");
      reasonTd.textContent = r.reason || "OTHER";

      // Description column
      const descTd = document.createElement("td");
      descTd.textContent = r.description || "–";
      descTd.style.maxWidth = "200px";
      descTd.style.overflow = "hidden";
      descTd.style.textOverflow = "ellipsis";
      descTd.style.whiteSpace = "nowrap";
      if (r.description) {
        descTd.title = r.description;
      }

      // Status column
      const statusTd = document.createElement("td");
      const badge = document.createElement("span");
      const statusLower = (r.status || "PENDING").toLowerCase();
      badge.className = `status-badge badge-${statusLower}`;
      badge.textContent = r.status || "PENDING";
      statusTd.appendChild(badge);

      // Date column
      const dateTd = document.createElement("td");
      dateTd.textContent = r.createdAt ? formatDate(r.createdAt) : "–";

      // Actions column
      const actionsTd = document.createElement("td");
      if (r.status === "PENDING") {
        const resolveBtn = document.createElement("button");
        resolveBtn.className = "btn btn-primary btn-sm";
        resolveBtn.textContent = "Resolve";
        resolveBtn.style.marginRight = "6px";
        resolveBtn.style.padding = "4px 8px";
        resolveBtn.style.fontSize = "11px";
        resolveBtn.addEventListener("click", () => openActionModal(r.reportId, "resolve"));

        const dismissBtn = document.createElement("button");
        dismissBtn.className = "btn btn-outline btn-sm";
        dismissBtn.textContent = "Dismiss";
        dismissBtn.style.padding = "4px 8px";
        dismissBtn.style.fontSize = "11px";
        dismissBtn.addEventListener("click", () => openActionModal(r.reportId, "dismiss"));

        actionsTd.append(resolveBtn, dismissBtn);
      } else {
        actionsTd.innerHTML = `
          <div style="font-size: 0.8rem;">Resolved by: <span style="font-weight:600;">${r.resolvedByName || "Admin"}</span></div>
          <div style="font-size: 0.75rem; color: var(--text-muted); max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${r.resolutionNote || ''}">
            Note: ${r.resolutionNote || 'N/A'}
          </div>
        `;
      }

      tr.append(idTd, docTd, reporterTd, reasonTd, descTd, statusTd, dateTd, actionsTd);
      reportsTableBody.appendChild(tr);
    });
  }

  function updatePagination(totalElements) {
    if (totalPages <= 1) {
      prevPageBtn.disabled = true;
      nextPageBtn.disabled = true;
    } else {
      prevPageBtn.disabled = currentPage === 0;
      nextPageBtn.disabled = currentPage === totalPages - 1;
    }

    const start = totalElements === 0 ? 0 : currentPage * pageSize + 1;
    const end = Math.min((currentPage + 1) * pageSize, totalElements);
    paginationInfo.textContent = `Showing ${start}-${end} of ${totalElements} entries`;
  }

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
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (e) {
      return dateStr;
    }
  }
});
