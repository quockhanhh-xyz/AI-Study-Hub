document.addEventListener("DOMContentLoaded", async function () {
  const trashLoader = document.getElementById("trashLoader");
  const trashError = document.getElementById("trashError");
  const trashContent = document.getElementById("trashContent");
  const trashEmpty = document.getElementById("trashEmpty");
  const folderTrashGrid = document.getElementById("folderTrashGrid");
  const folderTrashEmpty = document.getElementById("folderTrashEmpty");
  const documentTrashGrid = document.getElementById("documentTrashGrid");
  const documentTrashEmpty = document.getElementById("documentTrashEmpty");

  const confirmModal = document.getElementById("confirmModal");
  const confirmTitle = document.getElementById("confirmTitle");
  const confirmMessage = document.getElementById("confirmMessage");
  const confirmError = document.getElementById("confirmError");
  const cancelPermanentDeleteBtn = document.getElementById("cancelPermanentDeleteBtn");
  const confirmPermanentDeleteBtn = document.getElementById("confirmPermanentDeleteBtn");

  let pendingPermanentDelete = null;

  function showLoading() {
    trashLoader.style.display = "flex";
    trashError.style.display = "none";
    trashContent.style.display = "none";
    trashEmpty.style.display = "none";
  }

  function showError(message) {
    trashLoader.style.display = "none";
    trashContent.style.display = "none";
    trashEmpty.style.display = "none";
    trashError.textContent = message;
    trashError.style.display = "flex";
  }

  function formatFileSize(bytes) {
    if (bytes === undefined || bytes === null) return "-";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  function formatDate(value) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit"
    });
  }

  function createMetaItem(label, value) {
    const item = document.createElement("span");
    item.textContent = `${label}: ${value}`;
    return item;
  }

  function setButtonLoading(button, label) {
    button.disabled = true;
    button.dataset.originalText = button.textContent;
    button.textContent = label;
  }

  function resetButton(button) {
    button.disabled = false;
    button.textContent = button.dataset.originalText || button.textContent;
  }

  function openPermanentDeleteModal(item) {
    pendingPermanentDelete = item;
    confirmTitle.textContent = `Permanently delete ${item.type}?`;
    confirmMessage.textContent = `"${item.name}" will be permanently deleted. This action cannot be undone.`;
    confirmError.style.display = "none";
    confirmError.textContent = "";
    confirmModal.classList.add("open");
  }

  function closePermanentDeleteModal() {
    pendingPermanentDelete = null;
    confirmModal.classList.remove("open");
    confirmError.style.display = "none";
    confirmError.textContent = "";
  }

  async function restoreItem(type, id, button) {
    setButtonLoading(button, "Restoring...");

    try {
      if (type === "folder") {
        await restoreFolder(id);
      } else {
        await restoreDocument(id);
      }
      await loadTrash();
    } catch (error) {
      resetButton(button);
      showError(error.message || `Failed to restore ${type}.`);
    }
  }

  async function permanentlyDeletePendingItem() {
    if (!pendingPermanentDelete) return;

    setButtonLoading(confirmPermanentDeleteBtn, "Deleting...");

    try {
      if (pendingPermanentDelete.type === "folder") {
        await permanentDeleteFolder(pendingPermanentDelete.id);
      } else {
        await permanentDeleteDocument(pendingPermanentDelete.id);
      }
      closePermanentDeleteModal();
      await loadTrash();
    } catch (error) {
      confirmError.textContent = error.message || "Failed to permanently delete item.";
      confirmError.style.display = "block";
    } finally {
      resetButton(confirmPermanentDeleteBtn);
    }
  }

  function createTrashDocumentCard(documentItem) {
    const card = document.createElement("article");
    card.className = "document-card";

    const header = document.createElement("div");
    header.className = "document-card-header";

    const badge = document.createElement("span");
    badge.className = "document-type-badge";
    badge.textContent = (documentItem.fileType || "FILE").toUpperCase();

    const title = document.createElement("h3");
    title.textContent = documentItem.title || documentItem.originalFileName || "Untitled document";

    header.append(badge, title);

    const description = document.createElement("p");
    description.className = "document-description";
    description.textContent = documentItem.originalFileName || "Deleted document.";

    const meta = document.createElement("div");
    meta.className = "document-meta";
    meta.append(
      createMetaItem("Size", formatFileSize(documentItem.fileSize)),
      createMetaItem("Deleted", formatDate(documentItem.deletedAt))
    );

    if (documentItem.folderId) {
      meta.append(createMetaItem("Folder ID", documentItem.folderId));
    }

    const actions = document.createElement("div");
    actions.className = "trash-actions";

    const restoreButton = document.createElement("button");
    restoreButton.type = "button";
    restoreButton.className = "btn btn-secondary";
    restoreButton.textContent = "Restore";
    restoreButton.addEventListener("click", function () {
      restoreItem("document", documentItem.documentId, restoreButton);
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "btn btn-danger";
    deleteButton.textContent = "Delete Permanently";
    deleteButton.addEventListener("click", function () {
      openPermanentDeleteModal({
        type: "document",
        id: documentItem.documentId,
        name: documentItem.title || documentItem.originalFileName || "Untitled document"
      });
    });

    actions.append(restoreButton, deleteButton);
    card.append(header, description, meta, actions);

    return card;
  }

  function createTrashFolderCard(folderItem) {
    const card = document.createElement("article");
    card.className = "document-card";

    const header = document.createElement("div");
    header.className = "document-card-header";

    const badge = document.createElement("span");
    badge.className = "document-type-badge";
    badge.textContent = "DIR";

    const title = document.createElement("h3");
    title.textContent = folderItem.name || "Untitled folder";

    header.append(badge, title);

    const description = document.createElement("p");
    description.className = "document-description";
    description.textContent = "Deleted folder. Restoring it also restores documents deleted with it.";

    const meta = document.createElement("div");
    meta.className = "document-meta";
    meta.append(
      createMetaItem("Folder ID", folderItem.folderId),
      createMetaItem("Deleted", formatDate(folderItem.deletedAt))
    );

    const actions = document.createElement("div");
    actions.className = "trash-actions";

    const restoreButton = document.createElement("button");
    restoreButton.type = "button";
    restoreButton.className = "btn btn-secondary";
    restoreButton.textContent = "Restore";
    restoreButton.addEventListener("click", function () {
      restoreItem("folder", folderItem.folderId, restoreButton);
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "btn btn-danger";
    deleteButton.textContent = "Delete Permanently";
    deleteButton.addEventListener("click", function () {
      openPermanentDeleteModal({
        type: "folder",
        id: folderItem.folderId,
        name: folderItem.name || "Untitled folder"
      });
    });

    actions.append(restoreButton, deleteButton);
    card.append(header, description, meta, actions);

    return card;
  }

  function renderTrashItems(documents, folders) {
    trashLoader.style.display = "none";

    const hasDocuments = documents.length > 0;
    const hasFolders = folders.length > 0;

    if (!hasDocuments && !hasFolders) {
      trashContent.style.display = "none";
      trashEmpty.style.display = "block";
      return;
    }

    trashEmpty.style.display = "none";
    trashContent.style.display = "block";

    folderTrashGrid.innerHTML = "";
    if (hasFolders) {
      folders.forEach(function (folderItem) {
        folderTrashGrid.appendChild(createTrashFolderCard(folderItem));
      });
      folderTrashGrid.style.display = "grid";
      folderTrashEmpty.style.display = "none";
    } else {
      folderTrashGrid.style.display = "none";
      folderTrashEmpty.style.display = "block";
    }

    documentTrashGrid.innerHTML = "";
    if (hasDocuments) {
      documents.forEach(function (documentItem) {
        documentTrashGrid.appendChild(createTrashDocumentCard(documentItem));
      });
      documentTrashGrid.style.display = "grid";
      documentTrashEmpty.style.display = "none";
    } else {
      documentTrashGrid.style.display = "none";
      documentTrashEmpty.style.display = "block";
    }
  }

  async function loadTrash() {
    showLoading();

    try {
      const result = await getTrash();
      const data = result.data || {};
      const documents = Array.isArray(data.documents) ? data.documents : [];
      const folders = Array.isArray(data.folders) ? data.folders : [];
      renderTrashItems(documents, folders);
    } catch (error) {
      showError(error.message || "Failed to load trash.");
    }
  }

  cancelPermanentDeleteBtn.addEventListener("click", closePermanentDeleteModal);
  confirmPermanentDeleteBtn.addEventListener("click", permanentlyDeletePendingItem);

  confirmModal.addEventListener("click", function (event) {
    if (event.target === confirmModal) {
      closePermanentDeleteModal();
    }
  });

  await loadTrash();
});
