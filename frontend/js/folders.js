document.addEventListener("DOMContentLoaded", async function () {

    // ── DOM refs — Folder List Panel ──────────────────────────────────────────
    const folderListPanel = document.getElementById("folderListPanel");
    const folderLoader = document.getElementById("folderLoader");
    const folderError = document.getElementById("folderError");
    const folderGrid = document.getElementById("folderGrid");
    const folderEmptyState = document.getElementById("folderEmptyState");
    const openCreateModalBtn = document.getElementById("openCreateModalBtn");
    const emptyCreateBtn = document.getElementById("emptyCreateBtn");

    // ── DOM refs — Folder Detail Panel ────────────────────────────────────────
    const folderDetailPanel = document.getElementById("folderDetailPanel");
    const folderDetailName = document.getElementById("folderDetailName");
    const folderDetailMeta = document.getElementById("folderDetailMeta");
    const backToFoldersBtn = document.getElementById("backToFoldersBtn");
    const folderDocLoader = document.getElementById("folderDocLoader");
    const folderDocError = document.getElementById("folderDocError");
    const folderDocGrid = document.getElementById("folderDocGrid");
    const folderDocEmptyState = document.getElementById("folderDocEmptyState");

    // ── DOM refs — Create Modal ────────────────────────────────────────────────
    const createFolderModal = document.getElementById("createFolderModal");
    const createFolderName = document.getElementById("createFolderName");
    const createFolderError = document.getElementById("createFolderError");
    const cancelCreateBtn = document.getElementById("cancelCreateBtn");
    const confirmCreateBtn = document.getElementById("confirmCreateBtn");

    // ── DOM refs — Edit Modal ──────────────────────────────────────────────────
    const editFolderModal = document.getElementById("editFolderModal");
    const editFolderName = document.getElementById("editFolderName");
    const editFolderError = document.getElementById("editFolderError");
    const cancelEditBtn = document.getElementById("cancelEditBtn");
    const confirmEditBtn = document.getElementById("confirmEditBtn");

    // ── DOM refs — Delete Modal ────────────────────────────────────────────────
    const deleteFolderModal = document.getElementById("deleteFolderModal");
    const deleteModalDesc = document.getElementById("deleteModalDesc");
    const deleteFolderError = document.getElementById("deleteFolderError");
    const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");
    const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");

    // ── State ──────────────────────────────────────────────────────────────────
    let editingFolderId = null;   // folder currently being edited
    let deletingFolderId = null;   // folder currently being deleted
    let currentFolderId = null;   // folder currently being viewed

    // ══════════════════════════════════════════════════════════════════════════
    // HELPERS — Modal
    // ══════════════════════════════════════════════════════════════════════════

    function openModal(modal) {
        modal.style.display = "flex";
    }

    function closeModal(modal) {
        modal.style.display = "none";
    }

    // Close modal when clicking the overlay outside the modal box
    document.querySelectorAll(".modal-overlay").forEach(function (overlay) {
        overlay.addEventListener("click", function (e) {
            if (e.target === overlay) {
                closeModal(overlay);
            }
        });
    });

    // ══════════════════════════════════════════════════════════════════════════
    // HELPERS — UI state
    // ══════════════════════════════════════════════════════════════════════════

    function showFolderLoading() {
        folderLoader.style.display = "flex";
        folderGrid.style.display = "none";
        folderEmptyState.style.display = "none";
        folderError.style.display = "none";
    }

    function showFolderError(message) {
        folderLoader.style.display = "none";
        folderGrid.style.display = "none";
        folderEmptyState.style.display = "none";
        folderError.style.display = "block";
        folderError.textContent = message;
    }

    function showFolderDocLoading() {
        folderDocLoader.style.display = "flex";
        folderDocGrid.style.display = "none";
        folderDocEmptyState.style.display = "none";
        folderDocError.style.display = "none";
    }

    function showFolderDocError(message) {
        folderDocLoader.style.display = "none";
        folderDocGrid.style.display = "none";
        folderDocEmptyState.style.display = "none";
        folderDocError.style.display = "block";
        folderDocError.textContent = message;
    }

    function showModalError(errorEl, message) {
        errorEl.style.display = "block";
        errorEl.textContent = message;
    }

    function hideModalError(errorEl) {
        errorEl.style.display = "none";
        errorEl.textContent = "";
    }

    // ══════════════════════════════════════════════════════════════════════════
    // HELPERS — Render
    // ══════════════════════════════════════════════════════════════════════════

    function formatDate(value) {
        if (!value) return "-";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "-";
        return date.toLocaleDateString("en-US", {
            year: "numeric", month: "short", day: "2-digit"
        });
    }

    function formatFileSize(bytes) {
        if (bytes === undefined || bytes === null) return "-";
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }

    /*
    * Create a folder card for the folder list
    */
    function createFolderCard(folder) {
        const card = document.createElement("article");
        card.className = "folder-card";

        // Icon + Name
        const cardMain = document.createElement("div");
        cardMain.className = "folder-card-main";

        const icon = document.createElement("span");
        icon.className = "folder-icon";
        icon.textContent = "📁";

        const name = document.createElement("h3");
        name.className = "folder-name";
        name.textContent = folder.name;

        const meta = document.createElement("p");
        meta.className = "folder-meta";
        meta.textContent = `Created ${formatDate(folder.createdAt)}`;

        cardMain.append(icon, name, meta);

        // Actions
        const actions = document.createElement("div");
        actions.className = "folder-card-actions";

        const openBtn = document.createElement("button");
        openBtn.type = "button";
        openBtn.className = "btn btn-primary btn-sm";
        openBtn.textContent = "Open";
        openBtn.addEventListener("click", function () {
            openFolderDetail(folder);
        });

        const editBtn = document.createElement("button");
        editBtn.type = "button";
        editBtn.className = "btn btn-secondary btn-sm";
        editBtn.textContent = "Rename";
        editBtn.addEventListener("click", function () {
            openEditModal(folder);
        });

        const deleteBtn = document.createElement("button");
        deleteBtn.type = "button";
        deleteBtn.className = "btn btn-danger btn-sm";
        deleteBtn.textContent = "Delete";
        deleteBtn.addEventListener("click", function () {
            openDeleteModal(folder);
        });

        actions.append(openBtn, editBtn, deleteBtn);
        card.append(cardMain, actions);

        return card;
    }

    /*
     * Create a document card for the folder detail view (same style as dashboard)
     */
    function createDocumentCard(doc) {
        const card = document.createElement("article");
        card.className = "document-card";

        const header = document.createElement("div");
        header.className = "document-card-header";

        const badge = document.createElement("span");
        badge.className = "document-type-badge";
        badge.textContent = (doc.fileType || "FILE").toUpperCase();

        const title = document.createElement("h3");
        const titleLink = document.createElement("a");
        titleLink.href = `document-detail.html?id=${doc.documentId}`;
        titleLink.textContent = doc.title || doc.originalFileName || "Untitled";
        titleLink.style.color = "inherit";
        title.appendChild(titleLink);

        header.append(badge, title);

        const description = document.createElement("p");
        description.className = "document-description";
        description.textContent = doc.description || "No description provided.";

        const meta = document.createElement("div");
        meta.className = "document-meta";

        const sizeSpan = document.createElement("span");
        sizeSpan.textContent = `Size: ${formatFileSize(doc.fileSize)}`;

        const dateSpan = document.createElement("span");
        dateSpan.textContent = `Uploaded: ${formatDate(doc.createdAt)}`;

        meta.append(sizeSpan, dateSpan);

        const actions = document.createElement("div");
        actions.className = "document-actions";

        const detailBtn = document.createElement("a");
        detailBtn.href = `document-detail.html?id=${doc.documentId}`;
        detailBtn.className = "btn btn-primary document-detail-btn";
        detailBtn.textContent = "View Details";

        const openBtn = document.createElement("button");
        openBtn.type = "button";
        openBtn.className = "btn btn-secondary document-open-btn";
        openBtn.textContent = "Open File";
        openBtn.disabled = !doc.fileUrl;
        openBtn.addEventListener("click", function () {
            if (doc.fileUrl) window.open(doc.fileUrl, "_blank", "noopener");
        });

        actions.append(detailBtn, openBtn);
        card.append(header, description, meta, actions);

        return card;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // LOAD — Folder list
    // ══════════════════════════════════════════════════════════════════════════

    async function loadFolders() {
        showFolderLoading();

        try {
            const result = await getMyFolders();
            const folders = Array.isArray(result.data) ? result.data : [];

            folderLoader.style.display = "none";

            if (folders.length === 0) {
                folderEmptyState.style.display = "block";
                return;
            }

            folderGrid.innerHTML = "";
            folders.forEach(function (folder) {
                folderGrid.appendChild(createFolderCard(folder));
            });
            folderGrid.style.display = "grid";

        } catch (err) {
            showFolderError(err.message || "Failed to load folders.");
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // LOAD — Documents inside a folder
    // ══════════════════════════════════════════════════════════════════════════

    async function openFolderDetail(folder) {
        currentFolderId = folder.folderId;

        // Switch to detail panel
        folderListPanel.style.display = "none";
        folderDetailPanel.style.display = "block";
        folderDetailName.textContent = folder.name;
        folderDetailMeta.textContent = `Documents inside "${folder.name}".`;

        showFolderDocLoading();

        try {
            const result = await getDocumentsByFolder(folder.folderId);
            const documents = Array.isArray(result.data) ? result.data : [];

            folderDocLoader.style.display = "none";

            if (documents.length === 0) {
                folderDocEmptyState.style.display = "block";
                return;
            }

            folderDocGrid.innerHTML = "";
            documents.forEach(function (doc) {
                folderDocGrid.appendChild(createDocumentCard(doc));
            });
            folderDocGrid.style.display = "grid";

        } catch (err) {
            showFolderDocError(err.message || "Failed to load documents.");
        }
    }

    // Back button
    backToFoldersBtn.addEventListener("click", function () {
        currentFolderId = null;
        folderDetailPanel.style.display = "none";
        folderListPanel.style.display = "block";
    });

    // ══════════════════════════════════════════════════════════════════════════
    // CREATE FOLDER
    // ══════════════════════════════════════════════════════════════════════════

    function openCreateModal() {
        createFolderName.value = "";
        hideModalError(createFolderError);
        openModal(createFolderModal);
        createFolderName.focus();
    }

    openCreateModalBtn.addEventListener("click", openCreateModal);
    emptyCreateBtn.addEventListener("click", openCreateModal);

    cancelCreateBtn.addEventListener("click", function () {
        closeModal(createFolderModal);
    });

    confirmCreateBtn.addEventListener("click", async function () {
        const name = createFolderName.value.trim();

        if (!name) {
            showModalError(createFolderError, "Folder name is required.");
            createFolderName.focus();
            return;
        }

        confirmCreateBtn.disabled = true;
        confirmCreateBtn.textContent = "Creating...";
        hideModalError(createFolderError);

        try {
            await createFolder(name);
            closeModal(createFolderModal);
            await loadFolders();

        } catch (err) {
            showModalError(createFolderError, err.message || "Failed to create folder.");

        } finally {
            confirmCreateBtn.disabled = false;
            confirmCreateBtn.textContent = "Create";
        }
    });

    // Enter key for folder creation input
    createFolderName.addEventListener("keydown", function (e) {
        if (e.key === "Enter") confirmCreateBtn.click();
    });

    // ══════════════════════════════════════════════════════════════════════════
    // EDIT FOLDER
    // ══════════════════════════════════════════════════════════════════════════

    function openEditModal(folder) {
        editingFolderId = folder.folderId;
        editFolderName.value = folder.name;
        hideModalError(editFolderError);
        openModal(editFolderModal);
        editFolderName.focus();
    }

    cancelEditBtn.addEventListener("click", function () {
        closeModal(editFolderModal);
    });

    confirmEditBtn.addEventListener("click", async function () {
        const name = editFolderName.value.trim();

        if (!name) {
            showModalError(editFolderError, "Folder name is required.");
            editFolderName.focus();
            return;
        }

        confirmEditBtn.disabled = true;
        confirmEditBtn.textContent = "Saving...";
        hideModalError(editFolderError);

        try {
            await updateFolder(editingFolderId, name);
            closeModal(editFolderModal);
            editingFolderId = null;
            await loadFolders();

        } catch (err) {
            showModalError(editFolderError, err.message || "Failed to rename folder.");

        } finally {
            confirmEditBtn.disabled = false;
            confirmEditBtn.textContent = "Save";
        }
    });

    // Enter key for folder rename input
    editFolderName.addEventListener("keydown", function (e) {
        if (e.key === "Enter") confirmEditBtn.click();
    });

    // ══════════════════════════════════════════════════════════════════════════
    // DELETE FOLDER
    // ══════════════════════════════════════════════════════════════════════════

    function openDeleteModal(folder) {
        deletingFolderId = folder.folderId;
        deleteModalDesc.textContent =
            `Move "${folder.name}" to trash? Documents inside will also be moved to trash.`;
        hideModalError(deleteFolderError);
        openModal(deleteFolderModal);
    }

    cancelDeleteBtn.addEventListener("click", function () {
        closeModal(deleteFolderModal);
    });

    confirmDeleteBtn.addEventListener("click", async function () {
        confirmDeleteBtn.disabled = true;
        confirmDeleteBtn.textContent = "Deleting...";
        hideModalError(deleteFolderError);

        try {
            await deleteFolder(deletingFolderId);
            closeModal(deleteFolderModal);
            deletingFolderId = null;
            await loadFolders();

        } catch (err) {
            // Backend reject (e.g., if backend later adds a rule preventing deletion of non-empty folders)
            showModalError(deleteFolderError, err.message || "Failed to delete folder.");

        } finally {
            confirmDeleteBtn.disabled = false;
            confirmDeleteBtn.textContent = "Move to Trash";
        }
    });

    // ══════════════════════════════════════════════════════════════════════════
    // INIT
    // ══════════════════════════════════════════════════════════════════════════

    await loadFolders();

});
