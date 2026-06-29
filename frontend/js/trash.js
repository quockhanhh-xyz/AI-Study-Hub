document.addEventListener("DOMContentLoaded", async function () {
  if (window.authReady) {
    const isAuthenticated = await window.authReady;
    if (!isAuthenticated) return;
  }

  // General list containers
  const trashLoader = document.getElementById("trashLoader");
  const trashError = document.getElementById("trashError");
  const trashContent = document.getElementById("trashContent");
  const trashEmpty = document.getElementById("trashEmpty");

  // Single permanent delete modal
  const confirmModal = document.getElementById("confirmModal");
  const confirmTitle = document.getElementById("confirmTitle");
  const confirmMessage = document.getElementById("confirmMessage");
  const confirmError = document.getElementById("confirmError");
  const cancelPermanentDeleteBtn = document.getElementById("cancelPermanentDeleteBtn");
  const confirmPermanentDeleteBtn = document.getElementById("confirmPermanentDeleteBtn");

  // Empty Trash elements
  const emptyTrashBtn = document.getElementById("emptyTrashBtn");
  const emptyTrashModal = document.getElementById("emptyTrashModal");
  const cancelEmptyTrashBtn = document.getElementById("cancelEmptyTrashBtn");
  const confirmEmptyTrashBtn = document.getElementById("confirmEmptyTrashBtn");
  const emptyTrashError = document.getElementById("emptyTrashError");

  // State tracker
  let pendingPermanentDelete = null;
  let lastActiveElement = null;

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

  function formatDateKey(value) {
    if (!value) return "Unknown Date";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Unknown Date";

    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    }

    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
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

  // Accessibility Focus Trap setup helper
  function setupFocusTrap(modal) {
    modal.addEventListener("keydown", function (e) {
      if (e.key !== "Tab") return;

      const focusableElements = modal.querySelectorAll(
        'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, [tabindex="0"], [contenteditable]'
      );

      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    });
  }

  function openModal(overlay) {
    lastActiveElement = document.activeElement;
    overlay.classList.add("open");
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");

    const focusable = overlay.querySelectorAll('button, [tabindex="0"]');
    if (focusable.length > 0) {
      setTimeout(() => focusable[0].focus(), 50);
    }
  }

  function closeModal(overlay) {
    overlay.classList.remove("open");
    if (lastActiveElement && typeof lastActiveElement.focus === "function") {
      lastActiveElement.focus();
    }
  }

  // Permanent Delete Modal methods
  function openPermanentDeleteModal(item) {
    pendingPermanentDelete = item;
    confirmTitle.textContent = `Permanently delete ${item.type}?`;
    confirmMessage.textContent = `"${item.name}" will be permanently deleted. This action cannot be undone.`;
    confirmError.style.display = "none";
    confirmError.textContent = "";
    openModal(confirmModal);
  }

  function closePermanentDeleteModal() {
    closeModal(confirmModal);
    pendingPermanentDelete = null;
    confirmError.style.display = "none";
    confirmError.textContent = "";
  }

  // Empty Trash Modal methods
  function openEmptyTrashModal() {
    emptyTrashError.style.display = "none";
    emptyTrashError.textContent = "";
    openModal(emptyTrashModal);
  }

  function closeEmptyTrashModal() {
    closeModal(emptyTrashModal);
    emptyTrashError.style.display = "none";
    emptyTrashError.textContent = "";
  }

  // Operations
  async function restoreItem(type, id, button) {
    setButtonLoading(button, "Restoring...");
    try {
      if (type === "folder") {
        await restoreFolder(id);
      } else {
        await restoreDocument(id);
      }
      window.showToast(`${type === "folder" ? "Folder" : "Document"} restored successfully.`, "success");
      await loadTrash();
    } catch (error) {
      resetButton(button);
      showError(error.message || `Failed to restore ${type}.`);
    }
  }

  async function permanentlyDeletePendingItem() {
    if (!pendingPermanentDelete) return;
    setButtonLoading(confirmPermanentDeleteBtn, "Deleting...");
    const itemName = pendingPermanentDelete.name;
    const itemType = pendingPermanentDelete.type;
    try {
      if (itemType === "folder") {
        await permanentDeleteFolder(pendingPermanentDelete.id);
      } else {
        await permanentDeleteDocument(pendingPermanentDelete.id);
      }
      closePermanentDeleteModal();
      window.showToast(`"${itemName}" has been permanently deleted.`, "success");
      await loadTrash();
    } catch (error) {
      confirmError.textContent = error.message || "Failed to permanently delete item.";
      confirmError.style.display = "block";
    } finally {
      resetButton(confirmPermanentDeleteBtn);
    }
  }

  async function handleEmptyTrash() {
    setButtonLoading(confirmEmptyTrashBtn, "Emptying...");
    emptyTrashError.style.display = "none";
    emptyTrashError.textContent = "";
    try {
      const result = await emptyTrash();
      const outcome = result?.data?.outcome || "SUCCESS";
      const deletedCount = result?.data?.deletedCount || 0;
      const failedCount = result?.data?.failedCount || 0;

      if (outcome === "SUCCESS") {
        closeEmptyTrashModal();
        window.showToast(`Trash has been emptied successfully (${deletedCount} items deleted).`, "success");
        await loadTrash();
      } else {
        emptyTrashError.innerHTML = "";

        const summaryDiv = document.createElement("div");
        summaryDiv.className = "error-summary";
        const summaryStrong = document.createElement("strong");
        summaryStrong.textContent = `Trash emptying outcome: ${outcome}`;
        summaryDiv.appendChild(summaryStrong);

        const statsDiv = document.createElement("div");
        statsDiv.className = "error-stats";
        statsDiv.textContent = `Deleted: ${deletedCount} item(s), Failed: ${failedCount} item(s)`;

        emptyTrashError.appendChild(summaryDiv);
        emptyTrashError.appendChild(statsDiv);

        const failures = result?.data?.failures || [];
        if (failures.length > 0) {
          const ul = document.createElement("ul");
          ul.className = "error-list";
          ul.style.textAlign = "left";
          ul.style.marginTop = "10px";
          ul.style.maxHeight = "150px";
          ul.style.overflowY = "auto";
          ul.style.paddingLeft = "20px";

          failures.forEach(f => {
            const li = document.createElement("li");
            const strongTitle = document.createElement("strong");
            strongTitle.textContent = f.title || "Unknown Item";
            li.appendChild(strongTitle);

            const reasonSpan = document.createElement("span");
            reasonSpan.textContent = `: ${f.reason || "Cloudinary deletion failed"}`;
            li.appendChild(reasonSpan);

            ul.appendChild(li);
          });
          emptyTrashError.appendChild(ul);
        }

        emptyTrashError.style.display = "block";

        if (deletedCount > 0) {
          await loadTrash();
        }
      }
    } catch (error) {
      emptyTrashError.textContent = error.message || "Failed to empty trash.";
      emptyTrashError.style.display = "block";
    } finally {
      resetButton(confirmEmptyTrashBtn);
    }
  }

  function createTrashDocumentCard(documentItem) {
    const card = document.createElement("article");
    card.className = "document-card";

    // Left Column: The Large File Type Icon
    const iconContainer = document.createElement("div");
    iconContainer.innerHTML = getFileTypeIcon(documentItem.fileType);
    const iconWrapper = iconContainer.firstElementChild;
    card.appendChild(iconWrapper);

    // Right Column: The Details Column
    const content = document.createElement("div");
    content.className = "document-card-content";

    const header = document.createElement("div");
    header.className = "document-card-header";

    const title = document.createElement("h3");
    title.textContent = documentItem.title || documentItem.originalFileName || "Untitled document";
    header.appendChild(title);

    const description = document.createElement("p");
    description.className = "document-description";
    description.textContent = documentItem.originalFileName || "Deleted document.";

    const meta = document.createElement("div");
    meta.className = "document-meta";

    const dateItem = document.createElement("span");
    dateItem.className = "document-meta-item";
    dateItem.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="12" width="12" stroke="currentColor" stroke-width="2.5" style="vertical-align: -1px; margin-right: 4px;"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> Xóa ngày: ${formatDate(documentItem.deletedAt)}`;
    meta.append(dateItem);

    const sizeItem = document.createElement("span");
    sizeItem.className = "document-meta-item";
    sizeItem.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="12" width="12" stroke="currentColor" stroke-width="2.5" style="vertical-align: -1px; margin-right: 4px;"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82zM7 7h.01"/></svg> Dung lượng: ${formatFileSize(documentItem.fileSize)}`;
    meta.append(sizeItem);

    const actions = document.createElement("div");
    actions.className = "trash-actions";
    actions.style.marginTop = "8px";

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
    content.append(header, description, meta, actions);
    card.appendChild(content);

    return card;
  }

  function createTrashFolderCard(folderItem) {
    const card = document.createElement("article");
    card.className = "document-card";

    // Left Column: The Folder Icon
    const iconWrapper = document.createElement("div");
    iconWrapper.className = "document-file-icon-wrapper file-icon-other";
    iconWrapper.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="22" width="22"><path stroke="currentColor" stroke-width="1.8" d="M1.5 10V2.5h5l3 3h11v3m3 0.25V8.5H4.6 l-0.15 0.25 -0.234 0.492A28 28 0 0 0 1.5 21.272v0.228h19v-0.128a28 28 0 0 1 2.757 -12.116l0.243 -0.506Z"/></svg>`;
    card.appendChild(iconWrapper);

    // Right Column: The Details Column
    const content = document.createElement("div");
    content.className = "document-card-content";

    const header = document.createElement("div");
    header.className = "document-card-header";

    const title = document.createElement("h3");
    title.textContent = folderItem.folderName || "Untitled folder";
    header.appendChild(title);

    const description = document.createElement("p");
    description.className = "document-description";
    description.textContent = "Deleted folder. Restoring it also restores documents deleted with it.";

    const meta = document.createElement("div");
    meta.className = "document-meta";

    const dateItem = document.createElement("span");
    dateItem.className = "document-meta-item";
    dateItem.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="12" width="12" stroke="currentColor" stroke-width="2.5" style="vertical-align: -1px; margin-right: 4px;"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> Xóa ngày: ${formatDate(folderItem.deletedAt)}`;
    meta.append(dateItem);

    const actions = document.createElement("div");
    actions.className = "trash-actions";
    actions.style.marginTop = "8px";

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
        name: folderItem.folderName || "Untitled folder"
      });
    });

    actions.append(restoreButton, deleteButton);
    content.append(header, description, meta, actions);
    card.appendChild(content);

    return card;
  }

  function renderTrashItems(documents, folders) {
    trashLoader.style.display = "none";

    const hasDocuments = documents.length > 0;
    const hasFolders = folders.length > 0;

    // Show/hide Empty Trash button based on item existence
    if (emptyTrashBtn) {
      emptyTrashBtn.style.display = (hasDocuments || hasFolders) ? "inline-block" : "none";
    }

    if (!hasDocuments && !hasFolders) {
      trashContent.style.display = "none";
      trashEmpty.style.display = "block";
      return;
    }

    trashEmpty.style.display = "none";
    trashContent.style.display = "block";

    // Combine folders and documents
    const items = [];
    folders.forEach(function (folder) {
      items.push({
        ...folder,
        itemType: "folder",
        dateKey: formatDateKey(folder.deletedAt),
        sortDate: new Date(folder.deletedAt || 0)
      });
    });
    documents.forEach(function (doc) {
      items.push({
        ...doc,
        itemType: "document",
        dateKey: formatDateKey(doc.deletedAt),
        sortDate: new Date(doc.deletedAt || 0)
      });
    });

    // Sort by deletedAt desc
    items.sort((a, b) => b.sortDate - a.sortDate);

    // Group by dateKey
    const groups = {};
    const groupOrder = [];
    items.forEach(function (item) {
      const key = item.dateKey;
      if (!groups[key]) {
        groups[key] = [];
        groupOrder.push(key);
      }
      groups[key].push(item);
    });

    trashContent.innerHTML = "";

    groupOrder.forEach(function (dateKey) {
      const groupSection = document.createElement("div");
      groupSection.className = "trash-section";

      const header = document.createElement("div");
      header.className = "trash-section-header";

      const title = document.createElement("h3");
      title.className = "trash-section-title";
      title.textContent = dateKey;

      header.appendChild(title);
      groupSection.appendChild(header);

      const grid = document.createElement("div");
      grid.className = "document-grid";

      groups[dateKey].forEach(function (item) {
        if (item.itemType === "folder") {
          grid.appendChild(createTrashFolderCard(item));
        } else {
          grid.appendChild(createTrashDocumentCard(item));
        }
      });

      groupSection.appendChild(grid);
      trashContent.appendChild(groupSection);
    });
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

  // Setup focus traps
  setupFocusTrap(confirmModal);
  setupFocusTrap(emptyTrashModal);

  // Event listeners
  cancelPermanentDeleteBtn.addEventListener("click", closePermanentDeleteModal);
  confirmPermanentDeleteBtn.addEventListener("click", permanentlyDeletePendingItem);

  confirmModal.addEventListener("click", function (event) {
    if (event.target === confirmModal) {
      closePermanentDeleteModal();
    }
  });

  if (emptyTrashBtn) {
    emptyTrashBtn.addEventListener("click", openEmptyTrashModal);
  }
  if (cancelEmptyTrashBtn) {
    cancelEmptyTrashBtn.addEventListener("click", closeEmptyTrashModal);
  }
  if (confirmEmptyTrashBtn) {
    confirmEmptyTrashBtn.addEventListener("click", handleEmptyTrash);
  }
  if (emptyTrashModal) {
    emptyTrashModal.addEventListener("click", function (event) {
      if (event.target === emptyTrashModal) {
        closeEmptyTrashModal();
      }
    });
  }

  // Global Escape key listener to close modals
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      if (confirmModal.classList.contains("open")) {
        closePermanentDeleteModal();
      }
      if (emptyTrashModal.classList.contains("open")) {
        closeEmptyTrashModal();
      }
    }
  });

  await loadTrash();
});
