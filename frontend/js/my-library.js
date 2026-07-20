document.addEventListener("DOMContentLoaded", async function () {
  // 1. Check Authentication
  if (window.authReady) {
    const isAuthenticated = await window.authReady;
    if (!isAuthenticated) return;
  }

  // State
  let userFolders = [];
  let currentParentFolderId = getParentFolderIdFromUrl();
  let breadcrumbTrail = [{ folderId: null, name: "My Library" }];

  // Elements
  const tabs = document.querySelectorAll(".library-tab");
  const contents = document.querySelectorAll(".tab-content");

  const searchInput = document.getElementById("searchInput");
  const subjectFilter = document.getElementById("subjectFilter");
  const subjectDatalist = document.getElementById("subjectDatalist");
  const fileTypeFilter = document.getElementById("fileTypeFilter");
  const folderFilter = document.getElementById("folderFilter");
  const toggleFavoritesBtn = document.getElementById("toggleFavoritesBtn");

  const documentGrid = document.getElementById("documentGrid");
  const documentEmptyState = document.getElementById("documentEmptyState");

  const folderGrid = document.getElementById("folderGrid");
  const folderEmptyState = document.getElementById("folderEmptyState");
  const folderBreadcrumb = document.getElementById("folderBreadcrumb");
  const createFolderBtn = document.getElementById("createFolderBtn");
  const uploadDocumentBtn = document.getElementById("uploadDocumentBtn");

  let showFavoritesOnly = false;
  let searchTimeout = null;

  // Initialize
  init();

  async function init() {
    if (typeof renderNavigation === "function") {
      renderNavigation();
    }

    setupTabs();
    setupEventListeners();

    // Load filters data
    await Promise.all([
      loadSubjects(),
      loadAllFoldersForFilter()
    ]);

    // Initial Load based on current tab
    const currentTab = new URLSearchParams(window.location.search).get("view") || "documents";
    if (currentTab === "documents") {
      const searchParam = new URLSearchParams(window.location.search).get("search");
      if (searchParam && searchInput) {
        searchInput.value = searchParam;
      }
      loadDocuments();
    } else {
      loadFolders(currentParentFolderId);
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
      
      if (toggleFavoritesBtn) {
        toggleFavoritesBtn.style.display = tabId === "documents" ? "inline-flex" : "none";
      }

      if (loadData) {
        if (tabId === "documents") loadDocuments();
        if (tabId === "folders") loadFolders(currentParentFolderId);
      }
    }
  }

  // --- EVENT LISTENERS ---
  function setupEventListeners() {
    if (searchInput) {
      searchInput.addEventListener("input", () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          const activeTab = document.querySelector(".library-tab.active").dataset.tab;
          if (activeTab === "documents") loadDocuments();
          else loadFolders(currentParentFolderId);
        }, 500);
      });
    }

    if (subjectFilter) {
      subjectFilter.addEventListener("input", loadDocuments);
    }
    if (fileTypeFilter) {
      fileTypeFilter.addEventListener("change", loadDocuments);
    }
    if (folderFilter) {
      folderFilter.addEventListener("change", loadDocuments);
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

    if (createFolderBtn) {
      createFolderBtn.addEventListener("click", () => {
        // Mock prompt or use your folder modal
        const folderName = prompt("Enter folder name:");
        if (folderName) {
          createFolder({ folderName, parentFolderId: currentParentFolderId }).then(() => {
            loadFolders(currentParentFolderId);
          });
        }
      });
    }

    if (toggleFavoritesBtn) {
      toggleFavoritesBtn.addEventListener("click", () => {
        showFavoritesOnly = !showFavoritesOnly;
        if (showFavoritesOnly) {
          toggleFavoritesBtn.classList.remove("btn-secondary");
          toggleFavoritesBtn.classList.add("btn-primary");
        } else {
          toggleFavoritesBtn.classList.remove("btn-primary");
          toggleFavoritesBtn.classList.add("btn-secondary");
        }
        loadDocuments();
      });
    }
    
    const clearFiltersBtn = document.getElementById("clearFiltersBtn");
    if (clearFiltersBtn) {
      clearFiltersBtn.addEventListener("click", () => {
        if (searchInput) searchInput.value = "";
        if (subjectFilter) { subjectFilter.value = ""; subjectFilter.dispatchEvent(new Event("syncCustom")); }
        if (fileTypeFilter) { fileTypeFilter.value = ""; fileTypeFilter.dispatchEvent(new Event("syncCustom")); }
        if (folderFilter) { folderFilter.value = ""; folderFilter.dispatchEvent(new Event("syncCustom")); }
        
        showFavoritesOnly = false;
        if (toggleFavoritesBtn) {
          toggleFavoritesBtn.classList.remove("btn-primary");
          toggleFavoritesBtn.classList.add("btn-secondary");
        }
        
        loadDocuments();
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
          opt.value = s.subjectCode ? `${s.subjectCode} - ${s.subjectName}` : s.subjectName;
          subjectDatalist.appendChild(opt);
        });
        if (subjectFilter) subjectFilter.dispatchEvent(new Event("syncCustom"));
      }
    } catch (e) { console.error(e); }
  }

  async function loadAllFoldersForFilter() {
    if (typeof getMyFolders !== "function") return;
    try {
      const res = await getMyFolders(null, true);
      userFolders = Array.isArray(res.data) ? res.data : [];
      if (folderFilter) {
        folderFilter.innerHTML = `<option value="">All Folders</option><option value="0">Root (My Library)</option>`;
        userFolders.forEach(f => {
          const opt = document.createElement("option");
          opt.value = f.folderId;
          opt.textContent = f.folderName;
          folderFilter.appendChild(opt);
        });
        folderFilter.dispatchEvent(new Event("syncCustom"));
      }
    } catch (e) { console.error(e); }
  }

  function getSubjectIdFromInput() {
    if (!subjectFilter) return "";
    const val = subjectFilter.value;
    if (!val) return "";
    const code = val.split(" - ")[0];
    const subj = allSubjects.find(s => s.subjectCode === code || s.subjectName === val);
    return subj ? subj.subjectId : "";
  }

  // --- DOCUMENTS LOGIC ---
  async function loadDocuments() {
    if (!documentGrid || typeof getMyDocuments !== "function") return;
    documentGrid.innerHTML = `<div style="text-align:center; padding:40px; color:var(--muted); grid-column: 1/-1;">Loading documents...</div>`;

    try {
      let docs = [];
      if (showFavoritesOnly && typeof getFavoriteDocuments === "function") {
        const res = await getFavoriteDocuments();
        docs = Array.isArray(res.data) ? res.data : [];
      } else {
        const params = {
          keyword: searchInput ? searchInput.value.trim() : "",
          fileType: fileTypeFilter ? fileTypeFilter.value : "",
          folderId: folderFilter ? folderFilter.value : ""
        };
        
        const subjId = getSubjectIdFromInput();
        if (subjId) params.subjectId = subjId;

        // Fetch filtered documents from API
        const res = await getMyDocuments(params);
        docs = Array.isArray(res.data) ? res.data : (res.data?.content || []);
      }

      documentGrid.innerHTML = "";
      if (docs.length === 0) {
        documentEmptyState.style.display = "flex";
        documentGrid.style.display = "none";
      } else {
        documentEmptyState.style.display = "none";
        documentGrid.style.display = "grid";
        docs.forEach(doc => {
          documentGrid.appendChild(createDocumentCard(doc));
        });
      }
    } catch (e) {
      console.error(e);
      documentGrid.innerHTML = `<div style="text-align:center; padding:40px; color:red; grid-column: 1/-1;">Failed to load documents.</div>`;
    }
  }

  function createDocumentCard(doc) {
    const card = document.createElement("article");
    card.className = "document-card";

    // Icon
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = getFileIcon(doc.fileType);
    const iconElement = tempDiv.firstElementChild;

    // Style the icon directly to match dashboard size but without a double-box
    iconElement.style.width = "40px";
    iconElement.style.height = "40px";
    iconElement.style.borderRadius = "10px";
    iconElement.style.display = "flex";
    iconElement.style.alignItems = "center";
    iconElement.style.justifyContent = "center";
    iconElement.style.flexShrink = "0";

    card.appendChild(iconElement);

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
      favBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/></svg>';
      favBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        if (favBtn.classList.contains("favorited")) {
          await unfavoriteDocument(doc.documentId);
          favBtn.classList.remove("favorited");
          setDocumentFavorited(doc, false);
        } else {
          await favoriteDocument(doc.documentId);
          favBtn.classList.add("favorited");
          setDocumentFavorited(doc, true);
        }
      });
      header.appendChild(favBtn);
    }

    content.appendChild(header);

    // Meta details (Clean as requested)
    const meta = document.createElement("div");
    meta.className = "document-meta";

    meta.innerHTML += `<span class="document-meta-item">📅 ${formatDate(doc.createdAt)}</span>`;
    if (doc.subjectCode) {
      meta.innerHTML += `<span class="document-meta-item">📚 ${doc.subjectCode}</span>`;
    }
    if (doc.folderId && doc.folderId !== 0) {
      const folderName = userFolders.find(f => f.folderId === doc.folderId)?.folderName || "Folder";
      meta.innerHTML += `<span class="document-meta-item">📁 ${folderName}</span>`;
    }

    content.appendChild(meta);
    card.appendChild(content);

    // Make the entire card clickable and relative for absolute star
    card.style.position = "relative";
    card.style.cursor = "pointer";
    card.addEventListener("click", (e) => {
      if (e.target.closest("button") || e.target.closest("a")) return;
      window.location.href = `document-detail.html?id=${doc.documentId}`;
    });

    return card;
  }

  // --- FOLDERS LOGIC ---
  async function buildBreadcrumb() {
    breadcrumbTrail = [{ folderId: null, name: "My Library" }];
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
      console.error(e);
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
    if (!folderGrid || typeof getMyFolders !== "function") return;

    buildBreadcrumb();
    folderGrid.innerHTML = `<div style="text-align:center; padding:40px; color:var(--muted); grid-column: 1/-1;">Loading folders...</div>`;

    try {
      const kw = searchInput ? searchInput.value.trim().toLowerCase() : "";

      const res = await getMyFolders(parentId, false);
      let list = Array.isArray(res.data) ? res.data : [];

      if (kw) {
        list = list.filter(f => f.folderName && f.folderName.toLowerCase().includes(kw));
      }

      folderGrid.innerHTML = "";
      if (list.length === 0) {
        folderEmptyState.style.display = "flex";
        folderGrid.style.display = "none";
      } else {
        folderEmptyState.style.display = "none";
        folderGrid.style.display = "grid";
        list.forEach(f => {
          folderGrid.appendChild(createFolderCard(f));
        });
      }
    } catch (e) {
      console.error(e);
      folderGrid.innerHTML = `<div style="text-align:center; padding:40px; color:red; grid-column: 1/-1;">Failed to load folders.</div>`;
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
    if (f.documentCount !== undefined) metaTxt.push(`${f.documentCount} files`);
    metaTxt.push(formatDate(f.createdAt));
    meta.textContent = metaTxt.join(" • ");
    text.appendChild(meta);

    main.appendChild(text);
    card.appendChild(main);

    // Actions kebab
    const actions = document.createElement("div");
    actions.className = "folder-card-actions";
    actions.innerHTML = `<button class="btn-kebab" title="More actions"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="20" height="20"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"/></svg></button>`;

    // Clicking the card body navigates to it
    card.addEventListener("click", (e) => {
      if (e.target.closest('.btn-kebab')) return;
      navigateToFolder(f.folderId);
    });

    card.appendChild(actions);
    return card;
  }
});
