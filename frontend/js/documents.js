/**
 * My Documents Page Controller (Step 6D - FE2).
 * Handles search, subject/file-type/folder filters, and rendering the
 * authenticated user's own documents. Upload is an action entry point here,
 * not a standalone sidebar destination.
 * Relies on document-api.js, subject-api.js, folder-api.js; never uses raw fetch directly.
 */
document.addEventListener("DOMContentLoaded", async function () {
  // --- BACKWARD COMPATIBILITY REDIRECT ---
  const searchParam = new URLSearchParams(window.location.search).get("search");
  let redirectUrl = "my-library.html?view=documents";
  if (searchParam) redirectUrl += `&search=${encodeURIComponent(searchParam)}`;
  window.location.replace(redirectUrl);
  return;
  
  if (window.authReady) {
    const isAuthenticated = await window.authReady;
    if (!isAuthenticated) return;
  }

  // Filter UI elements
  const searchInput = document.getElementById("searchInput");
  const subjectFilter = document.getElementById("subjectFilter");
  const fileTypeFilter = document.getElementById("fileTypeFilter");
  const folderFilter = document.getElementById("folderFilter");
  const clearFiltersBtn = document.getElementById("clearFiltersBtn");
  const favoritesFilterBtn = document.getElementById("favoritesFilterBtn");

  // Document list elements
  const documentLoader = document.getElementById("documentLoader");
  const documentErrorMessage = document.getElementById("documentErrorMessage");
  const documentGrid = document.getElementById("documentGrid");
  const emptyState = document.getElementById("emptyState");
  const docPanelSubtitle = document.getElementById("docPanelSubtitle");

  // Upload entry points
  const uploadDocumentBtn = document.getElementById("uploadDocumentBtn");
  const emptyUploadBtn = document.getElementById("emptyUploadBtn");

  let userFolders = [];
  let showFavoritesOnly = false;

  function goToUpload() {
    window.location.href = "upload.html";
  }

  if (uploadDocumentBtn) uploadDocumentBtn.addEventListener("click", goToUpload);
  if (emptyUploadBtn) emptyUploadBtn.addEventListener("click", goToUpload);

  function setDocumentsLoading() {
    if (documentLoader) documentLoader.style.display = "flex";
    if (documentGrid) documentGrid.style.display = "none";
    if (emptyState) emptyState.style.display = "none";
    if (documentErrorMessage) documentErrorMessage.style.display = "none";
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

  function getFileLabel(fileType) {
    return (fileType || "FILE").toUpperCase();
  }

  function createMetaItem(label, value) {
    const item = document.createElement("span");
    item.textContent = `${label}: ${value}`;
    return item;
  }

  function buildFolderPath(folderId) {
    if (!folderId) {
      return "My Documents";
    }
    const path = [];
    let currentId = folderId;
    let iterations = 0;
    while (currentId && iterations < 100) {
      const folder = userFolders.find(f => f.folderId === currentId);
      if (!folder) {
        break;
      }
      path.unshift(folder.folderName);
      currentId = folder.parentFolderId;
      iterations++;
    }
    if (path.length === 0) {
      return "My Documents";
    }
    return path.join(" / ");
  }

  async function handleToggleFavorite(documentItem, btn) {
    btn.disabled = true;
    const wasFavorited = isDocumentFavorited(documentItem);
    try {
      if (wasFavorited) {
        await unfavoriteDocument(documentItem.documentId);
        setDocumentFavorited(documentItem, false);
        btn.classList.remove("favorited");
        btn.title = "Add to favorites";
        showToast("Removed from favorites.", "success");
        if (showFavoritesOnly) {
          await loadDocuments();
        }
      } else {
        await favoriteDocument(documentItem.documentId);
        setDocumentFavorited(documentItem, true);
        btn.classList.add("favorited");
        btn.title = "Remove from favorites";
        showToast("Added to favorites.", "success");
      }
    } catch (error) {
      if (error && error.status === 403) {
        showToast("You do not have access to this document.", "error");
      } else {
        showToast(error.message || "Failed to update favorite.", "error");
      }
    } finally {
      btn.disabled = false;
    }
  }

  function createDocumentCard(documentItem) {
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
    const titleLink = document.createElement("a");
    titleLink.href = `document-detail.html?id=${documentItem.documentId}`;
    titleLink.textContent = documentItem.title || documentItem.originalFileName || "Untitled document";
    titleLink.style.color = "inherit";
    title.appendChild(titleLink);
    header.appendChild(title);

    const favoriteBtn = document.createElement("button");
    favoriteBtn.type = "button";
    const favorited = isDocumentFavorited(documentItem);
    favoriteBtn.className = "favorite-star-btn" + (favorited ? " favorited" : "");
    favoriteBtn.title = favorited ? "Remove from favorites" : "Add to favorites";
    favoriteBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/></svg>';
    favoriteBtn.addEventListener("click", async function (e) {
      e.stopPropagation();
      e.preventDefault();
      await handleToggleFavorite(documentItem, favoriteBtn);
    });
    header.appendChild(favoriteBtn);

    const meta = document.createElement("div");
    meta.className = "document-meta";

    const dateItem = document.createElement("span");
    dateItem.className = "document-meta-item";
    dateItem.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="12" width="12" stroke="currentColor" stroke-width="2.5" style="vertical-align: -1px; margin-right: 4px;"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> ${formatDate(documentItem.createdAt)}`;
    meta.append(dateItem);

    if (documentItem.subjectCode) {
      const subjectItem = document.createElement("span");
      subjectItem.className = "document-meta-item";
      subjectItem.title = `${documentItem.subjectCode} - ${documentItem.subjectName}`;
      subjectItem.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="12" width="12" stroke="currentColor" stroke-width="2.5" style="vertical-align: -1px; margin-right: 4px;"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82zM7 7h.01"/></svg> ${documentItem.subjectCode} - ${documentItem.subjectName}`;
      meta.append(subjectItem);
    }

    const folderLink = document.createElement("button");
    folderLink.type = "button";
    folderLink.className = "document-folder-path";
    folderLink.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="14" width="14" aria-hidden="true" focusable="false" style="vertical-align:-2px;"><path stroke="currentColor" d="M1.5 10V2.5h5l3 3h11v3m3 0.25V8.5H4.6l-0.15 0.25 -0.234 0.492A28 28 0 0 0 1.5 21.272v0.228h19v-0.128a28 28 0 0 1 2.757 -12.116l0.243 -0.506Z" stroke-width="1.5"></path></svg> ' + buildFolderPath(documentItem.folderId);
    folderLink.addEventListener("click", function (e) {
      e.stopPropagation();
      if (documentItem.folderId) {
        window.location.href = `folders.html?folderId=${documentItem.folderId}`;
      } else {
        window.location.href = "folders.html";
      }
    });
    meta.append(folderLink);

    content.append(header, meta);
    card.appendChild(content);

    card.addEventListener("click", function (e) {
      if (e.target.closest("button") || e.target.closest("a")) {
        return;
      }
      window.location.href = `document-detail.html?id=${documentItem.documentId}`;
    });

    return card;
  }

  async function loadSubjects() {
    try {
      const result = await getSubjects();
      const subjects = Array.isArray(result.data) ? result.data : [];
      const subjectDatalist = document.getElementById("subjectDatalist");
      if (subjectDatalist) {
        subjectDatalist.innerHTML = "";
        subjects.forEach(function (subject) {
          const option = document.createElement("option");
          const label = subject.subjectCode
            ? `${subject.subjectCode} - ${subject.subjectName}`
            : subject.subjectName;
          option.value = label;
          option.dataset.id = subject.subjectId;
          subjectDatalist.appendChild(option);
        });
        if (subjectFilter) subjectFilter.dispatchEvent(new Event("syncCustom"));
      }
    } catch (error) {
      console.warn("Failed to load subjects:", error);
    }
  }

  async function loadFolders() {
    try {
      const result = await getMyFolders(null, true);
      const folders = Array.isArray(result.data) ? result.data : [];
      userFolders = folders;

      if (folderFilter) {
        const currentValue = folderFilter.value;
        folderFilter.innerHTML = `
          <option value="">All Folders</option>
          <option value="0">My Documents</option>
        `;
        folders.forEach(function (folder) {
          const path = [];
          let current = folder;
          let iterations = 0;
          while (current && iterations < 100) {
            path.unshift(current.folderName);
            const parentId = current.parentFolderId;
            if (!parentId) break;
            current = folders.find(f => f.folderId === parentId);
            iterations++;
          }
          const option = document.createElement("option");
          option.value = folder.folderId;
          option.textContent = path.join(" / ");
          folderFilter.appendChild(option);
        });
        folderFilter.value = currentValue;
        folderFilter.dispatchEvent(new Event("syncCustom"));
      }
    } catch (error) {
      console.warn("Failed to load folders:", error);
    }
  }

  async function resolveFoldersForDocuments(documents) {
    const uniqueFolderIds = [...new Set(documents.map(d => d.folderId).filter(Boolean))];
    for (const folderId of uniqueFolderIds) {
      let currentId = folderId;
      let iterations = 0;
      while (currentId && iterations < 10) {
        const exists = userFolders.some(f => f.folderId === currentId);
        if (exists) {
          break;
        }
        try {
          const result = await getFolderById(currentId);
          if (result && result.data) {
            const folder = result.data;
            userFolders.push(folder);
            currentId = folder.parentFolderId;
          } else {
            break;
          }
        } catch (e) {
          console.warn(`Failed to resolve folder ${currentId}:`, e);
          break;
        }
        iterations++;
      }
    }
  }

  function getSelectedSubjectId() {
    if (!subjectFilter) return "";
    const typedText = subjectFilter.value.trim();
    if (!typedText) return "";

    const subjectDatalist = document.getElementById("subjectDatalist");
    if (subjectDatalist) {
      const options = subjectDatalist.options;
      for (let i = 0; i < options.length; i++) {
        if (options[i].value === typedText) {
          return options[i].dataset.id || "";
        }
      }
    }
    return "";
  }

  async function loadDocuments() {
    setDocumentsLoading();

    const params = {
      keyword: searchInput ? searchInput.value.trim() : "",
      subjectId: getSelectedSubjectId(),
      fileType: fileTypeFilter ? fileTypeFilter.value : "",
      folderId: folderFilter ? folderFilter.value : ""
    };

    if (params.folderId && params.folderId !== "0") {
      params.includeSubfolders = true;
    }

    const isFiltering = params.keyword || params.subjectId || params.fileType || params.folderId;

    try {
      const result = showFavoritesOnly
        ? await getFavoriteDocuments()
        : await searchDocuments(params);
      const documents = Array.isArray(result.data) ? result.data : [];
      await resolveFoldersForDocuments(documents);

      if (documentLoader) documentLoader.style.display = "none";

      if (docPanelSubtitle) {
        if (params.folderId) {
          const selectedOption = folderFilter.options[folderFilter.selectedIndex];
          const folderName = selectedOption ? selectedOption.textContent : "Folder";
          docPanelSubtitle.textContent = `Showing files in: ${folderName}`;
        } else {
          docPanelSubtitle.textContent = "Documents you currently own.";
        }
      }

      if (documents.length === 0) {
        if (documentGrid) documentGrid.style.display = "none";
        if (emptyState) {
          emptyState.style.display = "flex";
          const emptyTitle = emptyState.querySelector(".empty-title");
          const emptyDesc = emptyState.querySelector("p");
          const emptyAction = emptyState.querySelector(".empty-action");

          if (isFiltering) {
            if (emptyTitle) emptyTitle.textContent = "No documents found.";
            if (emptyDesc) emptyDesc.textContent = "Try changing your keyword or filters.";
            if (emptyAction) emptyAction.style.display = "none";
          } else {
            if (emptyTitle) emptyTitle.textContent = "No documents yet";
            if (emptyDesc) emptyDesc.textContent = "Upload your first study document to keep everything in one place.";
            if (emptyAction) emptyAction.style.display = "inline-flex";
          }
        }
        return;
      }

      if (documentGrid) {
        documentGrid.innerHTML = "";
        documents.forEach(function (documentItem) {
          documentGrid.appendChild(createDocumentCard(documentItem));
        });
        documentGrid.style.display = "grid";
      }
    } catch (error) {
      if (documentLoader) documentLoader.style.display = "none";
      if (documentGrid) documentGrid.style.display = "none";
      if (emptyState) emptyState.style.display = "none";
      if (documentErrorMessage) {
        documentErrorMessage.textContent = error.message || "Failed to load documents.";
        documentErrorMessage.style.display = "flex";
      }
    }
  }

  // Initial load: subjects + folders feed the filter dropdowns, then documents.
  await loadSubjects();
  await loadFolders();
  await loadDocuments();

  // Bind filter events
  let searchTimeout;
  if (searchInput) {
    searchInput.addEventListener("input", function () {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(loadDocuments, 300);
    });
  }

  if (subjectFilter) {
    subjectFilter.addEventListener("change", loadDocuments);
    subjectFilter.addEventListener("input", function () {
      const id = getSelectedSubjectId();
      if (id || subjectFilter.value === "") {
        loadDocuments();
      }
    });
    subjectFilter.addEventListener("blur", function () {
      const id = getSelectedSubjectId();
      if (!id && subjectFilter.value !== "") {
        subjectFilter.value = "";
        loadDocuments();
      }
    });
  }

  if (fileTypeFilter) {
    fileTypeFilter.addEventListener("change", loadDocuments);
  }

  if (folderFilter) {
    folderFilter.addEventListener("change", loadDocuments);
  }

  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener("click", async function () {
      showFavoritesOnly = false;
      if (favoritesFilterBtn) favoritesFilterBtn.classList.remove("active");
      if (searchInput) searchInput.value = "";
      if (subjectFilter) {
        subjectFilter.value = "";
        subjectFilter.dispatchEvent(new Event("syncCustom"));
      }
      if (fileTypeFilter) {
        fileTypeFilter.value = "";
        fileTypeFilter.dispatchEvent(new Event("syncCustom"));
      }
      if (folderFilter) {
        folderFilter.value = "";
        folderFilter.dispatchEvent(new Event("syncCustom"));
      }
      await loadDocuments();
    });
  }

  if (favoritesFilterBtn) {
    favoritesFilterBtn.addEventListener("click", async function () {
      showFavoritesOnly = !showFavoritesOnly;
      favoritesFilterBtn.classList.toggle("active", showFavoritesOnly);
      await loadDocuments();
    });
  }
});
