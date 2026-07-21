document.addEventListener("DOMContentLoaded", async function () {
  // 1. Check Authentication
  if (window.authReady) {
    const isAuthenticated = await window.authReady;
    if (!isAuthenticated) return;
  }

  // State
  let userFolders = [];
  let currentParentFolderId = getParentFolderIdFromUrl();
  let breadcrumbTrail = [{ folderId: null, name: "My Documents" }];

  // Elements
  const tabs = document.querySelectorAll(".library-tab");
  const contents = document.querySelectorAll(".tab-content");

  const searchInput = document.getElementById("searchInput");
  const libraryToolbar = document.getElementById("libraryToolbar");
  const subjectFilter = document.getElementById("subjectFilter");
  const subjectDatalist = document.getElementById("subjectDatalist");
  const fileTypeFilter = document.getElementById("fileTypeFilter");
  const folderFilter = document.getElementById("folderFilter");

  const documentGrid = document.getElementById("documentGrid");
  const documentEmptyState = document.getElementById("documentEmptyState");

  const folderEmptyState = document.getElementById("folderEmptyState");
  const folderBreadcrumb = document.getElementById("folderBreadcrumb");
  const createFolderBtn = document.getElementById("createFolderBtn");
  const uploadDocumentBtn = document.getElementById("uploadDocumentBtn");

  const createFolderModal = document.getElementById("createFolderModal");
  const newFolderNameInput = document.getElementById("newFolderNameInput");
  const cancelCreateFolderBtn = document.getElementById("cancelCreateFolderBtn");
  const confirmCreateFolderBtn = document.getElementById("confirmCreateFolderBtn");
  const createFolderModalError = document.getElementById("createFolderModalError");

  let searchTimeout = null;

  // Initialize
  init();

  async function init() {
    if (typeof renderNavigation === "function") {
      renderNavigation();
    }

    setupTabs();
    setupEventListeners();
    setupCreateFolderModal();

    // Load filter options
    await Promise.all([
      loadSubjects(),
      loadAllFoldersForFilter()
    ]);

    // Initial Load based on current tab
    const currentTab = new URLSearchParams(window.location.search).get("view") || "documents";
    const searchParam = new URLSearchParams(window.location.search).get("search");
    if (searchParam && searchInput) {
      searchInput.value = searchParam;
    }

    if (currentTab === "documents") {
      loadDocuments();
    } else if (currentTab === "folders") {
      loadFolders(currentParentFolderId);
    } else if (currentTab === "favorites") {
      loadFavorites();
    }
  }

  // --- TABS LOGIC ---
  function setupTabs() {
    const urlParams = new URLSearchParams(window.location.search);
    const defaultView = urlParams.get("view") || "documents";

    tabs.forEach(tab => {
      tab.addEventListener("click", () => {
        switchTab(tab.dataset.tab);
      });
    });

    switchTab(defaultView, false); // false = don't reload data if just initing
  }

  function switchTab(tabId, loadData = true) {
    tabs.forEach(t => t.classList.remove("active"));
    contents.forEach(c => c.classList.remove("active"));

    const activeTab = document.querySelector(`.library-tab[data-tab="${tabId}"]`);
    const activeContent = document.getElementById(`${tabId}Tab`);

    if (activeTab && activeContent) {
      activeTab.classList.add("active");
      activeContent.classList.add("active");

      const newUrl = new URL(window.location);
      newUrl.searchParams.set("view", tabId);
      window.history.replaceState({}, "", newUrl);

      if (createFolderBtn) {
        createFolderBtn.style.display = tabId === "folders" ? "inline-flex" : "none";
      }

      if (libraryToolbar) {
        libraryToolbar.style.display = (tabId === "documents" || tabId === "favorites") ? "flex" : "none";
      }

      // Update contextual search placeholder
      if (searchInput) {
        if (tabId === "documents") {
          searchInput.placeholder = "Search documents by title or keyword...";
        } else if (tabId === "folders") {
          searchInput.placeholder = "Search folders by name...";
        } else if (tabId === "favorites") {
          searchInput.placeholder = "Search favorite documents...";
        }
      }

      if (loadData) {
        if (tabId === "documents") loadDocuments();
        else if (tabId === "folders") loadFolders(currentParentFolderId);
        else if (tabId === "favorites") loadFavorites();
      }
    }
  }

  function getActiveTab() {
    const activeTab = document.querySelector(".library-tab.active");
    return activeTab ? activeTab.dataset.tab : "documents";
  }

  // --- EVENT LISTENERS ---
  function setupEventListeners() {
    if (searchInput) {
      searchInput.addEventListener("input", () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          const tab = getActiveTab();
          if (tab === "documents") loadDocuments();
          else if (tab === "folders") loadFolders(currentParentFolderId);
          else if (tab === "favorites") loadFavorites();
        }, 400);
      });
    }

    const triggerReload = () => {
      const tab = getActiveTab();
      if (tab === "documents") loadDocuments();
      else if (tab === "folders") loadFolders(currentParentFolderId);
      else if (tab === "favorites") loadFavorites();
    };

    if (subjectFilter) {
      subjectFilter.addEventListener("input", triggerReload);
    }
    if (fileTypeFilter) {
      fileTypeFilter.addEventListener("change", triggerReload);
    }
    if (folderFilter) {
      folderFilter.addEventListener("change", triggerReload);
    }

    if (uploadDocumentBtn) {
      uploadDocumentBtn.addEventListener("click", () => {
        const params = new URLSearchParams(window.location.search);
        let returnUrl = 'my-library.html?view=documents';
        if (params.get('view') === 'folders' && currentParentFolderId) {
          returnUrl = `my-library.html?view=folders&folderId=${currentParentFolderId}`;
        }
        window.location.href = `upload.html?returnUrl=${encodeURIComponent(returnUrl)}`;
      });
    }

    const clearFiltersBtn = document.getElementById("clearFiltersBtn");
    if (clearFiltersBtn) {
      clearFiltersBtn.addEventListener("click", () => {
        if (searchInput) searchInput.value = "";
        if (subjectFilter) { subjectFilter.value = ""; subjectFilter.dispatchEvent(new Event("syncCustom")); }
        if (fileTypeFilter) { fileTypeFilter.value = ""; fileTypeFilter.dispatchEvent(new Event("syncCustom")); }
        if (folderFilter) { folderFilter.value = ""; folderFilter.dispatchEvent(new Event("syncCustom")); }

        triggerReload();
      });
    }
  }

  function setupCreateFolderModal() {
    function openFolderModal() {
      if (!createFolderModal) return;
      if (newFolderNameInput) newFolderNameInput.value = "";
      if (createFolderModalError) createFolderModalError.style.display = "none";
      createFolderModal.classList.add("open");
    }

    function closeFolderModal() {
      if (createFolderModal) createFolderModal.classList.remove("open");
    }

    if (createFolderBtn) {
      createFolderBtn.addEventListener("click", openFolderModal);
    }
    if (cancelCreateFolderBtn) {
      cancelCreateFolderBtn.addEventListener("click", closeFolderModal);
    }
    if (createFolderModal) {
      createFolderModal.addEventListener("click", (e) => {
        if (e.target === createFolderModal) closeFolderModal();
      });
    }

    if (confirmCreateFolderBtn) {
      confirmCreateFolderBtn.addEventListener("click", async () => {
        const folderName = newFolderNameInput ? newFolderNameInput.value.trim() : "";
        if (!folderName) {
          if (createFolderModalError) {
            createFolderModalError.textContent = "Folder name is required.";
            createFolderModalError.style.display = "block";
          }
          return;
        }

        confirmCreateFolderBtn.disabled = true;
        confirmCreateFolderBtn.textContent = "Creating...";

        try {
          await createFolder({ folderName, parentFolderId: currentParentFolderId });
          closeFolderModal();
          await loadAllFoldersForFilter();
          loadFolders(currentParentFolderId);
          if (window.showToast) window.showToast("Folder created successfully.", "success");
        } catch (err) {
          if (createFolderModalError) {
            createFolderModalError.textContent = err.message || "Failed to create folder.";
            createFolderModalError.style.display = "block";
          }
        } finally {
          confirmCreateFolderBtn.disabled = false;
          confirmCreateFolderBtn.textContent = "Create Folder";
        }
      });
    }
  }

  // --- HELPERS ---
  function getParentFolderIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const folderId = params.get("folderId");
    if (!folderId || folderId === "null" || folderId === "0") return null;
    const parsed = parseInt(folderId, 10);
    return isNaN(parsed) ? folderId : parsed;
  }

  function formatDate(val) {
    if (!val) return "Unknown date";
    const d = new Date(val);
    if (isNaN(d.getTime())) return "Unknown date";
    return d.toLocaleDateString("en-US", { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function getFileIcon(type) {
    if (window.getFileTypeIcon) {
      return window.getFileTypeIcon(type);
    }
    return `<span>📄</span>`;
  }

  // --- API LOADERS ---
  let allSubjects = [];
  async function loadSubjects() {
    if (typeof getSubjects !== "function") return;
    try {
      const res = await getSubjects();
      allSubjects = Array.isArray(res.data) ? res.data : [];
      if (subjectDatalist) {
        subjectDatalist.innerHTML = "";
        allSubjects.forEach(s => {
          const opt = document.createElement("option");
          const label = s.subjectCode ? `${s.subjectCode} - ${s.subjectName}` : s.subjectName;
          opt.value = label;
          opt.dataset.id = s.subjectId;
          opt.dataset.code = s.subjectCode || "";
          opt.dataset.name = s.subjectName || "";
          subjectDatalist.appendChild(opt);
        });
        if (subjectFilter) subjectFilter.dispatchEvent(new Event("syncCustom"));
      }
    } catch (e) {
      console.error("Failed to load subjects:", e);
    }
  }

  async function loadAllFoldersForFilter() {
    if (typeof getMyFolders !== "function") return;
    try {
      const res = await getMyFolders(null, true);
      userFolders = Array.isArray(res.data) ? res.data : [];
      if (folderFilter) {
        folderFilter.innerHTML = `<option value="">All Folders</option><option value="0">My Documents (no folder)</option>`;
        userFolders.forEach(f => {
          const opt = document.createElement("option");
          opt.value = f.folderId;
          opt.textContent = f.folderName;
          folderFilter.appendChild(opt);
        });
        folderFilter.dispatchEvent(new Event("syncCustom"));
      }
    } catch (e) {
      console.error("Failed to load folders for filter:", e);
    }
  }

  function getSubjectIdFromInput() {
    if (!subjectFilter) return "";
    const rawVal = subjectFilter.value.trim();
    if (!rawVal) return "";

    const codePart = rawVal.split(" - ")[0].trim();
    const found = allSubjects.find(s => 
      String(s.subjectId) === rawVal ||
      (s.subjectCode && s.subjectCode.toLowerCase() === codePart.toLowerCase()) ||
      (s.subjectName && s.subjectName.toLowerCase() === rawVal.toLowerCase()) ||
      (`${s.subjectCode} - ${s.subjectName}`.toLowerCase() === rawVal.toLowerCase())
    );
    return found ? found.subjectId : "";
  }

  // --- DOCUMENTS TAB ---
  async function loadDocuments() {
    if (!documentGrid || typeof getMyDocuments !== "function") return;
    documentGrid.innerHTML = `<div style="text-align:center; padding:40px; color:var(--muted); grid-column: 1/-1;">Loading documents...</div>`;

    try {
      const params = {
        keyword: searchInput ? searchInput.value.trim() : "",
        fileType: fileTypeFilter ? fileTypeFilter.value : "",
        folderId: folderFilter ? folderFilter.value : ""
      };
      
      const subjId = getSubjectIdFromInput();
      if (subjId) params.subjectId = subjId;

      const res = await getMyDocuments(params);
      const docs = Array.isArray(res.data) ? res.data : (res.data?.content || []);

      documentGrid.innerHTML = "";
      if (docs.length === 0) {
        if (documentEmptyState) documentEmptyState.style.display = "flex";
        documentGrid.style.display = "none";
      } else {
        if (documentEmptyState) documentEmptyState.style.display = "none";
        documentGrid.style.display = "grid";
        docs.forEach(doc => {
          documentGrid.appendChild(createDocumentCard(doc));
        });
      }
    } catch (e) {
      console.error("Failed to load documents:", e);
      documentGrid.innerHTML = `<div style="text-align:center; padding:40px; color:var(--danger); grid-column: 1/-1;">Failed to load documents.</div>`;
    }
  }

  function createDocumentCard(doc) {
    const card = document.createElement("article");
    card.className = "document-card";

    // Icon
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = getFileIcon(doc.fileType);
    const iconElement = tempDiv.firstElementChild;

    if (iconElement) {
      iconElement.style.width = "40px";
      iconElement.style.height = "40px";
      iconElement.style.borderRadius = "10px";
      iconElement.style.display = "flex";
      iconElement.style.alignItems = "center";
      iconElement.style.justifyContent = "center";
      iconElement.style.flexShrink = "0";
      card.appendChild(iconElement);
    }

    // Content
    const content = document.createElement("div");
    content.className = "document-card-content";

    const header = document.createElement("div");
    header.className = "document-card-header";

    const title = document.createElement("h3");
    const link = document.createElement("a");
    link.href = `document-detail.html?id=${doc.documentId}`;
    link.textContent = doc.title || doc.originalFileName || "Untitled";
    link.style.color = "inherit";
    link.style.textDecoration = "none";
    title.appendChild(link);
    header.appendChild(title);

    // Favorite Button
    if (typeof isDocumentFavorited === "function") {
      const favBtn = document.createElement("button");
      const isFav = isDocumentFavorited(doc);
      favBtn.className = "favorite-star-btn" + (isFav ? " favorited" : "");
      favBtn.style.position = "absolute";
      favBtn.style.top = "4px";
      favBtn.style.right = "6px";
      favBtn.style.margin = "0";
      favBtn.title = isFav ? "Remove from favorites" : "Add to favorites";
      favBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/></svg>';
      favBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        try {
          if (favBtn.classList.contains("favorited")) {
            await unfavoriteDocument(doc.documentId);
            favBtn.classList.remove("favorited");
            favBtn.title = "Add to favorites";
            setDocumentFavorited(doc, false);
          } else {
            await favoriteDocument(doc.documentId);
            favBtn.classList.add("favorited");
            favBtn.title = "Remove from favorites";
            setDocumentFavorited(doc, true);
          }
          if (getActiveTab() === "favorites") {
            loadFavorites();
          }
        } catch (err) {
          console.error("Favorite toggle failed:", err);
        }
      });
      header.appendChild(favBtn);
    }

    content.appendChild(header);

    // Meta details
    const meta = document.createElement("div");
    meta.className = "document-meta";

    meta.innerHTML += `<span class="document-meta-item">📅 ${formatDate(doc.createdAt)}</span>`;

    // Robust Subject Fallback: subjectCode -> subjectName -> lookup via subjectId -> nested subject object
    let subjectTag = doc.subjectCode || doc.subjectName || "";
    if (!subjectTag && doc.subjectId) {
      const foundSubj = allSubjects.find(s => String(s.subjectId) === String(doc.subjectId));
      if (foundSubj) {
        subjectTag = foundSubj.subjectCode || foundSubj.subjectName || "";
      }
    }
    if (!subjectTag && doc.subject && typeof doc.subject === "object") {
      subjectTag = doc.subject.subjectCode || doc.subject.subjectName || "";
    }
    if (subjectTag) {
      meta.innerHTML += `<span class="document-meta-item">📚 ${subjectTag}</span>`;
    }

    // Robust Folder Fallback: folderName -> lookup via folderId -> nested folder object
    let folderTag = doc.folderName || "";
    if (!folderTag && doc.folderId && doc.folderId !== 0) {
      const folderObj = userFolders.find(f => String(f.folderId) === String(doc.folderId));
      if (folderObj) folderTag = folderObj.folderName;
    }
    if (!folderTag && doc.folder && typeof doc.folder === "object") {
      folderTag = doc.folder.folderName || doc.folder.name || "";
    }
    if (folderTag) {
      meta.innerHTML += `<span class="document-meta-item">📁 ${folderTag}</span>`;
    }

    content.appendChild(meta);
    card.appendChild(content);

    card.style.position = "relative";
    card.style.cursor = "pointer";
    card.addEventListener("click", (e) => {
      if (e.target.closest("button") || e.target.closest("a")) return;
      window.location.href = `document-detail.html?id=${doc.documentId}`;
    });

    return card;
  }

  // --- FOLDERS TAB ---
  async function buildBreadcrumb() {
    breadcrumbTrail = [{ folderId: null, name: "My Documents" }];
    if (!currentParentFolderId) {
      renderBreadcrumb();
      return;
    }

    try {
      let currentId = currentParentFolderId;
      const trail = [];
      let iterations = 0;

      while (currentId && iterations < 50) {
        let f = userFolders.find(x => x.folderId === currentId);
        if (!f && typeof getFolderById === "function") {
          const res = await getFolderById(currentId);
          f = res.data;
        }
        if (f) {
          trail.unshift({ folderId: f.folderId, name: f.folderName });
          currentId = f.parentFolderId && f.parentFolderId !== 0 ? f.parentFolderId : null;
        } else {
          break;
        }
        iterations++;
      }
      breadcrumbTrail = breadcrumbTrail.concat(trail);
      renderBreadcrumb();
    } catch (e) {
      console.error("Breadcrumb build error:", e);
      renderBreadcrumb();
    }
  }

  function renderBreadcrumb() {
    if (!folderBreadcrumb) return;
    folderBreadcrumb.innerHTML = "";

    breadcrumbTrail.forEach((crumb, idx) => {
      if (idx > 0) {
        const sep = document.createElement("span");
        sep.textContent = " › ";
        sep.style.color = "var(--border-dark)";
        folderBreadcrumb.appendChild(sep);
      }
      const link = document.createElement("a");
      link.href = "#";
      link.className = "breadcrumb-link";
      link.textContent = crumb.name;
      if (idx === breadcrumbTrail.length - 1) {
        link.style.color = "var(--text-main)";
        link.style.fontWeight = "600";
        link.style.pointerEvents = "none";
      } else {
        link.style.color = "var(--primary)";
        link.style.textDecoration = "none";
        link.addEventListener("click", (e) => {
          e.preventDefault();
          navigateToFolder(crumb.folderId);
        });
      }
      folderBreadcrumb.appendChild(link);
    });
  }

  function navigateToFolder(id) {
    currentParentFolderId = id;
    const newUrl = new URL(window.location);
    newUrl.searchParams.set("view", "folders");
    if (id) newUrl.searchParams.set("folderId", id);
    else newUrl.searchParams.delete("folderId");
    window.history.pushState({}, "", newUrl);

    loadFolders(currentParentFolderId);
  }

  async function loadFolders(parentId) {
    buildBreadcrumb();

    const foldersSection = document.getElementById("foldersSection");
    const folderDocsSection = document.getElementById("folderDocsSection");
    const folderGrid = document.getElementById("folderGrid");
    const folderDocsGrid = document.getElementById("folderDocsGrid");

    if (foldersSection) foldersSection.style.display = "none";
    if (folderDocsSection) folderDocsSection.style.display = "none";
    if (folderEmptyState) folderEmptyState.style.display = "none";

    try {
      const kw = searchInput ? searchInput.value.trim().toLowerCase() : "";

      const [foldersRes, docsRes] = await Promise.all([
        typeof getMyFolders === "function" ? getMyFolders(parentId, false).catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
        typeof getMyDocuments === "function" ? getMyDocuments({ folderId: parentId || 0, includeSubfolders: false }).catch(() => ({ data: [] })) : Promise.resolve({ data: [] })
      ]);

      let subfolders = Array.isArray(foldersRes.data) ? foldersRes.data : [];
      let docs = Array.isArray(docsRes.data) ? docsRes.data : (docsRes.data?.content || []);

      // Keyword search filter for folders view
      if (kw) {
        subfolders = subfolders.filter(f => f.folderName && f.folderName.toLowerCase().includes(kw));
        docs = docs.filter(d => 
          (d.title && d.title.toLowerCase().includes(kw)) ||
          (d.originalFileName && d.originalFileName.toLowerCase().includes(kw))
        );
      }

      const hasSubfolders = subfolders.length > 0;
      const hasDocs = docs.length > 0;

      if (!hasSubfolders && !hasDocs) {
        if (folderEmptyState) folderEmptyState.style.display = "flex";
      } else {
        if (folderEmptyState) folderEmptyState.style.display = "none";

        if (hasSubfolders && foldersSection && folderGrid) {
          folderGrid.innerHTML = "";
          subfolders.forEach(f => folderGrid.appendChild(createFolderCard(f)));
          foldersSection.style.display = "block";
        }

        if (hasDocs && folderDocsSection && folderDocsGrid) {
          folderDocsGrid.innerHTML = "";
          docs.forEach(doc => folderDocsGrid.appendChild(createDocumentCard(doc)));
          folderDocsSection.style.display = "block";
        }
      }
    } catch (e) {
      console.error("Failed to load folders & documents:", e);
      if (folderEmptyState) folderEmptyState.style.display = "flex";
    }
  }

  function createFolderCard(f) {
    const card = document.createElement("div");
    card.className = "folder-card";

    const main = document.createElement("div");
    main.className = "folder-card-main";

    const icon = document.createElement("div");
    icon.className = "folder-icon";
    icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"/></svg>';
    main.appendChild(icon);

    const text = document.createElement("div");
    text.className = "folder-info-text";

    const title = document.createElement("h3");
    title.className = "folder-name";
    title.textContent = f.folderName;
    text.appendChild(title);

    const meta = document.createElement("p");
    meta.className = "folder-meta";
    let metaTxt = [];
    if (f.subfolderCount !== undefined) metaTxt.push(`${f.subfolderCount} subfolders`);
    const docCount = f.documentCount !== undefined ? f.documentCount : f.fileCount;
    if (docCount !== undefined) metaTxt.push(`${docCount} files`);
    metaTxt.push(formatDate(f.createdAt));
    meta.textContent = metaTxt.join(" • ");
    text.appendChild(meta);

    main.appendChild(text);
    card.appendChild(main);

    card.addEventListener("click", (e) => {
      if (e.target.closest('.btn-kebab')) return;
      navigateToFolder(f.folderId);
    });

    return card;
  }

  // --- FAVORITES TAB ---
  async function loadFavorites() {
    const favoritesGrid = document.getElementById("favoritesGrid");
    const favoritesEmptyState = document.getElementById("favoritesEmptyState");
    if (!favoritesGrid || typeof getFavoriteDocuments !== "function") return;

    favoritesGrid.innerHTML = `<div style="text-align:center; padding:40px; color:var(--muted); grid-column: 1/-1;">Loading favorites...</div>`;
    if (favoritesEmptyState) favoritesEmptyState.style.display = "none";

    try {
      const res = await getFavoriteDocuments();
      let docs = [];
      if (Array.isArray(res.data)) docs = res.data;
      else if (Array.isArray(res)) docs = res;
      else if (res && res.data && Array.isArray(res.data.content)) docs = res.data.content;

      // Apply filters to favorite documents
      const kw = searchInput ? searchInput.value.trim().toLowerCase() : "";
      const subjId = getSubjectIdFromInput();
      const fType = fileTypeFilter ? fileTypeFilter.value : "";
      const fId = folderFilter ? folderFilter.value : "";

      if (kw) {
        docs = docs.filter(d => 
          (d.title && d.title.toLowerCase().includes(kw)) ||
          (d.originalFileName && d.originalFileName.toLowerCase().includes(kw))
        );
      }
      if (subjId) {
        docs = docs.filter(d => 
          String(d.subjectId) === String(subjId) ||
          (d.subject && String(d.subject.subjectId) === String(subjId))
        );
      }
      if (fType) {
        docs = docs.filter(d => d.fileType && d.fileType.toUpperCase() === fType.toUpperCase());
      }
      if (fId) {
        if (fId === "0") {
          docs = docs.filter(d => !d.folderId || d.folderId === 0);
        } else {
          docs = docs.filter(d => 
            String(d.folderId) === String(fId) ||
            (d.folder && String(d.folder.folderId) === String(fId))
          );
        }
      }

      favoritesGrid.innerHTML = "";
      if (docs.length === 0) {
        if (favoritesEmptyState) favoritesEmptyState.style.display = "flex";
        favoritesGrid.style.display = "none";
      } else {
        if (favoritesEmptyState) favoritesEmptyState.style.display = "none";
        favoritesGrid.style.display = "grid";
        docs.forEach(doc => favoritesGrid.appendChild(createDocumentCard(doc)));
      }
    } catch (e) {
      console.error("Failed to load favorites:", e);
      favoritesGrid.innerHTML = `<div style="text-align:center; padding:40px; color:var(--danger); grid-column: 1/-1;">Failed to load favorites.</div>`;
    }
  }
});
