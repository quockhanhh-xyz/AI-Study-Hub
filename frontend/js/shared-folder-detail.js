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
    const urlParams = new URLSearchParams(window.location.search);
    const fromParam = urlParams.get("from");
    const groupIdParam = urlParams.get("groupId");

    const rootLink = document.createElement("a");
    rootLink.className = "breadcrumb-link";
    if (fromParam === "group" && groupIdParam) {
      rootLink.href = `group-detail.html?id=${groupIdParam}&tab=folders`;
      rootLink.textContent = "← Back to Group Shared Folder";
    } else {
      rootLink.href = "shared-with-me.html";
      rootLink.textContent = "← Back to Shared Folder";
    }
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
        if (fromParam === "group" && groupIdParam) {
          link.href += `&from=group&groupId=${groupIdParam}`;
        }
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
    icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="24" width="24" aria-hidden="true" focusable="false"><path stroke="currentColor" d="M1.5 10V2.5h5l3 3h11v3m3 0.25V8.5H4.6l-0.15 0.25 -0.234 0.492A28 28 0 0 0 1.5 21.272v0.228h19v-0.128a28 28 0 0 1 2.757 -12.116l0.243 -0.506Z" stroke-width="1"></path></svg>';

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
      const urlParams = new URLSearchParams(window.location.search);
      const fromParam = urlParams.get("from");
      const groupIdParam = urlParams.get("groupId");
      let url = `shared-folder-detail.html?folderId=${folder.folderId}`;
      if (fromParam === "group" && groupIdParam) {
        url += `&from=group&groupId=${groupIdParam}`;
      }
      window.location.href = url;
    });

    return card;
  }

  function createDocCard(doc) {
    const card = document.createElement("article");
    card.className = "document-card";

    // Left Column: The Large File Type Icon
    const iconContainer = document.createElement("div");
    iconContainer.innerHTML = getFileTypeIcon(doc.fileType);
    const iconWrapper = iconContainer.firstElementChild;
    card.appendChild(iconWrapper);

    // Right Column: The Details Column
    const content = document.createElement("div");
    content.className = "document-card-content";

    const header = document.createElement("div");
    header.className = "document-card-header";

    const titleEl = document.createElement("h3");
    const titleLink = document.createElement("a");
    
    const urlParams = new URLSearchParams(window.location.search);
    const fromParam = urlParams.get("from");
    const groupIdParam = urlParams.get("groupId");
    
    let docUrl = `document-detail.html?id=${doc.documentId}&from=shared_folder&folderId=${folderId}`;
    if (fromParam) docUrl += `&parentFrom=${fromParam}`;
    if (groupIdParam) docUrl += `&parentGroupId=${groupIdParam}`;
    
    titleLink.href = docUrl;
    titleLink.style.color = "inherit";
    titleLink.style.textDecoration = "none";
    titleLink.textContent = doc.title || doc.originalFileName || "Untitled";
    titleEl.appendChild(titleLink);
    header.appendChild(titleEl);

    const meta = document.createElement("div");
    meta.className = "document-meta";

    const dateItem = document.createElement("span");
    dateItem.className = "document-meta-item";
    
    const formatDate = (val) => {
      if (!val) return "-";
      const date = new Date(val);
      if (Number.isNaN(date.getTime())) return "-";
      return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" });
    };

    dateItem.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="12" width="12" stroke="currentColor" stroke-width="2.5" style="vertical-align: -1px; margin-right: 4px;"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> ${formatDate(doc.createdAt)}`;
    meta.append(dateItem);

    content.append(header, meta);
    card.appendChild(content);

    card.addEventListener("click", function (e) {
      if (e.target.closest("button") || e.target.closest("a")) {
        return;
      }
      window.location.href = docUrl;
    });

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