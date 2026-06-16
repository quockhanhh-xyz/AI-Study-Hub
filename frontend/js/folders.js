/**
 * Folder Management UI controller for AI Study Hub.
 * Supports URL-based subfolder navigation via ?parentFolderId=
 * Handles breadcrumb, folder listing, creation, renaming, deletion, and document browsing.
 * Relies on folder-api.js and document-api.js — never uses raw fetch directly.
 */

document.addEventListener("DOMContentLoaded", async function () {

  // ── View containers ──────────────────────────────────────────────────────────
  const folderListView = document.getElementById("folderListView");
  const folderDocView = document.getElementById("folderDocView");

  // ── Folder list elements ─────────────────────────────────────────────────────
  const folderLoader = document.getElementById("folderLoader");
  const folderError = document.getElementById("folderError");
  const folderGrid = document.getElementById("folderGrid");
  const folderEmpty = document.getElementById("folderEmpty");

  // ── Folder document view elements ────────────────────────────────────────────
  const docLoader = document.getElementById("docLoader");
  const docError = document.getElementById("docError");
  const docGrid = document.getElementById("docGrid");
  const docEmpty = document.getElementById("docEmpty");

  // ── Breadcrumb ───────────────────────────────────────────────────────────────
  const breadcrumb = document.getElementById("breadcrumb");

  // ── Buttons ──────────────────────────────────────────────────────────────────
  const createFolderBtn = document.getElementById("createFolderBtn");
  const emptyCreateBtn = document.getElementById("emptyCreateBtn");

  // ── Create modal ─────────────────────────────────────────────────────────────
  const createModal = document.getElementById("createModal");
  const createFolderName = document.getElementById("createFolderName");
  const createError = document.getElementById("createError");
  const createCancelBtn = document.getElementById("createCancelBtn");
  const createConfirmBtn = document.getElementById("createConfirmBtn");

  // ── Rename modal ─────────────────────────────────────────────────────────────
  const renameModal = document.getElementById("renameModal");
  const renameFolderName = document.getElementById("renameFolderName");
  const renameError = document.getElementById("renameError");
  const renameCancelBtn = document.getElementById("renameCancelBtn");
  const renameConfirmBtn = document.getElementById("renameConfirmBtn");

  // ── Delete modal ─────────────────────────────────────────────────────────────
  const deleteModal = document.getElementById("deleteModal");
  const deleteError = document.getElementById("deleteError");
  const deleteCancelBtn = document.getElementById("deleteCancelBtn");
  const deleteConfirmBtn = document.getElementById("deleteConfirmBtn");

  // ── State ────────────────────────────────────────────────────────────────────
  let editingFolderId = null;
  let deletingFolderId = null;

  // Breadcrumb trail: array of { folderId, name } from root to current folder.
  // Entry 0 is always My Documents (folderId: null).
  let breadcrumbTrail = [{ folderId: null, name: "My Documents" }];

  // The current parentFolderId being viewed. null = My Documents (root).
  const currentParentFolderId = getParentFolderIdFromUrl();

  // ── URL helpers ──────────────────────────────────────────────────────────────

  // Reads ?parentFolderId= from the current URL. Returns null if not present.
  function getParentFolderIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const val = params.get("parentFolderId");
    return val ? parseInt(val, 10) : null;
  }

  // Navigates to a subfolder by updating the URL and reloading.
  function navigateToFolder(folderId, folderName) {
    if (!folderId) {
      window.location.href = "folders.html";
      return;
    }
    window.location.href = `folders.html?parentFolderId=${folderId}`;
  }

  // ── Breadcrumb ───────────────────────────────────────────────────────────────

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
          chain.unshift({ folderId: folder.folderId, name: folder.folderName });
          folderId = folder.parentFolderId || null;
        } catch (e) {
          break;
        }
      }

      breadcrumbTrail = [{ folderId: null, name: "My Documents" }, ...chain];
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
        link.href = crumb.folderId ? `folders.html?parentFolderId=${crumb.folderId}` : "folders.html";
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

  // ── Modal helpers ────────────────────────────────────────────────────────────

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

  // ── Folder list rendering ────────────────────────────────────────────────────

  function createFolderCard(folder) {
    const card = document.createElement("div");
    card.className = "folder-card";

    const icon = document.createElement("div");
    icon.className = "folder-icon";
    icon.textContent = "📁";

    const name = document.createElement("p");
    name.className = "folder-name";
    name.textContent = folder.folderName || "Untitled Folder";

    const meta = document.createElement("p");
    meta.className = "folder-meta";
    meta.textContent = folder.createdAt
      ? new Date(folder.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" })
      : "";

    const main = document.createElement("div");
    main.className = "folder-card-main";
    main.append(icon, name, meta);

    const actions = document.createElement("div");
    actions.className = "folder-card-actions";

    // Open button — navigates into the folder via URL.
    const openBtn = document.createElement("button");
    openBtn.type = "button";
    openBtn.className = "btn btn-primary btn-sm";
    openBtn.textContent = "Open";
    openBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      navigateToFolder(folder.folderId, folder.folderName);
    });

    // Browse Files button — also opens the folder (same as Open).
    const browseBtn = document.createElement("button");
    browseBtn.type = "button";
    browseBtn.className = "btn btn-secondary btn-sm";
    browseBtn.textContent = "Browse Files";
    browseBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      navigateToFolder(folder.folderId, folder.folderName);
    });

    const renameBtn = document.createElement("button");
    renameBtn.type = "button";
    renameBtn.className = "btn btn-secondary btn-sm";
    renameBtn.textContent = "Rename";
    renameBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      openRenameModal(folder);
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "btn btn-danger btn-sm";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      openDeleteModal(folder.folderId);
    });

    actions.append(openBtn, browseBtn, renameBtn, deleteBtn);
    card.append(main, actions);

    // Clicking the card itself also opens the folder.
    card.addEventListener("click", function () {
      navigateToFolder(folder.folderId, folder.folderName);
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

  // ── Document view (inside a folder) ─────────────────────────────────────────

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
    folderListView.style.display = "none";
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

  // ── Create folder ────────────────────────────────────────────────────────────

  function openCreateModal() {
    createFolderName.value = "";
    hideError(createError);
    openModal(createModal);
    createFolderName.focus();
  }

  createFolderBtn.addEventListener("click", openCreateModal);
  emptyCreateBtn.addEventListener("click", openCreateModal);
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

  // ── Rename folder ────────────────────────────────────────────────────────────

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

  // ── Delete folder ────────────────────────────────────────────────────────────

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
      await loadFolders();
    } catch (error) {
      showError(deleteError, error.message || "Failed to delete folder.");
    } finally {
      deleteConfirmBtn.disabled = false;
    }
  });

  // ── Close modals on overlay click ────────────────────────────────────────────

  [createModal, renameModal, deleteModal].forEach(function (overlay) {
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) closeModal(overlay);
    });
  });

  // ── Init ─────────────────────────────────────────────────────────────────────
  // Build breadcrumb first, then decide what to show based on the URL.
  // - No parentFolderId in URL → show folder grid (My Documents root).
  // - parentFolderId present → show documents inside that folder.

  await buildBreadcrumb();
  await loadFolders();
  if (currentParentFolderId) {
    await loadFolderDocuments();
  }
});