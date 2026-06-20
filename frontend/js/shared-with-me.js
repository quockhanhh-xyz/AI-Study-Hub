/**
 * Shared With Me UI controller for AI Study Hub.
 * Handles: list direct shared documents.
 * Relies on share-api.js; never uses raw fetch directly.
 */

document.addEventListener("DOMContentLoaded", async function () {
  const sharedLoader = document.getElementById("sharedLoader");
  const sharedError = document.getElementById("sharedError");
  const sharedGrid = document.getElementById("sharedGrid");
  const sharedEmpty = document.getElementById("sharedEmpty");

  function showError(message) {
    sharedError.textContent = message;
    sharedError.style.display = "block";
  }

  function hideError() {
    sharedError.textContent = "";
    sharedError.style.display = "none";
  }

  function formatFileSize(bytes) {
    if (!bytes) return "–";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  function formatDate(isoString) {
    if (!isoString) return "–";
    const d = new Date(isoString);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  }

  function createDocCard(doc) {
    const card = document.createElement("article");
    card.className = "document-card";

    const header = document.createElement("div");
    header.className = "document-card-header";

    const badge = document.createElement("span");
    badge.className = "document-type-badge";
    badge.textContent = (doc.fileType || "FILE").toUpperCase();

    const titleEl = document.createElement("h3");
    titleEl.textContent = doc.title || "Untitled Document";

    header.append(badge, titleEl);

    const desc = document.createElement("p");
    desc.className = "document-description";
    desc.textContent = `Shared by: ${doc.sharedByEmail}`;

    const meta = document.createElement("p");
    meta.className = "helper-text";
    meta.style.fontSize = "12px";
    meta.style.color = "var(--muted)";
    meta.style.marginTop = "8px";
    meta.textContent = `Size: ${formatFileSize(doc.fileSize)} · Shared: ${formatDate(doc.createdAt)}`;

    const actions = document.createElement("div");
    actions.className = "document-actions";

    if (doc.fileUrl) {
      const viewBtn = document.createElement("a");
      viewBtn.href = doc.fileUrl;
      viewBtn.target = "_blank";
      viewBtn.rel = "noopener noreferrer";
      viewBtn.className = "btn btn-primary document-detail-btn";
      viewBtn.textContent = "Open";
      actions.appendChild(viewBtn);

      const downloadBtn = document.createElement("a");
      downloadBtn.href = doc.fileUrl;
      downloadBtn.target = "_blank";
      downloadBtn.rel = "noopener noreferrer";
      downloadBtn.download = doc.title || doc.documentId;
      downloadBtn.className = "btn btn-secondary";
      downloadBtn.textContent = "Download";
      actions.appendChild(downloadBtn);
    }

    card.append(header, desc, meta, actions);
    return card;
  }

  async function loadSharedDocuments() {
    sharedLoader.style.display = "flex";
    sharedGrid.style.display = "none";
    sharedEmpty.style.display = "none";
    hideError();

    try {
      const result = await getSharedWithMe();
      const docs = Array.isArray(result.data) ? result.data : [];

      sharedLoader.style.display = "none";

      if (docs.length === 0) {
        sharedEmpty.style.display = "block";
        return;
      }

      sharedGrid.innerHTML = "";
      docs.forEach(function (doc) {
        sharedGrid.appendChild(createDocCard(doc));
      });
      sharedGrid.style.display = "grid";

    } catch (error) {
      sharedLoader.style.display = "none";
      showError(error.message || "Failed to load shared documents.");
    }
  }

  await loadSharedDocuments();
});
