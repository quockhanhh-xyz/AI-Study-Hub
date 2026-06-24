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
  // My Documents is always the first crumb; subsequent crumbs come from
  // resolving parent folder names via the API.
  async function buildBreadcrumb() {
    breadcrumbTrail = [{ folderId: null, name: "My Documents" }];

    if (currentParentFolderId) {
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
          }
          chain.unshift({ folderId: folder.folderId, name: folder.folderName });
          folderId = folder.parentFolderId || null;
        } catch (e) {
          break;
        }
      }

      breadcrumbTrail = [{ folderId: null, name: "My Documents" }, ...chain];
    } else {
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
        sep.textContent = " / ";
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

  // Folder list rendering

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

    const main = document.createElement("div");
    main.className = "folder-card-main";
    main.append(icon, name, meta);

    const actions = document.createElement("div");
    actions.className = "folder-card-actions";

    // Browse Files and Open buttons removed — clicking the card is sufficient
    const renameBtn = document.createElement("button");
    renameBtn.type = "button";
    renameBtn.className = "btn btn-secondary btn-sm";
    renameBtn.textContent = "Rename";
    renameBtn.addEventListener("click", function (e) {
      e.stopPropagation(); // Prevent card click from triggering folder navigation
      openRenameModal(folder);
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "btn btn-danger btn-sm";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", function (e) {
      e.stopPropagation(); //  Prevent card click from triggering folder navigation
      openDeleteModal(folder.folderId);
    });

    actions.append(renameBtn, deleteBtn);
    card.append(main, actions);

    // Clicking anywhere on the card navigates into the folder
    card.addEventListener("click", function () {
      navigateToFolder(folder.folderId);
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
        folderEmpty.style.display = "block";
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

    const header = document.createElement("div");
    header.className = "document-card-header";

    const badge = document.createElement("span");
    badge.className = "document-type-badge";
    badge.textContent = (doc.fileType || "FILE").toUpperCase();

    const titleEl = document.createElement("h3");
    const titleLink = document.createElement("a");
    titleLink.href = `document-detail.html?id=${doc.documentId}`;
    titleLink.textContent = doc.title || doc.originalFileName || "Untitled";
    titleLink.className = "document-title-link";
    titleEl.appendChild(titleLink);

    header.append(badge, titleEl);

    const desc = document.createElement("p");
    desc.className = "document-description";
    desc.textContent = doc.description || "No description provided.";

    const actions = document.createElement("div");
    actions.className = "document-actions";

    const viewBtn = document.createElement("a");
    viewBtn.href = `document-detail.html?id=${doc.documentId}`;
    viewBtn.className = "btn btn-primary document-detail-btn";
    viewBtn.textContent = "View Details";

    actions.appendChild(viewBtn);
    card.append(header, desc, actions);
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
        docEmpty.style.display = "block";
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
      showError(createError, error.message || "Failed to create folder.");
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

  function openDeleteModal(folderId) {
    deletingFolderId = folderId;
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

        const emailSpan = document.createElement("span");
        emailSpan.className = "share-email";
        emailSpan.textContent = share.sharedWithEmail;

        const typeSpan = document.createElement("span");
        typeSpan.className = "share-type";
        typeSpan.textContent = " (User)";

        info.append(emailSpan, typeSpan);

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
    if (shareFolderBtn) {
      shareFolderBtn.style.display = "flex";
      shareFolderBtn.addEventListener("click", async () => {
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
      });
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
      showError(shareUserError, err.message || "Failed to share folder with user.");
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
      showError(shareGroupError, err.message || "Failed to share folder with group.");
    } finally {
      shareGroupConfirmBtn.disabled = false;
    }
  });

  shareFolderCloseBtn.addEventListener("click", () => {
    closeModal(shareFolderModal);
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
