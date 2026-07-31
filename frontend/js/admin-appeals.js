document.addEventListener("DOMContentLoaded", async () => {
  // Verify admin access
  if (window.authReady) {
    const isAuthenticated = await window.authReady;
    if (!isAuthenticated) return;
  }
  const userStr = localStorage.getItem("currentUser");
  if (userStr) {
    const user = JSON.parse(userStr);
    if (user.role !== "ADMIN" && user.role !== "ROLE_ADMIN") {
      window.location.href = "dashboard.html";
      return;
    }
  } else {
    window.location.href = "login.html";
    return;
  }

  // DOM Elements
  const loadingState = document.getElementById("appealsLoadingState");
  const errorState = document.getElementById("appealsErrorState");
  const contentState = document.getElementById("appealsContent");
  const tableBody = document.getElementById("appealsTableBody");
  const emptyState = document.getElementById("appealsEmptyState");

  // Modal Elements
  const respondModal = document.getElementById("respondModal");
  const closeRespondBtn = document.getElementById("closeRespondModalBtn");
  const cancelRespondBtn = document.getElementById("cancelRespondBtn");
  const respondForm = document.getElementById("respondForm");
  const adminReplyText = document.getElementById("adminReplyText");

  const modalSenderName = document.getElementById("modalSenderName");
  const modalSenderEmail = document.getElementById("modalSenderEmail");
  const modalSenderMessage = document.getElementById("modalSenderMessage");

  let currentAppealId = null;

  // Load Appeals List
  window.loadAppeals = async function () {
    loadingState.style.display = "flex";
    errorState.style.display = "none";
    contentState.style.display = "none";

    try {
      const appeals = await get("/api/admin/appeals");
      loadingState.style.display = "none";
      contentState.style.display = "block";

      renderAppeals(appeals);
    } catch (error) {
      console.error("Failed to load appeals:", error);
      loadingState.style.display = "none";
      errorState.style.display = "flex";
      document.getElementById("appealsErrorMessage").textContent = error.message || "Failed to load appeals.";
    }
  };

  function renderAppeals(appeals) {
    const total = appeals ? appeals.length : 0;
    const pending = appeals ? appeals.filter(a => a.status === 'PENDING').length : 0;
    const resolved = appeals ? appeals.filter(a => a.status === 'RESOLVED').length : 0;
    const rate = total > 0 ? Math.round((resolved / total) * 100) + '%' : '0%';

    document.getElementById("summaryTotalAppeals").textContent = total;
    document.getElementById("summaryPendingAppeals").textContent = pending;
    document.getElementById("summaryResolvedAppeals").textContent = resolved;
    document.getElementById("summaryResolveRate").textContent = rate;

    tableBody.innerHTML = "";
    if (!appeals || appeals.length === 0) {
      emptyState.style.display = "block";
      return;
    }
    emptyState.style.display = "none";

    appeals.forEach(appeal => {
      const tr = document.createElement("tr");

      const dateCell = document.createElement("td");
      dateCell.textContent = formatDate(appeal.createdAt);

      const nameCell = document.createElement("td");
      nameCell.textContent = appeal.fullName;

      const emailCell = document.createElement("td");
      emailCell.textContent = appeal.email;

      const messageCell = document.createElement("td");
      messageCell.style.maxWidth = "280px";
      messageCell.style.overflow = "hidden";
      messageCell.style.textOverflow = "ellipsis";
      messageCell.style.whiteSpace = "nowrap";
      messageCell.textContent = appeal.message;
      messageCell.title = appeal.message;

      const statusCell = document.createElement("td");
      const isResolved = appeal.status === "RESOLVED";
      statusCell.innerHTML = `<span class="status-badge ${isResolved ? 'approved' : 'pending'}">${appeal.status}</span>`;

      const actionsCell = document.createElement("td");
      if (!isResolved) {
        const respondBtn = document.createElement("button");
        respondBtn.type = "button";
        respondBtn.className = "btn btn-sm btn-primary";
        respondBtn.style.padding = "4px 10px";
        respondBtn.style.fontSize = "12px";
        respondBtn.style.width = "auto";
        respondBtn.textContent = "Respond";
        respondBtn.addEventListener("click", () => openRespondModal(appeal));
        actionsCell.appendChild(respondBtn);
      } else {
        actionsCell.innerHTML = `<span style="color: var(--text-muted); font-size: 13px;">Responded</span>`;
      }

      tr.appendChild(dateCell);
      tr.appendChild(nameCell);
      tr.appendChild(emailCell);
      tr.appendChild(messageCell);
      tr.appendChild(statusCell);
      tr.appendChild(actionsCell);

      tableBody.appendChild(tr);
    });
  }

  function openRespondModal(appeal) {
    currentAppealId = appeal.appealId;
    modalSenderName.textContent = appeal.fullName;
    modalSenderEmail.textContent = appeal.email;
    modalSenderMessage.textContent = appeal.message;
    adminReplyText.value = "";
    respondModal.style.display = "flex";
  }

  function closeRespondModal() {
    respondModal.style.display = "none";
    currentAppealId = null;
  }

  if (closeRespondBtn) closeRespondBtn.addEventListener("click", closeRespondModal);
  if (cancelRespondBtn) cancelRespondBtn.addEventListener("click", closeRespondModal);

  if (respondForm) {
    respondForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const adminReply = adminReplyText.value.trim();
      const submitBtn = respondForm.querySelector('button[type="submit"]');

      if (!adminReply || !currentAppealId) return;

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Sending Email...";
      }

      try {
        const response = await post(`/api/admin/appeals/${currentAppealId}/respond`, { adminReply });
        if (typeof window.showToast === "function") {
          window.showToast(response.message || "Response email sent successfully.", "success");
        } else {
          alert(response.message || "Response email sent successfully.");
        }
        closeRespondModal();
        loadAppeals();
      } catch (error) {
        console.error("Failed to respond to appeal:", error);
        if (typeof window.showToast === "function") {
          window.showToast(error.message || "Failed to send email response.", "error");
        } else {
          alert(error.message || "Failed to send email response.");
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = "Send Email Response";
        }
      }
    });
  }

  // Format Helper
  function formatDate(isoString) {
    if (!isoString) return "";
    const date = new Date(isoString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  // Initial Load
  loadAppeals();
});
