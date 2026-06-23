/**
 * Shared Folder Detail UI controller for AI Study Hub.
 * Renders level-by-level directories starting from the shared folder root in a read-only view.
 * Relies on folder-share-api.js; never uses raw fetch directly.
 */

document.addEventListener("DOMContentLoaded", async function () {
  if (window.authReady) {
    const isAuthenticated = await window.authReady;
    if (!isAuthenticated) return;
  }

  const sharedFolderTitle = document.getElementById("sharedFolderTitle");
  const sharedBreadcrumb = document.getElementById("sharedBreadcrumb");

  const sharedFolderLoader = document.getElementById("sharedFolderLoader");
  const sharedFolderGrid = document.getElementById("sharedFolderGrid");
  const sharedFolderEmpty = document.getElementById("sharedFolderEmpty");

  const sharedDocLoader = document.getElementById("sharedDocLoader");
  const sharedDocGrid = document.getElementById("sharedDocGrid");
  const sharedDocEmpty = document.getElementById("sharedDocEmpty");
  const sharedDocError = document.getElementById("sharedDocError");
  const sharedDocErrorMessage = document.getElementById("sharedDocErrorMessage");
  const sharedSubfoldersSection = document.getElementById("sharedSubfoldersSection");

  // Read folderId from URL query parameter ?folderId= or ?id=
  function getFolderIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get("folderId") || params.get("id");
  }

  const folderId = getFolderIdFromUrl();

  if (!folderId) {
    showError("No shared folder ID specified.");
    return;
  }

  function showError(message) {
    if (sharedDocErrorMessage) {
      sharedDocErrorMessage.textContent = message;
    } else {
      sharedDocError.textContent = message;
    }
    sharedDocError.style.display = "flex";
    sharedFolderLoader.style.display = "none";
    sharedDocLoader.style.display = "none";
    sharedFolderGrid.style.display = "none";
    sharedDocGrid.style.display = "none";
    if (sharedSubfoldersSection) {
      sharedSubfoldersSection.style.display = "none";
    }
  }

  function formatFileSize(bytes) {
    if (!bytes) return "–";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  // Render breadcrumbs starting strictly from the shared root
  function renderBreadcrumbs(breadcrumbs) {
    sharedBreadcrumb.innerHTML = "";
    if (!Array.isArray(breadcrumbs)) return;

    // Add "Shared With Me" as the prefix of breadcrumbs
    const rootLink = document.createElement("a");
    rootLink.className = "breadcrumb-link";
    rootLink.href = "shared-with-me.html";
    rootLink.textContent = "Shared With Me";
    sharedBreadcrumb.appendChild(rootLink);

    if (breadcrumbs.length > 0) {
      const sep = document.createElement("span");
      sep.className = "breadcrumb-sep";
      sep.textContent = " / ";
      sep.setAttribute("aria-hidden", "true");
      sharedBreadcrumb.appendChild(sep);
    }

    breadcrumbs.forEach((crumb, index) => {
      const isLast = index === breadcrumbs.length - 1;

      if (isLast) {
        const span = document.createElement("span");
        span.className = "breadcrumb-current";
        span.textContent = crumb.folderName;
        sharedBreadcrumb.appendChild(span);
      } else {
        const link = document.createElement("a");
        link.className = "breadcrumb-link";
        link.href = `shared-folder-detail.html?folderId=${crumb.folderId}`;
        link.textContent = crumb.folderName;
        sharedBreadcrumb.appendChild(link);

        const sep = document.createElement("span");
        sep.className = "breadcrumb-sep";
        sep.textContent = " / ";
        sep.setAttribute("aria-hidden", "true");
        sharedBreadcrumb.appendChild(sep);
      }
    });
  }

  function createFolderCard(folder) {
    const card = document.createElement("div");
    card.className = "folder-card";
    card.style.cursor = "pointer";

    const icon = document.createElement("div");
    icon.className = "folder-icon";
    icon.textContent = "📁";

    const name = document.createElement("p");
    name.className = "folder-name";
    name.textContent = folder.folderName || "Untitled Folder";

    const meta = document.createElement("p");
    meta.className = "folder-meta";
    const parts = [];
    if (folder.fileCount !== undefined && folder.fileCount !== null) {
      parts.push(`${folder.fileCount} file${folder.fileCount !== 1 ? "s" : ""}`);
    }
    if (folder.subfolderCount !== undefined && folder.subfolderCount !== null) {
      parts.push(`${folder.subfolderCount} subfolder${folder.subfolderCount !== 1 ? "s" : ""}`);
    }
    meta.textContent = parts.length > 0 ? parts.join(" · ") : "Shared Folder";

    const main = document.createElement("div");
    main.className = "folder-card-main";
    main.append(icon, name, meta);

    card.appendChild(main);

    card.addEventListener("click", function () {
      window.location.href = `shared-folder-detail.html?folderId=${folder.folderId}`;
    });

    return card;
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
    titleEl.textContent = doc.title || doc.originalFileName || "Untitled";
    titleLink.appendChild(titleEl);

    header.append(badge, titleLink);

    const desc = document.createElement("p");
    desc.className = "document-description";
    desc.textContent = doc.description || "No description provided.";

    const meta = document.createElement("p");
    meta.className = "helper-text";
    meta.style.fontSize = "12px";
    meta.style.color = "var(--muted)";
    meta.style.marginTop = "8px";
    meta.textContent = `Size: ${formatFileSize(doc.fileSize)}`;

    const actions = document.createElement("div");
    actions.className = "document-actions";

    const detailsBtn = document.createElement("a");
    detailsBtn.href = `document-detail.html?id=${doc.documentId}`;
    detailsBtn.className = "btn btn-secondary document-detail-btn";
    detailsBtn.style.width = "auto";
    detailsBtn.style.padding = "6px 12px";
    detailsBtn.style.fontSize = "13px";
    detailsBtn.textContent = "Details";
    actions.appendChild(detailsBtn);

    if (doc.fileUrl) {
      const viewBtn = document.createElement("a");
      viewBtn.href = doc.fileUrl;
      viewBtn.target = "_blank";
      viewBtn.rel = "noopener noreferrer";
      viewBtn.className = "btn btn-primary document-detail-btn";
      viewBtn.style.width = "auto";
      viewBtn.style.padding = "6px 12px";
      viewBtn.style.fontSize = "13px";
      viewBtn.textContent = "Open";
      actions.appendChild(viewBtn);

      const downloadBtn = document.createElement("a");
      downloadBtn.href = doc.fileUrl;
      downloadBtn.target = "_blank";
      downloadBtn.rel = "noopener noreferrer";
      downloadBtn.download = doc.title || String(doc.documentId);
      downloadBtn.className = "btn btn-secondary";
      downloadBtn.style.width = "auto";
      downloadBtn.style.padding = "6px 12px";
      downloadBtn.style.fontSize = "13px";
      downloadBtn.textContent = "Download";
      actions.appendChild(downloadBtn);
    }

    card.append(header, desc, meta, actions);
    return card;
  }

  async function loadSharedFolderContent() {
    sharedFolderLoader.style.display = "flex";
    sharedFolderGrid.style.display = "none";
    sharedFolderEmpty.style.display = "none";

    sharedDocLoader.style.display = "flex";
    sharedDocGrid.style.display = "none";
    sharedDocEmpty.style.display = "none";
    sharedDocError.style.display = "none";

    try {
      const response = await getSharedFolderContent(folderId);
      const data = response.data;

      // Update current folder details
      if (data.currentFolder && sharedFolderTitle) {
        sharedFolderTitle.textContent = data.currentFolder.folderName;
      }

      // Render breadcrumbs
      renderBreadcrumbs(data.breadcrumb);

      // Render subfolders
      sharedFolderLoader.style.display = "none";
      const subfolders = Array.isArray(data.subfolders) ? data.subfolders : [];
      if (subfolders.length === 0) {
        sharedFolderEmpty.style.display = "block";
      } else {
        sharedFolderGrid.innerHTML = "";
        subfolders.forEach(sub => {
          sharedFolderGrid.appendChild(createFolderCard(sub));
        });
        sharedFolderGrid.style.display = "grid";
      }

      // Render documents
      sharedDocLoader.style.display = "none";
      const documents = Array.isArray(data.documents) ? data.documents : [];
      if (documents.length === 0) {
        sharedDocEmpty.style.display = "block";
      } else {
        sharedDocGrid.innerHTML = "";
        documents.forEach(doc => {
          sharedDocGrid.appendChild(createDocCard(doc));
        });
        sharedDocGrid.style.display = "grid";
      }

    } catch (error) {
      showError(error.message || "Failed to load shared folder content.");
    }
  }

  await loadSharedFolderContent();
});