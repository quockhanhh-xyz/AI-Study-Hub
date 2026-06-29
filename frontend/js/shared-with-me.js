/**
 * Shared With Me UI controller for AI Study Hub.
 * Handles: list direct shared documents and folders.
 * Relies on share-api.js and folder-share-api.js; never uses raw fetch directly.
 */

document.addEventListener("DOMContentLoaded", async function () {
  if (window.authReady) {
    const isAuthenticated = await window.authReady;
    if (!isAuthenticated) return;
  }

  const sharedLoader = document.getElementById("sharedLoader");
  const sharedError = document.getElementById("sharedError");
  const sharedErrorMessage = document.getElementById("sharedErrorMessage");
  const sharedGrid = document.getElementById("sharedGrid");
  const sharedEmpty = document.getElementById("sharedEmpty");

  const folderLoader = document.getElementById("folderLoader");
  const folderError = document.getElementById("folderError");
  const folderErrorMessage = document.getElementById("folderErrorMessage");
  const folderGrid = document.getElementById("folderGrid");
  const folderEmpty = document.getElementById("folderEmpty");

  const tabDocsBtn = document.getElementById("tabDocsBtn");
  const tabFoldersBtn = document.getElementById("tabFoldersBtn");
  const sharedDocsPanel = document.getElementById("sharedDocsPanel");
  const sharedFoldersPanel = document.getElementById("sharedFoldersPanel");

  function showError(message) {
    if (sharedErrorMessage) sharedErrorMessage.textContent = message;
    sharedError.style.display = "flex";
    sharedGrid.style.display = "none";
    sharedEmpty.style.display = "none";
  }

  function hideError() {
    sharedError.style.display = "none";
  }

  // Ensure initial state resets for error elements
  hideError();
  if (folderError) {
    folderError.style.display = "none";
  }

  function showFolderError(message) {
    if (folderErrorMessage) folderErrorMessage.textContent = message;
    folderError.style.display = "flex";
    folderGrid.style.display = "none";
    folderEmpty.style.display = "none";
  }

  function hideFolderError() {
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

    const titleLink = document.createElement("a");
    titleLink.href = `document-detail.html?id=${doc.documentId}`;
    titleLink.style.color = "inherit";
    titleLink.style.textDecoration = "none";

    const titleEl = document.createElement("h3");
    titleEl.textContent = doc.title || "Untitled Document";
    titleLink.appendChild(titleEl);

    header.append(badge, titleLink);

    const desc = document.createElement("p");
    desc.className = "document-description";
    desc.textContent = `Shared by: ${doc.sharedByName || "Unknown User"}`;

    const meta = document.createElement("p");
    meta.className = "helper-text";
    meta.style.fontSize = "12px";
    meta.style.color = "var(--muted)";
    meta.style.marginTop = "8px";
    meta.textContent = formatDate(doc.createdAt);

    card.append(header, desc, meta);

    card.addEventListener("click", function (e) {
      if (e.target.closest("button") || e.target.closest("a")) {
        return;
      }
      window.location.href = `document-detail.html?id=${doc.documentId}`;
    });

    return card;
  }

  function createFolderCard(share) {
    const card = document.createElement("a");
    card.className = "folder-card";
    card.href = `shared-folder-detail.html?folderId=${share.folderId}`;
    card.style.textDecoration = "none";
    card.style.color = "inherit";

    const icon = document.createElement("div");
    icon.className = "folder-icon";
    icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="24" width="24" aria-hidden="true" focusable="false"><path stroke="currentColor" d="M1.5 10V2.5h5l3 3h11v3m3 0.25V8.5H4.6l-0.15 0.25 -0.234 0.492A28 28 0 0 0 1.5 21.272v0.228h19v-0.128a28 28 0 0 1 2.757 -12.116l0.243 -0.506Z" stroke-width="1"></path></svg>';

    const name = document.createElement("p");
    name.className = "folder-name";
    name.textContent = share.folderName || "Untitled Folder";

    const desc = document.createElement("p");
    desc.className = "folder-meta";
    desc.style.fontSize = "12px";
    desc.style.marginTop = "4px";
    desc.textContent = `Owner: ${share.ownerName || "Unknown"}`;

    const meta = document.createElement("p");
    meta.className = "folder-meta";
    meta.style.fontSize = "11px";
    meta.style.marginTop = "4px";
    meta.style.color = "var(--muted)";
    meta.textContent = `Shared by: ${share.sharedByName || "System"} · Date: ${formatDate(share.createdAt)}`;

    card.append(icon, name, desc, meta);

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
    tabFoldersBtn.classList.remove("active");
    sharedDocsPanel.style.display = "block";
    sharedFoldersPanel.style.display = "none";
  });

  tabFoldersBtn.addEventListener("click", async () => {
    tabFoldersBtn.classList.add("active");
    tabDocsBtn.classList.remove("active");
    sharedFoldersPanel.style.display = "block";
    sharedDocsPanel.style.display = "none";
    await loadSharedFolders();
  });

  await loadSharedDocuments();
});
