/**
 * Shared With Me UI controller for AI Study Hub.
 * Handles: list direct shared documents and folders.
 * Relies on share-api.js and folder-share-api.js; never uses raw fetch directly.
 */

document.addEventListener("DOMContentLoaded", async function () {
  const sharedLoader = document.getElementById("sharedLoader");
  const sharedError = document.getElementById("sharedError");
  const sharedGrid = document.getElementById("sharedGrid");
  const sharedEmpty = document.getElementById("sharedEmpty");

  const folderLoader = document.getElementById("folderLoader");
  const folderError = document.getElementById("folderError");
  const folderGrid = document.getElementById("folderGrid");
  const folderEmpty = document.getElementById("folderEmpty");

  const tabDocsBtn = document.getElementById("tabDocsBtn");
  const tabFoldersBtn = document.getElementById("tabFoldersBtn");
  const sharedDocsPanel = document.getElementById("sharedDocsPanel");
  const sharedFoldersPanel = document.getElementById("sharedFoldersPanel");

  function showError(message) {
    sharedError.textContent = message;
    sharedError.style.display = "block";
  }

  function hideError() {
    sharedError.textContent = "";
    sharedError.style.display = "none";
  }

  function showFolderError(message) {
    folderError.textContent = message;
    folderError.style.display = "block";
  }

  function hideFolderError() {
    folderError.textContent = "";
    folderError.style.display = "none";
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

  function createFolderCard(share) {
    const card = document.createElement("div");
    card.className = "folder-card";
    card.style.cursor = "pointer";

    const icon = document.createElement("div");
    icon.className = "folder-icon";
    icon.textContent = "📁";

    const name = document.createElement("p");
    name.className = "folder-name";
    name.textContent = share.folderName || "Untitled Folder";

    const desc = document.createElement("p");
    desc.className = "folder-meta";
    desc.style.fontSize = "12px";
    desc.style.marginTop = "4px";
    desc.textContent = `Owner: ${share.ownerName} (${share.ownerEmail})`;

    const meta = document.createElement("p");
    meta.className = "folder-meta";
    meta.style.fontSize = "11px";
    meta.style.marginTop = "4px";
    meta.style.color = "var(--muted)";
    meta.textContent = `Shared by: ${share.sharedByName} · Date: ${formatDate(share.createdAt)}`;

    card.append(icon, name, desc, meta);

    card.addEventListener("click", function () {
      window.location.href = `shared-folder-detail.html?id=${share.folderId}`;
    });

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

  async function loadSharedFolders() {
    folderLoader.style.display = "flex";
    folderGrid.style.display = "none";
    folderEmpty.style.display = "none";
    hideFolderError();

    try {
      const result = await getFoldersSharedWithMe();
      const shares = Array.isArray(result.data) ? result.data : [];

      folderLoader.style.display = "none";

      if (shares.length === 0) {
        folderEmpty.style.display = "block";
        return;
      }

      folderGrid.innerHTML = "";
      shares.forEach(function (share) {
        folderGrid.appendChild(createFolderCard(share));
      });
      folderGrid.style.display = "grid";

    } catch (error) {
      folderLoader.style.display = "none";
      showFolderError(error.message || "Failed to load shared folders.");
    }
  }

  // Tab switching event bindings
  tabDocsBtn.addEventListener("click", () => {
    tabDocsBtn.classList.add("active");
    tabDocsBtn.style.borderBottomColor = "var(--primary)";
    tabDocsBtn.style.color = "var(--primary)";
    tabFoldersBtn.classList.remove("active");
    tabFoldersBtn.style.borderBottomColor = "transparent";
    tabFoldersBtn.style.color = "var(--muted)";
    sharedDocsPanel.style.display = "block";
    sharedFoldersPanel.style.display = "none";
  });

  tabFoldersBtn.addEventListener("click", async () => {
    tabFoldersBtn.classList.add("active");
    tabFoldersBtn.style.borderBottomColor = "var(--primary)";
    tabFoldersBtn.style.color = "var(--primary)";
    tabDocsBtn.classList.remove("active");
    tabDocsBtn.style.borderBottomColor = "transparent";
    tabDocsBtn.style.color = "var(--muted)";
    sharedFoldersPanel.style.display = "block";
    sharedDocsPanel.style.display = "none";
    await loadSharedFolders();
  });

  await loadSharedDocuments();
});
