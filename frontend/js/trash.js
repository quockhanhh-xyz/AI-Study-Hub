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
    confirmTitle.textContent = `Permanently delete “${item.name}”?`;
    confirmMessage.textContent = "This action cannot be undone.";
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
  async function restoreItem(type, item, button) {
    if (item.parentDeleted === true) {
      const confirmed = await window.confirmAction({
        title: "Original location is unavailable",
        message: "The parent folder containing this item has been deleted.\nRestore to My Folders?",
        confirmText: "Restore",
        danger: false
      });
      if (!confirmed) return;
    }

    setButtonLoading(button, "Restoring...");
    const id = type === "folder" ? item.folderId : item.documentId;
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

  function getTrashRowCenterHtml(deletedAtStr) {
    if (!deletedAtStr) return "";
    const deletedDate = new Date(deletedAtStr);
    if (Number.isNaN(deletedDate.getTime())) return "";

    const permDeleteDate = new Date(deletedDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    const today = new Date();

    const diffTime = permDeleteDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const formatDateShort = (d) => {
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit"
      });
    };

    const isToday = deletedDate.toDateString() === today.toDateString();
    const deletedText = isToday ? "Deleted today" : `Deleted ${formatDateShort(deletedDate)}`;

    let deletesText = "";
    if (diffDays <= 0) {
      deletesText = "Deletes today";
    } else if (diffDays === 1) {
      deletesText = "Deletes in 1 day";
    } else if (diffDays > 0 && diffDays <= 30) {
      deletesText = `Deletes in ${diffDays} days`;
    } else {
      deletesText = `Deletes permanently on ${formatDateShort(permDeleteDate)}`;
    }

    return `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="14" width="14" stroke="currentColor" stroke-width="2.5" style="vertical-align: middle; margin-right: 4px;">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 6v6l4 2"/>
      </svg>
      <span>${deletedText} · ${deletesText}</span>
    `;
  }

  function createTrashDocumentRow(documentItem) {
    const row = document.createElement("div");
    row.className = "trash-row";

    // Left Section: Icon + Info
    const left = document.createElement("div");
    left.className = "trash-row-left";

    const iconContainer = document.createElement("div");
    iconContainer.className = "trash-row-icon";
    iconContainer.innerHTML = getFileTypeIcon(documentItem.fileType);
    const iconWrapper = iconContainer.firstElementChild;
    if (iconWrapper) {
      iconWrapper.style.width = "20px";
      iconWrapper.style.height = "20px";
      iconContainer.innerHTML = "";
      iconContainer.appendChild(iconWrapper);
    }
    
    const info = document.createElement("div");
    info.className = "trash-row-info";

    const titleEl = document.createElement("h4");
    titleEl.className = "trash-row-title";
    titleEl.textContent = documentItem.title || documentItem.originalFileName || "Untitled document";

    const subtitleEl = document.createElement("span");
    subtitleEl.className = "trash-row-subtitle";
    subtitleEl.textContent = `Document · ${documentItem.originalFileName || "Deleted document"} · ${formatFileSize(documentItem.fileSize)}`;

    info.append(titleEl, subtitleEl);
    left.append(iconContainer, info);

    // Center Section: Deleted schedule
    const center = document.createElement("div");
    center.className = "trash-row-center";
    center.innerHTML = getTrashRowCenterHtml(documentItem.deletedAt);

    // Right Section: Action Buttons
    const right = document.createElement("div");
    right.className = "trash-row-right";

    const restoreBtn = document.createElement("button");
    restoreBtn.type = "button";
    restoreBtn.className = "trash-action-btn btn-restore";
    restoreBtn.title = "Restore";
    restoreBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="16" width="16" stroke="currentColor" stroke-width="2.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
      </svg>
    `;
    restoreBtn.addEventListener("click", function () {
      restoreItem("document", documentItem, restoreBtn);
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "trash-action-btn btn-delete-perm";
    deleteBtn.title = "Delete permanently";
    deleteBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="16" width="16" stroke="currentColor" stroke-width="2.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    `;
    deleteBtn.addEventListener("click", function () {
      openPermanentDeleteModal({
        type: "document",
        id: documentItem.documentId,
        name: documentItem.title || documentItem.originalFileName || "Untitled document"
      });
    });

    right.append(restoreBtn, deleteBtn);
    row.append(left, center, right);

    return row;
  }

  function createTrashFolderRow(folderItem) {
    const row = document.createElement("div");
    row.className = "trash-row";

    // Left Section: Icon + Info
    const left = document.createElement("div");
    left.className = "trash-row-left";

    const iconContainer = document.createElement("div");
    iconContainer.className = "trash-row-icon";
    iconContainer.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="20" width="20" stroke="currentColor" stroke-width="2"><path d="M1.5 10V2.5h5l3 3h11v3m3 0.25V8.5H4.6l-0.15 0.25 -0.234 0.492A28 28 0 0 0 1.5 21.272v0.228h19v-0.128a28 28 0 0 1 2.757 -12.116l0.243 -0.506Z"/></svg>`;
    
    const info = document.createElement("div");
    info.className = "trash-row-info";

    const titleEl = document.createElement("h4");
    titleEl.className = "trash-row-title";
    titleEl.textContent = folderItem.folderName || "Untitled folder";

    const subtitleEl = document.createElement("span");
    subtitleEl.className = "trash-row-subtitle";
    
    const fileCount = folderItem.fileCount || 0;
    const subfolderCount = folderItem.subfolderCount || 0;
    const fileWord = fileCount === 1 ? "document" : "documents";
    const subWord = subfolderCount === 1 ? "subfolder" : "subfolders";
    subtitleEl.textContent = `Folder · ${fileCount} ${fileWord} · ${subfolderCount} ${subWord}`;

    info.append(titleEl, subtitleEl);
    left.append(iconContainer, info);

    // Center Section: Deleted schedule
    const center = document.createElement("div");
    center.className = "trash-row-center";
    center.innerHTML = getTrashRowCenterHtml(folderItem.deletedAt);

    // Right Section: Actions
    const right = document.createElement("div");
    right.className = "trash-row-right";

    const restoreBtn = document.createElement("button");
    restoreBtn.type = "button";
    restoreBtn.className = "trash-action-btn btn-restore";
    restoreBtn.title = "Restore";
    restoreBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="16" width="16" stroke="currentColor" stroke-width="2.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
      </svg>
    `;
    restoreBtn.addEventListener("click", function () {
      restoreItem("folder", folderItem, restoreBtn);
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "trash-action-btn btn-delete-perm";
    deleteBtn.title = "Delete permanently";
    deleteBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="16" width="16" stroke="currentColor" stroke-width="2.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    `;
    deleteBtn.addEventListener("click", function () {
      openPermanentDeleteModal({
        type: "folder",
        id: folderItem.folderId,
        name: folderItem.folderName || "Untitled folder"
      });
    });

    right.append(restoreBtn, deleteBtn);
    row.append(left, center, right);

    return row;
  }

  function renderTrashItems(documents, folders) {
    trashLoader.style.display = "none";

    const hasDocuments = documents.length > 0;
    const hasFolders = folders.length > 0;
    const totalItems = documents.length + folders.length;

    // Show/hide and update Empty Trash button based on item existence
    if (emptyTrashBtn) {
      if (totalItems > 0) {
        emptyTrashBtn.style.display = "inline-flex";
        emptyTrashBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="16" width="16" stroke="currentColor" stroke-width="2" style="margin-right: 4px; vertical-align: middle;">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Empty Trash (${totalItems} item${totalItems !== 1 ? 's' : ''})
        `;
      } else {
        emptyTrashBtn.style.display = "none";
      }
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
      grid.className = "trash-list";

      groups[dateKey].forEach(function (item) {
        if (item.itemType === "folder") {
          grid.appendChild(createTrashFolderRow(item));
        } else {
          grid.appendChild(createTrashDocumentRow(item));
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
