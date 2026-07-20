/**
 * Folder Management UI controller for AI Study Hub.
 * Supports URL-based subfolder navigation via ?parentFolderId=
 * Handles breadcrumb, folder listing, creation, renaming, deletion, and document browsing.
 * Relies on folder-api.js and document-api.js; never uses raw fetch directly.
 */

document.addEventListener("DOMContentLoaded", async function () {
  if (window.authReady) {
    const isAuthenticated = await window.authReady;
    if (!isAuthenticated) return;
  }

  // View containers
  const folderListView = document.getElementById("folderListView");
  const folderDocView = document.getElementById("folderDocView");

  // Folder list elements
  const folderLoader = document.getElementById("folderLoader");
  const folderError = document.getElementById("folderError");
  const folderGrid = document.getElementById("folderGrid");
  const folderEmpty = document.getElementById("folderEmpty");

  // Folder document view elements
  const docLoader = document.getElementById("docLoader");
  const docError = document.getElementById("docError");
  const docGrid = document.getElementById("docGrid");
  const docEmpty = document.getElementById("docEmpty");

  // Breadcrumb
  const breadcrumb = document.getElementById("breadcrumb");

  // Buttons
  const createFolderBtn = document.getElementById("createFolderBtn");
  const backFolderBtn = document.getElementById("backFolderBtn");
  const uploadDocumentToFolderBtn = document.getElementById("uploadDocumentToFolderBtn");

  // Create modal
  const createModal = document.getElementById("createModal");
  const createFolderName = document.getElementById("createFolderName");
  const createError = document.getElementById("createError");
  const createCancelBtn = document.getElementById("createCancelBtn");
  const createConfirmBtn = document.getElementById("createConfirmBtn");

  // Rename modal
  const renameModal = document.getElementById("renameModal");
  const renameFolderName = document.getElementById("renameFolderName");
  const renameError = document.getElementById("renameError");
  const renameCancelBtn = document.getElementById("renameCancelBtn");
  const renameConfirmBtn = document.getElementById("renameConfirmBtn");

  // Delete modal
  const deleteModal = document.getElementById("deleteModal");
  const deleteError = document.getElementById("deleteError");
  const deleteCancelBtn = document.getElementById("deleteCancelBtn");
  const deleteConfirmBtn = document.getElementById("deleteConfirmBtn");

  // State
  let editingFolderId = null;
  let deletingFolderId = null;

  // Breadcrumb trail: array of { folderId, name } from root to current folder.
  // Entry 0 is always My Documents (folderId: null).
  let breadcrumbTrail = [{ folderId: null, name: "My Documents" }];

  // The current parentFolderId being viewed. null = My Documents (root).
  const currentParentFolderId = getParentFolderIdFromUrl();

  // URL helpers

  // Reads ?parentFolderId= from the current URL. Returns null if not present.
  function getParentFolderIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const val = params.get("folderId") || params.get("parentFolderId");
    return val ? parseInt(val, 10) : null;
  }

  // Navigates to a subfolder by updating the URL and reloading.
  function navigateToFolder(folderId) {
    if (!folderId) {
      window.location.href = "folders.html";
      return;
    }
    window.location.href = `folders.html?folderId=${folderId}`;
  }

  // Breadcrumb helpers

  // Builds and renders the breadcrumb trail for the current folder.
  // My Folders is always the first crumb; subsequent crumbs come from
  // resolving parent folder names via the API.
  async function buildBreadcrumb() {
    breadcrumbTrail = [{ folderId: null, name: "My Folders" }];

    const subtitleEl = document.getElementById("folderPageSubtitle");
    const breadcrumbEl = document.getElementById("breadcrumb");

    if (currentParentFolderId) {
      if (subtitleEl) subtitleEl.style.display = "none";
      if (breadcrumbEl) breadcrumbEl.style.display = "block";

      // Build full path by walking up the parent chain
      const chain = [];
      let folderId = currentParentFolderId;

      while (folderId) {
        try {
          const result = await getFolderById(folderId);
          const folder = result.data;
          if (folder.folderId === currentParentFolderId) {
            const pageTitleEl = document.getElementById("folderPageTitle");
            if (pageTitleEl) {
              pageTitleEl.textContent = folder.folderName;
            }
            const folderNameEncoded = encodeURIComponent(folder.folderName);
            const uploadUrl = `upload.html?source=folder&folderId=${currentParentFolderId}&folderName=${folderNameEncoded}`;
            const uploadBtn = document.getElementById("uploadDocumentToFolderBtn");
            const emptyUploadBtn = document.getElementById("emptyUploadBtn");
            if (uploadBtn) uploadBtn.href = uploadUrl;
            if (emptyUploadBtn) emptyUploadBtn.href = uploadUrl;
          }
          chain.unshift({ folderId: folder.folderId, name: folder.folderName });
          folderId = folder.parentFolderId || null;
        } catch (e) {
          break;
        }
      }

      breadcrumbTrail = [{ folderId: null, name: "My Folders" }, ...chain];
    } else {
      if (subtitleEl) subtitleEl.style.display = "block";
      if (breadcrumbEl) breadcrumbEl.style.display = "none";

      const pageTitleEl = document.getElementById("folderPageTitle");
      if (pageTitleEl) {
        pageTitleEl.textContent = "My Folders";
      }
    }

    renderBreadcrumb();
  }

  // Renders the breadcrumb trail into the #breadcrumb nav element.
  // All crumbs except the last are rendered as links.
  function renderBreadcrumb() {
    breadcrumb.innerHTML = "";

    breadcrumbTrail.forEach(function (crumb, index) {
      const isLast = index === breadcrumbTrail.length - 1;

      if (isLast) {
        const span = document.createElement("span");
        span.className = "breadcrumb-current";
        span.textContent = crumb.name;
        breadcrumb.appendChild(span);
      } else {
        const link = document.createElement("a");
        link.className = "breadcrumb-link";
        link.href = crumb.folderId ? `folders.html?folderId=${crumb.folderId}` : "folders.html";
        link.textContent = crumb.name;
        breadcrumb.appendChild(link);

        const sep = document.createElement("span");
        sep.className = "breadcrumb-sep";
        sep.textContent = " > ";
        sep.setAttribute("aria-hidden", "true");
        breadcrumb.appendChild(sep);
      }
    });
  }

  // Modal helpers

  function openModal(overlay) { overlay.classList.add("open"); }
  function closeModal(overlay) { overlay.classList.remove("open"); }

  function showError(el, message) {
    el.textContent = message;
    el.style.display = "block";
  }

  function hideError(el) {
    el.textContent = "";
    el.style.display = "none";
  }

  // Step 13: detects backend quota errors (folder/depth/share limits) so we can
  // route them through the shared showQuotaError() helper.
  function isQuotaError(error) {
    return !!(error && typeof error.code === "string" && /LIMIT_EXCEEDED|QUOTA_EXCEEDED/.test(error.code));
  }

  // Folder list rendering

  function createFolderCard(folder) {
    const card = document.createElement("div");
    card.className = "folder-card";

    // Main link wrapper for navigation (semantic HTML for links, avoiding button inside a link)
    const link = document.createElement("a");
    link.href = folder.folderId ? `folders.html?folderId=${folder.folderId}` : "folders.html";
    link.style.textDecoration = "none";
    link.style.color = "inherit";
    link.style.display = "block";

    const icon = document.createElement("div");
    icon.className = "folder-icon";
    icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15 13.5H9m4.06-7.19-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" /></svg>';

    const infoText = document.createElement("div");
    infoText.className = "folder-info-text";

    const name = document.createElement("p");
    name.className = "folder-name";
    name.textContent = folder.folderName || "Untitled Folder";

    // Show fileCount and subfolderCount if available
    const meta = document.createElement("p");
    meta.className = "folder-meta";
    const parts = [];
    if (folder.fileCount !== undefined && folder.fileCount !== null) {
      parts.push(`${folder.fileCount} file${folder.fileCount !== 1 ? "s" : ""}`);
    }
    if (folder.subfolderCount !== undefined && folder.subfolderCount !== null) {
      parts.push(`${folder.subfolderCount} subfolder${folder.subfolderCount !== 1 ? "s" : ""}`);
    }
    if (parts.length === 0 && folder.createdAt) {
      meta.textContent = new Date(folder.createdAt).toLocaleDateString("en-US", {
        year: "numeric", month: "short", day: "2-digit"
      });
    } else {
      meta.textContent = parts.join(" · ");
    }

    infoText.append(name, meta);

    const main = document.createElement("div");
    main.className = "folder-card-main";
    main.append(icon, infoText);

    link.appendChild(main);

    // Kebab actions dropdown menu
    const actions = document.createElement("div");
    actions.className = "folder-card-actions";

    const kebabBtn = document.createElement("button");
    kebabBtn.type = "button";
    kebabBtn.className = "btn-kebab";
    kebabBtn.setAttribute("aria-label", "Folder actions");
    kebabBtn.innerHTML = "⋮";

    const dropdown = document.createElement("div");
    dropdown.className = "kebab-dropdown";
    dropdown.style.display = "none";
    dropdown.style.position = "absolute";
    dropdown.style.right = "0";
    dropdown.style.top = "100%";
    dropdown.style.background = "var(--card-bg)";
    dropdown.style.border = "1px solid var(--border)";
    dropdown.style.borderRadius = "6px";
    dropdown.style.boxShadow = "var(--shadow)";
    dropdown.style.zIndex = "10";
    dropdown.style.minWidth = "120px";

    const renameLink = document.createElement("button");
    renameLink.type = "button";
    renameLink.className = "dropdown-item";
    renameLink.textContent = "Rename";
    renameLink.style.display = "block";
    renameLink.style.width = "100%";
    renameLink.style.padding = "8px 12px";
    renameLink.style.textAlign = "left";
    renameLink.style.border = "none";
    renameLink.style.background = "transparent";
    renameLink.style.cursor = "pointer";
    renameLink.style.color = "var(--text)";

    const deleteLink = document.createElement("button");
    deleteLink.type = "button";
    deleteLink.className = "dropdown-item";
    deleteLink.textContent = "Move to Trash";
    deleteLink.style.display = "block";
    deleteLink.style.width = "100%";
    deleteLink.style.padding = "8px 12px";
    deleteLink.style.textAlign = "left";
    deleteLink.style.border = "none";
    deleteLink.style.background = "transparent";
    deleteLink.style.cursor = "pointer";
    deleteLink.style.color = "var(--danger)";

    dropdown.append(renameLink, deleteLink);
    actions.append(kebabBtn, dropdown);

    card.append(link, actions);

    // Kebab Menu Event Listeners
    kebabBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();

      // Close all other open kebab dropdowns
      document.querySelectorAll(".kebab-dropdown").forEach(el => {
        if (el !== dropdown) el.style.display = "none";
      });

      const isOpen = dropdown.style.display === "block";
      dropdown.style.display = isOpen ? "none" : "block";
      if (!isOpen) {
        renameLink.focus();
      }
    });

    renameLink.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      dropdown.style.display = "none";
      openRenameModal(folder);
    });

    deleteLink.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      dropdown.style.display = "none";
      openDeleteModal(folder);
    });

    // Escape key closes dropdown and restores focus to kebabBtn
    actions.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        dropdown.style.display = "none";
        kebabBtn.focus();
      }
    });

    // Whole-card click handling (unless clicking on kebab menu actions)
    card.addEventListener("click", function (e) {
      if (!actions.contains(e.target)) {
        window.location.href = link.href;
      }
    });

    return card;
  }

  // Loads and renders folders under the current parentFolderId.
  // When at root (parentFolderId = null), shows all root-level folders.
  async function loadFolders() {
    folderListView.style.display = "block";

    folderLoader.style.display = "flex";
    folderGrid.style.display = "none";
    folderEmpty.style.display = "none";
    hideError(folderError);

    try {
      const result = await getMyFolders(currentParentFolderId);
      const folders = Array.isArray(result.data) ? result.data : [];

      folderLoader.style.display = "none";

      if (folders.length === 0) {
        folderEmpty.style.display = "flex";
        return;
      }

      folderGrid.innerHTML = "";
      folders.forEach(function (folder) {
        folderGrid.appendChild(createFolderCard(folder));
      });
      folderGrid.style.display = "grid";

    } catch (error) {
      folderLoader.style.display = "none";
      showError(folderError, error.message || "Failed to load folders.");
    }
  }

  // Document view inside a folder

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
    titleLink.href = `document-detail.html?id=${doc.documentId}`;
    titleLink.textContent = doc.title || doc.originalFileName || "Untitled";
    titleLink.className = "document-title-link";
    titleEl.appendChild(titleLink);
    header.appendChild(titleEl);

    content.append(header);

    // Description removed to keep card compact

    const meta = document.createElement("div");
    meta.className = "document-meta";

    const formatDate = (val) => {
      if (!val) return "-";
      const date = new Date(val);
      if (Number.isNaN(date.getTime())) return "-";
      return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" });
    };

    const formatFileSize = (bytes) => {
      if (bytes === undefined || bytes === null) return "-";
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    };

    const dateItem = document.createElement("span");
    dateItem.className = "document-meta-item";
    dateItem.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="12" width="12" stroke="currentColor" stroke-width="2.5" style="vertical-align: -1px; margin-right: 4px;"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> ${formatDate(doc.createdAt)}`;
    meta.append(dateItem);

    // Size metadata tag
    const sizeItem = document.createElement("span");
    sizeItem.className = "document-meta-item";
    sizeItem.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="12" width="12" stroke="currentColor" stroke-width="2.5" style="vertical-align: -1px; margin-right: 4px;"><path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg> ${formatFileSize(doc.fileSize)}`;
    meta.append(sizeItem);

    // Owner metadata tag (if present)
    if (doc.ownerName) {
      const ownerItem = document.createElement("span");
      ownerItem.className = "document-meta-item";
      ownerItem.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="12" width="12" stroke="currentColor" stroke-width="2.5" style="vertical-align: -1px; margin-right: 4px;"><path d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/></svg> ${doc.ownerName}`;
      meta.append(ownerItem);
    }

    content.append(meta);
    card.appendChild(content);

    card.addEventListener("click", function (e) {
      if (e.target.closest("button") || e.target.closest("a")) {
        return;
      }
      window.location.href = `document-detail.html?id=${doc.documentId}`;
    });

    return card;
  }

  // Loads documents inside the current folder and shows the doc view panel.
  async function loadFolderDocuments() {
    folderDocView.style.display = "block";

    docLoader.style.display = "flex";
    docGrid.style.display = "none";
    docEmpty.style.display = "none";
    hideError(docError);

    try {
      const result = await getMyDocuments({ folderId: currentParentFolderId });
      const docs = Array.isArray(result.data) ? result.data : [];

      docLoader.style.display = "none";

      if (docs.length === 0) {
        docEmpty.style.display = "flex";
        return;
      }

      docGrid.innerHTML = "";
      docs.forEach(function (doc) {
        docGrid.appendChild(createDocCard(doc));
      });
      docGrid.style.display = "grid";

    } catch (error) {
      docLoader.style.display = "none";
      showError(docError, error.message || "Failed to load documents.");
    }
  }

  // Create folder

  function openCreateModal() {
    createFolderName.value = "";
    hideError(createError);
    openModal(createModal);
    createFolderName.focus();
  }

  createFolderBtn.addEventListener("click", openCreateModal);
  createCancelBtn.addEventListener("click", function () { closeModal(createModal); });

  createConfirmBtn.addEventListener("click", async function () {
    const name = createFolderName.value.trim();
    if (!name) {
      showError(createError, "Folder name is required.");
      return;
    }

    createConfirmBtn.disabled = true;
    hideError(createError);

    try {
      // Pass parentFolderId so the new folder is created under the current level.
      await createFolder({ folderName: name, parentFolderId: currentParentFolderId });
      closeModal(createModal);
      showToast("Folder created successfully.", "success");
      await loadFolders();
    } catch (error) {
      if (isQuotaError(error) && typeof window.showQuotaError === "function") {
        window.showQuotaError(error);
        showError(createError, window.getQuotaErrorMessage ? window.getQuotaErrorMessage(error) : error.message);
      } else {
        showError(createError, error.message || "Failed to create folder.");
      }
    } finally {
      createConfirmBtn.disabled = false;
    }
  });

  createFolderName.addEventListener("keydown", function (e) {
    if (e.key === "Enter") createConfirmBtn.click();
  });

  // Rename folder

  function openRenameModal(folder) {
    editingFolderId = folder.folderId;
    renameFolderName.value = folder.folderName || "";
    hideError(renameError);
    openModal(renameModal);
    renameFolderName.focus();
  }

  renameCancelBtn.addEventListener("click", function () { closeModal(renameModal); });

  renameConfirmBtn.addEventListener("click", async function () {
    const name = renameFolderName.value.trim();
    if (!name) {
      showError(renameError, "Folder name is required.");
      return;
    }

    renameConfirmBtn.disabled = true;
    hideError(renameError);

    try {
      await updateFolder(editingFolderId, { folderName: name });
      closeModal(renameModal);
      showToast("Folder renamed successfully.", "success");
      await loadFolders();
    } catch (error) {
      showError(renameError, error.message || "Failed to rename folder.");
    } finally {
      renameConfirmBtn.disabled = false;
    }
  });

  renameFolderName.addEventListener("keydown", function (e) {
    if (e.key === "Enter") renameConfirmBtn.click();
  });

  // Delete folder

  function openDeleteModal(folder) {
    if (typeof folder === "object" && folder !== null) {
      deletingFolderId = folder.folderId;
      const titleEl = document.getElementById("deleteModalTitle");
      const messageEl = document.getElementById("deleteModalMessage");
      if (titleEl) {
        titleEl.textContent = `Move “${folder.folderName || "Folder"}” to Trash?`;
      }
      if (messageEl) {
        const fileCount = folder.fileCount || 0;
        const subfolderCount = folder.subfolderCount || 0;
        let contentsText = "";
        if (fileCount > 0 || subfolderCount > 0) {
          const fileStr = `${fileCount} document${fileCount !== 1 ? "s" : ""}`;
          const subStr = `${subfolderCount} subfolder${subfolderCount !== 1 ? "s" : ""}`;
          contentsText = `This folder contains ${fileStr} and ${subStr}. Everything inside will also be moved to Trash.<br>`;
        }
        messageEl.innerHTML = `${contentsText}Items in Trash are permanently deleted after 30 days.`;
      }
    } else {
      deletingFolderId = folder;
    }
    hideError(deleteError);
    openModal(deleteModal);
  }

  deleteCancelBtn.addEventListener("click", function () { closeModal(deleteModal); });

  deleteConfirmBtn.addEventListener("click", async function () {
    deleteConfirmBtn.disabled = true;
    hideError(deleteError);

    try {
      await deleteFolder(deletingFolderId);
      closeModal(deleteModal);
      showToast("Folder moved to trash.", "success");
      await loadFolders();
    } catch (error) {
      showError(deleteError, error.message || "Failed to delete folder.");
    } finally {
      deleteConfirmBtn.disabled = false;
    }
  });

  // Close modals on overlay click

  const shareFolderModal = document.getElementById("shareFolderModal");

  [createModal, renameModal, deleteModal, shareFolderModal].forEach(function (overlay) {
    if (overlay) {
      overlay.addEventListener("click", function (e) {
        if (e.target === overlay) closeModal(overlay);
      });
    }
  });

  // Folder share modal logic
  const shareFolderBtn = document.getElementById("shareFolderBtn");
  const modalTabUserBtn = document.getElementById("modalTabUserBtn");
  const modalTabGroupBtn = document.getElementById("modalTabGroupBtn");
  const modalUserPanel = document.getElementById("modalUserPanel");
  const modalGroupPanel = document.getElementById("modalGroupPanel");
  const shareUserEmail = document.getElementById("shareUserEmail");
  const shareUserError = document.getElementById("shareUserError");
  const shareUserConfirmBtn = document.getElementById("shareUserConfirmBtn");
  const shareGroupSelect = document.getElementById("shareGroupSelect");
  const shareGroupError = document.getElementById("shareGroupError");
  const shareGroupConfirmBtn = document.getElementById("shareGroupConfirmBtn");
  const shareFolderCloseBtn = document.getElementById("shareFolderCloseBtn");

  let groupsLoaded = false;

  async function loadGroupsDropdown() {
    if (groupsLoaded) return;
    try {
      const result = await getMyGroups();
      const groups = Array.isArray(result.data) ? result.data : [];
      shareGroupSelect.innerHTML = '<option value="">-- Choose a Group --</option>';
      groups.forEach(g => {
        const opt = document.createElement("option");
        opt.value = g.groupId;
        opt.textContent = g.groupName;
        shareGroupSelect.appendChild(opt);
      });
      groupsLoaded = true;
      if (window.UIHelper && window.UIHelper.convertSelectToCustomDropdown) {
        window.UIHelper.convertSelectToCustomDropdown(shareGroupSelect);
        shareGroupSelect.dispatchEvent(new Event("syncCustom"));
      }
    } catch (e) {
      console.error("Failed to load groups for dropdown", e);
    }
  }

  async function loadFolderShares() {
    const sharesLoader = document.getElementById("sharesLoader");
    const sharesList = document.getElementById("sharesList");
    const sharesEmpty = document.getElementById("sharesEmpty");

    sharesLoader.style.display = "flex";
    sharesList.style.display = "none";
    sharesEmpty.style.display = "none";
    sharesList.innerHTML = "";

    try {
      const sharesData = await getFolderShares(currentParentFolderId);
      const userShares = sharesData.data?.userShares || [];
      const groupShares = sharesData.data?.groupShares || [];

      sharesLoader.style.display = "none";

      if (userShares.length === 0 && groupShares.length === 0) {
        sharesEmpty.style.display = "block";
        return;
      }

      userShares.forEach(share => {
        const item = document.createElement("div");
        item.className = "share-roster-item";

        const info = document.createElement("div");
        info.className = "share-roster-info";

        const nameSpan = document.createElement("span");
        nameSpan.className = "share-name";
        nameSpan.textContent = share.sharedWithName || "Unknown User";

        const typeSpan = document.createElement("span");
        typeSpan.className = "share-type";
        typeSpan.textContent = " (User)";

        info.append(nameSpan, typeSpan);

        const revokeBtn = document.createElement("button");
        revokeBtn.type = "button";
        revokeBtn.className = "btn btn-danger btn-sm";
        revokeBtn.textContent = "Revoke";
        revokeBtn.addEventListener("click", async () => {
          revokeBtn.disabled = true;
          try {
            await revokeFolderShare(share.shareId);
            showToast("Share revoked.", "success");
            await loadFolderShares();
          } catch (err) {
            showToast(err.message || "Failed to revoke share.", "error");
          } finally {
            revokeBtn.disabled = false;
          }
        });

        item.append(info, revokeBtn);
        sharesList.appendChild(item);
      });

      groupShares.forEach(share => {
        const item = document.createElement("div");
        item.className = "share-roster-item";

        const info = document.createElement("div");
        info.className = "share-roster-info";

        const nameSpan = document.createElement("span");
        nameSpan.className = "share-email";
        nameSpan.textContent = share.groupName;

        const typeSpan = document.createElement("span");
        typeSpan.className = "share-type";
        typeSpan.textContent = " (Group)";

        info.append(nameSpan, typeSpan);

        const revokeBtn = document.createElement("button");
        revokeBtn.type = "button";
        revokeBtn.className = "btn btn-danger btn-sm";
        revokeBtn.textContent = "Revoke";
        revokeBtn.addEventListener("click", async () => {
          revokeBtn.disabled = true;
          try {
            await revokeGroupFolderShare(share.shareId);
            showToast("Group share revoked.", "success");
            await loadFolderShares();
          } catch (err) {
            showToast(err.message || "Failed to revoke group share.", "error");
          } finally {
            revokeBtn.disabled = false;
          }
        });

        item.append(info, revokeBtn);
        sharesList.appendChild(item);
      });

      sharesList.style.display = "flex";

    } catch (error) {
      sharesLoader.style.display = "none";
      sharesEmpty.textContent = "Failed to load shares registry.";
      sharesEmpty.style.display = "block";
    }
  }

  if (currentParentFolderId) {
    if (backFolderBtn) {
      backFolderBtn.style.display = "inline-flex";
      backFolderBtn.onclick = () => {
        const parentId = breadcrumbTrail.length > 2
          ? breadcrumbTrail[breadcrumbTrail.length - 2].folderId
          : null;
        navigateToFolder(parentId);
      };
    }
    if (shareFolderBtn) {
      shareFolderBtn.style.display = "inline-flex";
      shareFolderBtn.onclick = async () => {
        // Reset modal state
        hideError(shareUserError);
        hideError(shareGroupError);
        shareUserEmail.value = "";
        shareGroupSelect.value = "";

        // Default Tab: User
        modalTabUserBtn.click();

        openModal(shareFolderModal);

        // Load active shares and group dropdown options
        await loadFolderShares();
        await loadGroupsDropdown();
      };
    }
  } else {
    if (backFolderBtn) {
      backFolderBtn.style.display = "none";
      backFolderBtn.onclick = null;
    }
    if (shareFolderBtn) {
      shareFolderBtn.style.display = "none";
      shareFolderBtn.onclick = null;
    }
  }

  const emptyUploadBtn = document.getElementById("emptyUploadBtn");
  if (uploadDocumentToFolderBtn) {
    if (currentParentFolderId) {
      uploadDocumentToFolderBtn.href = `upload.html?folderId=${currentParentFolderId}`;
      if (emptyUploadBtn) emptyUploadBtn.href = `upload.html?folderId=${currentParentFolderId}`;
    } else {
      uploadDocumentToFolderBtn.href = "upload.html";
      if (emptyUploadBtn) emptyUploadBtn.href = "upload.html";
    }
  }

  // Modal Tab bindings
  modalTabUserBtn.addEventListener("click", () => {
    modalTabUserBtn.classList.add("active");
    modalTabGroupBtn.classList.remove("active");
    modalUserPanel.style.display = "block";
    modalGroupPanel.style.display = "none";
  });

  modalTabGroupBtn.addEventListener("click", () => {
    modalTabGroupBtn.classList.add("active");
    modalTabUserBtn.classList.remove("active");
    modalGroupPanel.style.display = "block";
    modalUserPanel.style.display = "none";
  });

  // User share confirm
  shareUserConfirmBtn.addEventListener("click", async () => {
    const email = shareUserEmail.value.trim();
    if (!email) {
      showError(shareUserError, "User email is required.");
      return;
    }

    hideError(shareUserError);
    shareUserConfirmBtn.disabled = true;

    try {
      await shareFolderToUser(currentParentFolderId, email);
      shareUserEmail.value = "";
      showToast("Folder shared with user.", "success");
      await loadFolderShares();
    } catch (err) {
      if (isQuotaError(err) && typeof window.showQuotaError === "function") {
        window.showQuotaError(err);
        showError(shareUserError, window.getQuotaErrorMessage ? window.getQuotaErrorMessage(err) : err.message);
      } else {
        showError(shareUserError, err.message || "Failed to share folder with user.");
      }
    } finally {
      shareUserConfirmBtn.disabled = false;
    }
  });

  shareUserEmail.addEventListener("keydown", (e) => {
    if (e.key === "Enter") shareUserConfirmBtn.click();
  });

  // Group share confirm
  shareGroupConfirmBtn.addEventListener("click", async () => {
    const groupId = shareGroupSelect.value;
    if (!groupId) {
      showError(shareGroupError, "Please select a group.");
      return;
    }

    hideError(shareGroupError);
    shareGroupConfirmBtn.disabled = true;

    try {
      await shareFolderToGroup(currentParentFolderId, groupId);
      shareGroupSelect.value = "";
      showToast("Folder shared with group.", "success");
      await loadFolderShares();
    } catch (err) {
      if (isQuotaError(err) && typeof window.showQuotaError === "function") {
        window.showQuotaError(err);
        showError(shareGroupError, window.getQuotaErrorMessage ? window.getQuotaErrorMessage(err) : err.message);
      } else {
        showError(shareGroupError, err.message || "Failed to share folder with group.");
      }
    } finally {
      shareGroupConfirmBtn.disabled = false;
    }
  });

  shareFolderCloseBtn.addEventListener("click", () => {
    closeModal(shareFolderModal);
  });

  // Close all folder dropdowns when clicking outside (Event Delegation)
  document.addEventListener("click", function (e) {
    if (!e.target.closest(".folder-card-actions")) {
      document.querySelectorAll(".kebab-dropdown").forEach(dropdown => {
        dropdown.style.display = "none";
      });
    }
  });

  // Init
  // Build breadcrumb first, then decide what to show based on the URL.
  // - No parentFolderId in URL: show folder grid (My Documents root).
  // - parentFolderId present: show documents inside that folder.

  await buildBreadcrumb();
  await loadFolders();
  if (currentParentFolderId) {
    await loadFolderDocuments();
  }
});
