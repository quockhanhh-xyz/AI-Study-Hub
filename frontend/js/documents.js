/**
 * My Documents Page Controller (Step 6D - FE2).
 * Handles search, subject/file-type/folder filters, and rendering the
 * authenticated user's own documents. Upload is an action entry point here,
 * not a standalone sidebar destination.
 * Relies on document-api.js, subject-api.js, folder-api.js; never uses raw fetch directly.
 */
document.addEventListener("DOMContentLoaded", async function () {
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
    return ["My Documents", ...path].join(" / ");
  }

  function createDocumentCard(documentItem) {
    const card = document.createElement("article");
    card.className = "document-card";

    const header = document.createElement("div");
    header.className = "document-card-header";

    const fileBadge = document.createElement("span");
    fileBadge.className = "document-type-badge";
    fileBadge.textContent = getFileLabel(documentItem.fileType);

    const visibilityBadge = document.createElement("span");
    const vis = documentItem.visibility || "PRIVATE";
    visibilityBadge.className = "status-badge " + vis.toLowerCase();
    visibilityBadge.textContent = vis;
    visibilityBadge.style.marginLeft = "8px";
    visibilityBadge.style.fontSize = "10px";
    visibilityBadge.style.height = "20px";
    visibilityBadge.style.padding = "0 8px";

    const title = document.createElement("h3");
    const titleLink = document.createElement("a");
    titleLink.href = `document-detail.html?id=${documentItem.documentId}`;
    titleLink.textContent = documentItem.title || documentItem.originalFileName || "Untitled document";
    titleLink.style.color = "inherit";
    title.appendChild(titleLink);

    header.append(fileBadge, visibilityBadge);

    if (vis === "PUBLIC" && documentItem.approvalStatus) {
        const approvalBadge = document.createElement("span");
        approvalBadge.className = "status-badge " + documentItem.approvalStatus.toLowerCase();
        approvalBadge.textContent = documentItem.approvalStatus;
        approvalBadge.style.marginLeft = "4px";
        approvalBadge.style.fontSize = "10px";
        approvalBadge.style.height = "20px";
        approvalBadge.style.padding = "0 8px";
        header.append(approvalBadge);
    }

    header.append(title);

    const description = document.createElement("p");
    description.className = "document-description";
    description.textContent = documentItem.description || "No description provided.";

    const meta = document.createElement("div");
    meta.className = "document-meta";
    meta.append(
      createMetaItem("Size", formatFileSize(documentItem.fileSize)),
      createMetaItem("Uploaded", formatDate(documentItem.createdAt))
    );

    if (documentItem.subjectCode) {
      const subjectBadge = document.createElement("div");
      subjectBadge.className = "document-card-subject";
      subjectBadge.textContent = `${documentItem.subjectCode} - ${documentItem.subjectName}`;
      meta.append(subjectBadge);
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

    const actions = document.createElement("div");
    actions.className = "document-actions";

    const detailButton = document.createElement("a");
    detailButton.href = `document-detail.html?id=${documentItem.documentId}`;
    detailButton.className = "btn btn-primary document-detail-btn";
    detailButton.textContent = "View Details";

    actions.append(detailButton);
    card.append(header, description, meta, actions);

    return card;
  }

  async function loadSubjects() {
    try {
      const result = await getSubjects();
      const subjects = Array.isArray(result.data) ? result.data : [];
      if (subjectFilter) {
        const currentValue = subjectFilter.value;
        subjectFilter.innerHTML = '<option value="">All Subjects</option>';
        subjects.forEach(function (subject) {
          const option = document.createElement("option");
          option.value = subject.subjectId;
          option.textContent = subject.subjectCode
            ? `${subject.subjectCode} - ${subject.subjectName}`
            : subject.subjectName;
          subjectFilter.appendChild(option);
        });
        subjectFilter.value = currentValue;
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
          const option = document.createElement("option");
          option.value = folder.folderId;
          option.textContent = folder.folderName;
          folderFilter.appendChild(option);
        });
        folderFilter.value = currentValue;
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

  async function loadDocuments() {
    setDocumentsLoading();

    const params = {
      keyword: searchInput ? searchInput.value.trim() : "",
      subjectId: subjectFilter ? subjectFilter.value : "",
      fileType: fileTypeFilter ? fileTypeFilter.value : "",
      folderId: folderFilter ? folderFilter.value : ""
    };

    if (params.folderId && params.folderId !== "0") {
      params.includeSubfolders = true;
    }

    const isFiltering = params.keyword || params.subjectId || params.fileType || params.folderId;

    try {
      const result = await searchDocuments(params);
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
  }

  if (fileTypeFilter) {
    fileTypeFilter.addEventListener("change", loadDocuments);
  }

  if (folderFilter) {
    folderFilter.addEventListener("change", loadDocuments);
  }

  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener("click", async function () {
      if (searchInput) searchInput.value = "";
      if (subjectFilter) subjectFilter.value = "";
      if (fileTypeFilter) fileTypeFilter.value = "";
      if (folderFilter) folderFilter.value = "";
      await loadDocuments();
    });
  }
});