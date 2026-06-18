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
  let userFolders = [];

  // Filter UI Elements
  const searchInput = document.getElementById("searchInput");
  const subjectFilter = document.getElementById("subjectFilter");
  const fileTypeFilter = document.getElementById("fileTypeFilter");
  const folderFilter = document.getElementById("folderFilter");
  const clearFiltersBtn = document.getElementById("clearFiltersBtn");

  if (folderCountElement) folderCountElement.textContent = "0";
  if (joinDateElement) joinDateElement.textContent = currentUser.tier || "FREE";

  function activateFolderCard(folderId) {
    document.querySelectorAll(".folder-card").forEach(c => c.classList.remove("active"));
    if (folderId) {
      const card = document.querySelector(`.folder-card[data-folder-id="${folderId}"]`);
      if (card) {
        card.classList.add("active");
      }
    }
  }

  function updateDocSub(folderName) {
    const docPanelSubtitle = document.getElementById("docPanelSubtitle");
    if (docPanelSubtitle) {
      if (folderName) {
        docPanelSubtitle.textContent = `Showing files in: ${folderName}`;
      } else {
        docPanelSubtitle.textContent = "Your learning materials and files.";
      }
    }
  }

  function scrollToDocs() {
    const docPanel = document.querySelector(".document-panel");
    if (docPanel) {
      docPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    }
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
    card.dataset.folderId = folder.folderId;

    const main = document.createElement("div");
    main.className = "folder-card-main";

    const icon = document.createElement("div");
    icon.className = "folder-icon";
    icon.textContent = "📁";

    const name = document.createElement("p");
    name.className = "folder-name";
    name.textContent = folder.folderName || "Untitled Folder";

    // Show fileCount and subfolderCount if available
    const stats = document.createElement("p");
    stats.className = "folder-meta";
    stats.style.fontWeight = "500";
    const parts = [];
    if (folder.fileCount !== undefined && folder.fileCount !== null) {
      parts.push(`${folder.fileCount} file${folder.fileCount !== 1 ? "s" : ""}`);
    }
    if (folder.subfolderCount !== undefined && folder.subfolderCount !== null) {
      parts.push(`${folder.subfolderCount} subfolder${folder.subfolderCount !== 1 ? "s" : ""}`);
    }
    stats.textContent = parts.length > 0 ? parts.join(" · ") : "0 files · 0 subfolders";

    const meta = document.createElement("p");
    meta.className = "folder-meta";
    meta.textContent = folder.createdAt
      ? `Created: ${new Date(folder.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" })}`
      : "";

    main.append(icon, name, stats, meta);
    card.append(main);

    card.addEventListener("click", function () {
      window.location.href = `folders.html?folderId=${folder.folderId}`;
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
    folderLink.className = "document-folder-path";
    folderLink.textContent = "📁 " + buildFolderPath(documentItem.folderId);
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
      // 1. Fetch only root folders for the grid view
      const result = await getMyFolders();
      const folders = Array.isArray(result.data) ? result.data : [];

      // 2. Fetch all active folders recursively for stats, cache, and dropdown population
      let allFolders = folders;
      try {
        const allResult = await getMyFolders(null, true);
        if (allResult && Array.isArray(allResult.data)) {
          allFolders = allResult.data;
        }
      } catch (e) {
        console.warn("Failed to load recursive folders count:", e);
      }
      userFolders = allFolders;

      if (folderCountElement) {
        folderCountElement.textContent = String(allFolders.length);
      }

      if (folderFilter) {
        const currentValue = folderFilter.value;
        folderFilter.innerHTML = `
          <option value="">All Folders</option>
          <option value="0">My Documents</option>
        `;
        allFolders.forEach(function (folder) {
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
          if (folderFilter && folderFilter.value) {
            activateFolderCard(folderFilter.value);
          }
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

    try {
      const result = await searchDocuments(params);
      const documents = Array.isArray(result.data) ? result.data : [];
      await resolveFoldersForDocuments(documents);

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
    folderFilter.addEventListener("change", async function () {
      await loadDocuments();
      const folderId = folderFilter.value;
      if (folderId && folderId !== "0") {
        const selectedOption = folderFilter.options[folderFilter.selectedIndex];
        const folderName = selectedOption ? selectedOption.textContent : "Folder";
        activateFolderCard(folderId);
        updateDocSub(folderName);
      } else if (folderId === "0") {
        activateFolderCard(null);
        updateDocSub("My Documents");
      } else {
        activateFolderCard(null);
        updateDocSub(null);
      }
    });
  }

  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener("click", async function () {
      if (searchInput) searchInput.value = "";
      if (subjectFilter) subjectFilter.value = "";
      if (fileTypeFilter) fileTypeFilter.value = "";
      if (folderFilter) folderFilter.value = "";
      await loadDocuments();
      activateFolderCard(null);
      updateDocSub(null);
    });
  }

  // Quick Actions: Create Folder Modal
  const quickCreateFolderBtn = document.getElementById("quickCreateFolderBtn");
  const createFolderModal = document.getElementById("createFolderModal");
  const createFolderCancelBtn = document.getElementById("createFolderCancelBtn");
  const createFolderConfirmBtn = document.getElementById("createFolderConfirmBtn");
  const createFolderNameInput = document.getElementById("createFolderName");
  const createFolderError = document.getElementById("createFolderError");

  if (quickCreateFolderBtn && createFolderModal) {
    quickCreateFolderBtn.addEventListener("click", function () {
      if (createFolderNameInput) createFolderNameInput.value = "";
      if (createFolderError) {
        createFolderError.style.display = "none";
        createFolderError.textContent = "";
      }
      createFolderModal.classList.add("open");
      if (createFolderNameInput) createFolderNameInput.focus();
    });
  }

  function closeCreateFolderModal() {
    if (createFolderModal) {
      createFolderModal.classList.remove("open");
    }
  }

  if (createFolderCancelBtn) {
    createFolderCancelBtn.addEventListener("click", closeCreateFolderModal);
  }

  if (createFolderModal) {
    createFolderModal.addEventListener("click", function (e) {
      if (e.target === createFolderModal) {
        closeCreateFolderModal();
      }
    });
  }

  if (createFolderConfirmBtn) {
    createFolderConfirmBtn.addEventListener("click", async function () {
      if (!createFolderNameInput) return;
      const name = createFolderNameInput.value.trim();
      if (!name) {
        if (createFolderError) {
          createFolderError.textContent = "Folder name is required.";
          createFolderError.style.display = "block";
        }
        return;
      }

      if (typeof window.setButtonLoading === "function") {
        window.setButtonLoading(createFolderConfirmBtn, true, "Creating...");
      } else {
        createFolderConfirmBtn.disabled = true;
      }

      if (createFolderError) {
        createFolderError.style.display = "none";
      }

      try {
        await createFolder({ folderName: name, parentFolderId: null });
        closeCreateFolderModal();
        if (typeof window.showToast === "function") {
          window.showToast("Folder created successfully!", "success");
        }
        // Refresh folders grid and stats
        await loadFolders();
        await loadDocuments();
      } catch (error) {
        if (createFolderError) {
          createFolderError.textContent = error.message || "Failed to create folder.";
          createFolderError.style.display = "block";
        }
      } finally {
        if (typeof window.setButtonLoading === "function") {
          window.setButtonLoading(createFolderConfirmBtn, false);
        } else {
          createFolderConfirmBtn.disabled = false;
        }
      }
    });

    if (createFolderNameInput) {
      createFolderNameInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          createFolderConfirmBtn.click();
        }
      });
    }
  }
});
