document.addEventListener("DOMContentLoaded", async function () {
  const userNameElement = document.getElementById("dashboardUserName");
  const currentUserRaw = localStorage.getItem("currentUser");

  let currentUser = {};
  try {
    currentUser = JSON.parse(currentUserRaw || "{}");
  } catch (error) {
    localStorage.removeItem("currentUser");
    window.location.href = "login.html";
    return;
  }

  if (userNameElement && currentUser.fullName) {
    userNameElement.textContent = `Welcome, ${currentUser.fullName} (${currentUser.role})`;
  }

  const docCountElement = document.getElementById("docCount");
  const folderCountElement = document.getElementById("folderCount");
  const joinDateElement = document.getElementById("joinDate");
  const documentLoader = document.getElementById("documentLoader");
  const documentErrorMessage = document.getElementById("documentErrorMessage");
  const documentGrid = document.getElementById("documentGrid");
  const emptyState = document.getElementById("emptyState");

  let totalDocuments = null;

  // Filter UI Elements
  const searchInput = document.getElementById("searchInput");
  const subjectFilter = document.getElementById("subjectFilter");
  const fileTypeFilter = document.getElementById("fileTypeFilter");
  const folderFilter = document.getElementById("folderFilter");
  const clearFiltersBtn = document.getElementById("clearFiltersBtn");

  if (folderCountElement) folderCountElement.textContent = "0";
  if (joinDateElement) joinDateElement.textContent = currentUser.tier || "FREE";

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

  function createFolderCard(folder) {
    const card = document.createElement("div");
    card.className = "folder-card";
    card.style.cursor = "pointer";

    const main = document.createElement("div");
    main.className = "folder-card-main";

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

    main.append(icon, name, meta);

    const actions = document.createElement("div");
    actions.className = "folder-card-actions";

    const openBtn = document.createElement("button");
    openBtn.type = "button";
    openBtn.className = "btn btn-primary btn-sm";
    openBtn.textContent = "Browse Files";
    openBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      if (folderFilter) {
        folderFilter.value = String(folder.folderId);
        loadDocuments();
      }
    });

    actions.append(openBtn);
    card.append(main, actions);

    card.addEventListener("click", function () {
      if (folderFilter) {
        folderFilter.value = String(folder.folderId);
        loadDocuments();
      }
    });

    return card;
  }

  function createDocumentCard(documentItem) {
    const card = document.createElement("article");
    card.className = "document-card";

    const header = document.createElement("div");
    header.className = "document-card-header";

    const fileBadge = document.createElement("span");
    fileBadge.className = "document-type-badge";
    fileBadge.textContent = getFileLabel(documentItem.fileType);

    const title = document.createElement("h3");
    const titleLink = document.createElement("a");
    titleLink.href = `document-detail.html?id=${documentItem.documentId}`;
    titleLink.textContent = documentItem.title || documentItem.originalFileName || "Untitled document";
    titleLink.style.color = "inherit";
    title.appendChild(titleLink);

    header.append(fileBadge, title);

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
    folderLink.className = "btn btn-secondary btn-sm";
    folderLink.textContent = documentItem.folderId
      ? `Folder: ${documentItem.folderName || "Folder"}`
      : "My Documents";
    folderLink.addEventListener("click", function (e) {
      e.stopPropagation();
      if (!folderFilter) return;
      folderFilter.value = documentItem.folderId ? String(documentItem.folderId) : "0";
      loadDocuments();
    });
    meta.append(folderLink);

    const actions = document.createElement("div");
    actions.className = "document-actions";

    const detailButton = document.createElement("a");
    detailButton.href = `document-detail.html?id=${documentItem.documentId}`;
    detailButton.className = "btn btn-primary document-detail-btn";
    detailButton.textContent = "View Details";

    const openButton = document.createElement("button");
    openButton.type = "button";
    openButton.className = "btn btn-secondary document-open-btn";
    openButton.textContent = "Open File";
    openButton.disabled = !documentItem.fileUrl;
    openButton.addEventListener("click", function (e) {
      e.preventDefault();
      if (documentItem.fileUrl) {
        window.open(documentItem.fileUrl, "_blank", "noopener");
      }
    });

    actions.append(detailButton, openButton);
    card.append(header, description, meta, actions);

    return card;
  }

  async function loadSubjects() {
    try {
      const result = await getSubjects();
      const subjects = Array.isArray(result.data) ? result.data : [];
      if (subjectFilter) {
        subjectFilter.innerHTML = '<option value="">All Subjects</option>';
        subjects.forEach(function (subject) {
          const option = document.createElement("option");
          option.value = subject.subjectId;
          option.textContent = `${subject.subjectCode} - ${subject.subjectName}`;
          subjectFilter.appendChild(option);
        });
      }
    } catch (error) {
      console.warn("Failed to load subjects:", error);
    }
  }

  async function loadFolders() {
    const folderGrid = document.getElementById("folderGrid");
    const folderLoader = document.getElementById("folderLoader");
    const folderErrorMessage = document.getElementById("folderErrorMessage");
    const folderEmptyState = document.getElementById("folderEmptyState");

    if (folderLoader) folderLoader.style.display = "flex";
    if (folderGrid) folderGrid.style.display = "none";
    if (folderEmptyState) folderEmptyState.style.display = "none";
    if (folderErrorMessage) folderErrorMessage.style.display = "none";

    try {
      const result = await getMyFolders();
      const folders = Array.isArray(result.data) ? result.data : [];

      if (folderCountElement) {
        folderCountElement.textContent = String(folders.length);
      }

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

      if (folderLoader) folderLoader.style.display = "none";

      if (folders.length === 0) {
        if (folderEmptyState) folderEmptyState.style.display = "flex";
        if (folderGrid) folderGrid.style.display = "none";
      } else {
        if (folderGrid) {
          folderGrid.innerHTML = "";
          folders.forEach(function (folder) {
            folderGrid.appendChild(createFolderCard(folder));
          });
          folderGrid.style.display = "grid";
        }
      }
    } catch (error) {
      if (folderCountElement) {
        folderCountElement.textContent = "0";
      }
      if (folderLoader) folderLoader.style.display = "none";
      if (folderGrid) folderGrid.style.display = "none";
      if (folderEmptyState) folderEmptyState.style.display = "none";
      if (folderErrorMessage) {
        folderErrorMessage.textContent = error.message || "Failed to load folders.";
        folderErrorMessage.style.display = "block";
      }
      console.warn("Failed to load folders:", error);
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

    try {
      const result = await searchDocuments(params);
      const documents = Array.isArray(result.data) ? result.data : [];

      const isFiltering = params.keyword || params.subjectId || params.fileType || params.folderId;
      if (!isFiltering) {
        totalDocuments = documents.length;
      }

      if (docCountElement && totalDocuments !== null) {
        docCountElement.textContent = String(totalDocuments);
      }
      if (documentLoader) documentLoader.style.display = "none";

      if (documents.length === 0) {
        if (documentGrid) documentGrid.style.display = "none";
        if (emptyState) {
          emptyState.style.display = "block";
          const isFiltering = params.keyword || params.subjectId || params.fileType || params.folderId;
          const emptyTitle = emptyState.querySelector(".empty-title");
          const emptyDesc = emptyState.querySelector("p");
          const emptyAction = emptyState.querySelector(".empty-action");

          if (isFiltering) {
            if (emptyTitle) emptyTitle.textContent = "No matching documents";
            if (emptyDesc) emptyDesc.textContent = "Try adjusting your search keywords or filters.";
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
      if (docCountElement) docCountElement.textContent = "0";
      if (documentLoader) documentLoader.style.display = "none";
      if (documentGrid) documentGrid.style.display = "none";
      if (emptyState) emptyState.style.display = "none";
      if (documentErrorMessage) {
        documentErrorMessage.textContent = error.message || "Failed to load documents.";
        documentErrorMessage.style.display = "flex";
      }
    }
  }

  // Load subject options first
  await loadSubjects();
  await loadFolders();

  // Load documents
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
    clearFiltersBtn.addEventListener("click", function () {
      if (searchInput) searchInput.value = "";
      if (subjectFilter) subjectFilter.value = "";
      if (fileTypeFilter) fileTypeFilter.value = "";
      if (folderFilter) folderFilter.value = "";
      loadDocuments();
    });
  }
});