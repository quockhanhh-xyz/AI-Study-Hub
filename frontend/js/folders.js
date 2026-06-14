/**
 * Folder Management UI controller for AI Study Hub.
 * Handles folder listing, creation, renaming, deletion, and document browsing per folder.
 * Relies on folder-api.js and document-api.js helpers — never uses raw fetch directly.
 */

document.addEventListener("DOMContentLoaded", async function () {

  // ── View containers ────────────────────────────────────────────────────────
  const folderListView = document.getElementById("folderListView");
  const folderDocView = document.getElementById("folderDocView");

  // ── Folder list elements ───────────────────────────────────────────────────
  const folderLoader = document.getElementById("folderLoader");
  const folderError = document.getElementById("folderError");
  const folderGrid = document.getElementById("folderGrid");
  const folderEmpty = document.getElementById("folderEmpty");

  // ── Folder document view elements ─────────────────────────────────────────
  const openFolderName = document.getElementById("openFolderName");
  const docLoader = document.getElementById("docLoader");
  const docError = document.getElementById("docError");
  const docGrid = document.getElementById("docGrid");
  const docEmpty = document.getElementById("docEmpty");
  const backToFoldersBtn = document.getElementById("backToFoldersBtn");

  // ── Buttons ────────────────────────────────────────────────────────────────
  const createFolderBtn = document.getElementById("createFolderBtn");
  const emptyCreateBtn = document.getElementById("emptyCreateBtn");

  // ── Create modal ───────────────────────────────────────────────────────────
  const createModal = document.getElementById("createModal");
  const createFolderName = document.getElementById("createFolderName");
  const createError = document.getElementById("createError");
  const createCancelBtn = document.getElementById("createCancelBtn");
  const createConfirmBtn = document.getElementById("createConfirmBtn");

  // ── Rename modal ───────────────────────────────────────────────────────────
  const renameModal = document.getElementById("renameModal");
  const renameFolderName = document.getElementById("renameFolderName");
  const renameError = document.getElementById("renameError");
  const renameCancelBtn = document.getElementById("renameCancelBtn");
  const renameConfirmBtn = document.getElementById("renameConfirmBtn");

  // ── Delete modal ───────────────────────────────────────────────────────────
  const deleteModal = document.getElementById("deleteModal");
  const deleteError = document.getElementById("deleteError");
  const deleteCancelBtn = document.getElementById("deleteCancelBtn");
  const deleteConfirmBtn = document.getElementById("deleteConfirmBtn");

  // ── State ──────────────────────────────────────────────────────────────────
  let editingFolderId = null;
  let deletingFolderId = null;

  // ── Helpers ────────────────────────────────────────────────────────────────

  function showFolderList() {
    folderListView.style.display = "block";
    folderDocView.style.display = "none";
  }

  function showFolderDocView(folderName) {
    folderListView.style.display = "none";
    folderDocView.style.display = "block";
    openFolderName.textContent = folderName || "Folder";
  }

  function openModal(overlay) {
    overlay.classList.add("open");
  }

  function closeModal(overlay) {
    overlay.classList.remove("open");
  }

  function showError(el, message) {
    el.textContent = message;
    el.style.display = "block";
  }

  function hideError(el) {
    el.textContent = "";
    el.style.display = "none";
  }

  // ── Folder list rendering ──────────────────────────────────────────────────

  function createFolderCard(folder) {
    const card = document.createElement("div");
    card.className = "folder-card";

    const icon = document.createElement("div");
    icon.className = "folder-icon";
    icon.textContent = "📁";

    const name = document.createElement("p");
    name.className = "folder-name";
    name.textContent = folder.name || "Untitled Folder";

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

    const openBtn = document.createElement("button");
    openBtn.type = "button";
    openBtn.className = "btn btn-primary btn-sm";
    openBtn.textContent = "Open";
    openBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      loadFolderDocuments(folder);
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

    actions.append(openBtn, renameBtn, deleteBtn);
    card.append(main, actions);

    card.addEventListener("click", function () {
      loadFolderDocuments(folder);
    });

    return card;
  }

  async function loadFolders() {
    folderLoader.style.display = "flex";
    folderGrid.style.display = "none";
    folderEmpty.style.display = "none";
    hideError(folderError);

    try {
      const result = await getMyFolders();
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

  // ── Folder document view ───────────────────────────────────────────────────

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
    titleLink.style.color = "inherit";
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

  async function loadFolderDocuments(folder) {
    showFolderDocView(folder.name);

    docLoader.style.display = "flex";
    docGrid.style.display = "none";
    docEmpty.style.display = "none";
    hideError(docError);

    try {
      // FIX #1: use getMyDocuments({ folderId }) instead of removed getDocumentsByFolder()
      const result = await getMyDocuments({ folderId: folder.folderId });
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

  // ── Create folder ──────────────────────────────────────────────────────────

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
      // FIX #2: pass object { name } instead of bare string
      await createFolder({ name });
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

  // ── Rename folder ──────────────────────────────────────────────────────────

  function openRenameModal(folder) {
    editingFolderId = folder.folderId;
    renameFolderName.value = folder.name || "";
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
      // FIX #3: pass object { name } instead of bare string
      await updateFolder(editingFolderId, { name });
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

  // ── Delete folder ──────────────────────────────────────────────────────────

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
      // FIX: show backend error message clearly (e.g. folder not empty rejection)
      showError(deleteError, error.message || "Failed to delete folder.");
    } finally {
      deleteConfirmBtn.disabled = false;
    }
  });

  // ── Back button ────────────────────────────────────────────────────────────

  backToFoldersBtn.addEventListener("click", function () {
    showFolderList();
  });

  // ── Close modals on overlay click ──────────────────────────────────────────

  [createModal, renameModal, deleteModal].forEach(function (overlay) {
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) closeModal(overlay);
    });
  });

  // ── Init ───────────────────────────────────────────────────────────────────

  await loadFolders();

});
