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

      const shareFolderBtn = document.getElementById("shareFolderBtn");
      if (shareFolderBtn) {
        shareFolderBtn.style.display = (tabId === "folders" && currentParentFolderId) ? "inline-flex" : "none";
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
        let uploadTarget = 'upload.html';

        if (params.get('view') === 'folders' && currentParentFolderId) {
          returnUrl = `my-library.html?view=folders&folderId=${currentParentFolderId}`;
          const currentFolder = userFolders.find(x => x.folderId === currentParentFolderId);
          const folderName = currentFolder ? currentFolder.folderName : "";
          uploadTarget = `upload.html?source=folder&folderId=${currentParentFolderId}&folderName=${encodeURIComponent(folderName)}`;
        }

        const separator = uploadTarget.includes('?') ? '&' : '?';
        window.location.href = `${uploadTarget}${separator}returnUrl=${encodeURIComponent(returnUrl)}`;
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

    // Share Folder Modal Bindings
    const shareFolderBtn = document.getElementById("shareFolderBtn");
    const shareFolderModal = document.getElementById("shareFolderModal");
    const shareFolderModalTitle = document.getElementById("shareFolderModalTitle");
    const modalTabUserBtn = document.getElementById("modalTabUserBtn");
    const modalTabGroupBtn = document.getElementById("modalTabGroupBtn");
    const modalUserPanel = document.getElementById("modalUserPanel");
    const modalGroupPanel = document.getElementById("modalGroupPanel");
    const shareFolderCloseBtn = document.getElementById("shareFolderCloseBtn");
    const shareUserConfirmBtn = document.getElementById("shareUserConfirmBtn");
    const shareGroupConfirmBtn = document.getElementById("shareGroupConfirmBtn");
    const shareUserEmail = document.getElementById("shareUserEmail");
    const shareGroupSelect = document.getElementById("shareGroupSelect");
    const shareUserError = document.getElementById("shareUserError");
    const shareGroupError = document.getElementById("shareGroupError");
    const sharesList = document.getElementById("sharesList");
    const sharesEmpty = document.getElementById("sharesEmpty");
    const sharesLoader = document.getElementById("sharesLoader");

    if (modalTabUserBtn && modalTabGroupBtn) {
      modalTabUserBtn.addEventListener("click", () => {
        modalTabUserBtn.classList.add("active");
        modalTabGroupBtn.classList.remove("active");
        modalTabUserBtn.style.borderBottomColor = "var(--primary)";
        modalTabUserBtn.style.color = "var(--primary)";
        modalTabGroupBtn.style.borderBottomColor = "transparent";
        modalTabGroupBtn.style.color = "var(--muted)";
        if (modalUserPanel) modalUserPanel.style.display = "block";
        if (modalGroupPanel) modalGroupPanel.style.display = "none";
      });

      modalTabGroupBtn.addEventListener("click", () => {
        modalTabGroupBtn.classList.add("active");
        modalTabUserBtn.classList.remove("active");
        modalTabGroupBtn.style.borderBottomColor = "var(--primary)";
        modalTabGroupBtn.style.color = "var(--primary)";
        modalTabUserBtn.style.borderBottomColor = "transparent";
        modalTabUserBtn.style.color = "var(--muted)";
        if (modalGroupPanel) modalGroupPanel.style.display = "block";
        if (modalUserPanel) modalUserPanel.style.display = "none";
      });
    }

    if (shareFolderCloseBtn && shareFolderModal) {
      shareFolderCloseBtn.addEventListener("click", () => {
        shareFolderModal.classList.remove("open");
      });
    }

    const shareFolderModalXBtn = document.getElementById("shareFolderModalXBtn");
    if (shareFolderModalXBtn && shareFolderModal) {
      shareFolderModalXBtn.addEventListener("click", () => {
        shareFolderModal.classList.remove("open");
      });
    }

    if (shareFolderBtn && shareFolderModal) {
      shareFolderBtn.addEventListener("click", async () => {
        if (!currentParentFolderId) return;
        const currentFolder = userFolders.find(x => x.folderId === currentParentFolderId);
        const folderName = currentFolder ? currentFolder.folderName : "Folder";
        if (shareFolderModalTitle) shareFolderModalTitle.textContent = `Share “${folderName}”`;

        if (shareUserError) shareUserError.style.display = "none";
        if (shareGroupError) shareGroupError.style.display = "none";
        if (shareUserEmail) shareUserEmail.value = "";
        if (shareGroupSelect) shareGroupSelect.value = "";

        if (modalTabUserBtn) modalTabUserBtn.click();
        shareFolderModal.classList.add("open");

        if (typeof getFolderShares === "function") {
          loadFolderSharesList(currentParentFolderId);
        }
        if (typeof getMyGroups === "function") {
          loadFolderGroupsList();
        }
      });
    }

    let libraryFolderUserShares = [];
    let libraryFolderGroupShares = [];

    function isValidShareEmail(email) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    if (shareUserConfirmBtn) shareUserConfirmBtn.disabled = true;
    if (shareGroupConfirmBtn) shareGroupConfirmBtn.disabled = true;

    if (shareUserEmail) {
      shareUserEmail.addEventListener("input", () => {
        if (shareUserError) shareUserError.style.display = "none";
        const email = shareUserEmail.value.trim();
        if (shareUserConfirmBtn) shareUserConfirmBtn.disabled = !email || !isValidShareEmail(email);
      });
    }

    if (shareGroupSelect) {
      shareGroupSelect.addEventListener("change", () => {
        if (shareGroupError) shareGroupError.style.display = "none";
        if (shareGroupConfirmBtn) shareGroupConfirmBtn.disabled = !shareGroupSelect.value;
      });
    }

    async function loadFolderSharesList(folderId) {
      if (!sharesList || !sharesEmpty) return;
      if (sharesLoader) sharesLoader.style.display = "flex";
      sharesList.innerHTML = "";
      sharesEmpty.style.display = "none";

      try {
        const res = await getFolderShares(folderId);
        if (sharesLoader) sharesLoader.style.display = "none";
        const shares = res.data || res || {};
        const userShares = Array.isArray(shares.userShares) ? shares.userShares : [];
        const groupShares = Array.isArray(shares.groupShares) ? shares.groupShares : [];

        libraryFolderUserShares = userShares;
        libraryFolderGroupShares = groupShares;

        if (userShares.length === 0 && groupShares.length === 0) {
          sharesEmpty.style.display = "block";
          return;
        }

        // Users Section
        const userSection = document.createElement("div");
        userSection.className = "share-section";
        userSection.style.cssText = "margin-bottom: 16px;";

        const userHeader = document.createElement("div");
        userHeader.style.cssText = "font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;";
        userHeader.textContent = `Users (${userShares.length})`;
        userSection.appendChild(userHeader);

        if (userShares.length === 0) {
          const emptyUser = document.createElement("div");
          emptyUser.style.cssText = "font-size: 12px; color: var(--muted); padding: 4px 0; font-style: italic;";
          emptyUser.textContent = "No direct user shares.";
          userSection.appendChild(emptyUser);
        } else {
          userShares.forEach(share => {
            const item = document.createElement("div");
            item.style.cssText = "display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; border: 1px solid var(--border); border-radius: 8px; margin-bottom: 6px; background: #fafafa;";

            const info = document.createElement("div");
            info.style.cssText = "display: flex; align-items: center; gap: 8px;";
            info.innerHTML = `<span>👤</span><span style="font-size: 13px; font-weight: 500;">${share.sharedWithEmail || share.sharedWithName || share.email || "User"}</span>`;

            const revokeBtn = document.createElement("button");
            revokeBtn.type = "button";
            revokeBtn.className = "btn btn-danger btn-sm";
            revokeBtn.style.cssText = "padding: 4px 10px; font-size: 12px;";
            revokeBtn.textContent = "Revoke";
            revokeBtn.addEventListener("click", async () => {
              revokeBtn.disabled = true;
              try {
                if (typeof revokeFolderShare === "function") {
                  await revokeFolderShare(share.shareId);
                  if (typeof showToast === "function") showToast("User access revoked.", "success");
                  loadFolderSharesList(folderId);
                }
              } catch (err) {
                alert(err.message || "Failed to revoke share.");
              } finally {
                revokeBtn.disabled = false;
              }
            });

            item.append(info, revokeBtn);
            userSection.appendChild(item);
          });
        }

        // Groups Section
        const groupSection = document.createElement("div");
        groupSection.className = "share-section";
        groupSection.style.cssText = "margin-bottom: 8px;";

        const groupHeader = document.createElement("div");
        groupHeader.style.cssText = "font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;";
        groupHeader.textContent = `Groups (${groupShares.length})`;
        groupSection.appendChild(groupHeader);

        if (groupShares.length === 0) {
          const emptyGroup = document.createElement("div");
          emptyGroup.style.cssText = "font-size: 12px; color: var(--muted); padding: 4px 0; font-style: italic;";
          emptyGroup.textContent = "No group shares.";
          groupSection.appendChild(emptyGroup);
        } else {
          groupShares.forEach(share => {
            const item = document.createElement("div");
            item.style.cssText = "display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; border: 1px solid var(--border); border-radius: 8px; margin-bottom: 6px; background: #fafafa;";

            const info = document.createElement("div");
            info.style.cssText = "display: flex; align-items: center; gap: 8px;";
            info.innerHTML = `<span>👥</span><span style="font-size: 13px; font-weight: 500;">${share.groupName || "Group"}</span>`;

            const revokeBtn = document.createElement("button");
            revokeBtn.type = "button";
            revokeBtn.className = "btn btn-danger btn-sm";
            revokeBtn.style.cssText = "padding: 4px 10px; font-size: 12px;";
            revokeBtn.textContent = "Revoke";
            revokeBtn.addEventListener("click", async () => {
              revokeBtn.disabled = true;
              try {
                if (typeof revokeGroupFolderShare === "function") {
                  await revokeGroupFolderShare(share.shareId);
                  if (typeof showToast === "function") showToast("Group access revoked.", "success");
                  loadFolderSharesList(folderId);
                }
              } catch (err) {
                alert(err.message || "Failed to revoke group share.");
              } finally {
                revokeBtn.disabled = false;
              }
            });

            item.append(info, revokeBtn);
            groupSection.appendChild(item);
          });
        }

        sharesList.append(userSection, groupSection);
        sharesList.style.display = "block";
      } catch (err) {
        if (sharesLoader) sharesLoader.style.display = "none";
        sharesEmpty.textContent = "Failed to load shares.";
        sharesEmpty.style.display = "block";
      }
    }

    async function loadFolderGroupsList() {
      if (!shareGroupSelect) return;
      try {
        const res = await getMyGroups();
        const groups = Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
        shareGroupSelect.innerHTML = `<option value="">-- Choose a Group --</option>`;
        groups.forEach(g => {
          const opt = document.createElement("option");
          opt.value = g.groupId || g.id;
          opt.textContent = `👥 ${g.groupName || g.name}`;
          shareGroupSelect.appendChild(opt);
        });
      } catch (err) {
        console.warn("Failed to load groups:", err);
      }
    }

    if (shareUserConfirmBtn) {
      shareUserConfirmBtn.addEventListener("click", async () => {
        const email = shareUserEmail.value.trim();
        if (!email) {
          if (shareUserError) {
            shareUserError.textContent = "User email is required.";
            shareUserError.style.display = "block";
          }
          shareUserConfirmBtn.disabled = true;
          return;
        }
        if (!isValidShareEmail(email)) {
          if (shareUserError) {
            shareUserError.textContent = "Please enter a valid email address.";
            shareUserError.style.display = "block";
          }
          shareUserConfirmBtn.disabled = true;
          return;
        }

        // Check self share
        let currentUserEmail = "";
        if (typeof getStoredUser === "function") {
          const user = getStoredUser();
          if (user && user.email) currentUserEmail = user.email;
        }
        if (!currentUserEmail && localStorage.getItem("user")) {
          try { currentUserEmail = JSON.parse(localStorage.getItem("user")).email || ""; } catch (e) {}
        }
        if (currentUserEmail && email.toLowerCase() === currentUserEmail.toLowerCase()) {
          if (shareUserError) {
            shareUserError.textContent = "You cannot share a folder with yourself.";
            shareUserError.style.display = "block";
          }
          return;
        }

        // Check already shared
        const isAlreadyShared = libraryFolderUserShares.some(s =>
          (s.sharedWithEmail || s.email || s.sharedWithName || "").toLowerCase() === email.toLowerCase()
        );
        if (isAlreadyShared) {
          if (shareUserError) {
            shareUserError.textContent = "This folder is already shared with this user.";
            shareUserError.style.display = "block";
          }
          return;
        }

        if (shareUserError) shareUserError.style.display = "none";
        shareUserConfirmBtn.disabled = true;
        const origText = shareUserConfirmBtn.textContent;
        shareUserConfirmBtn.textContent = "Sharing...";

        try {
          if (typeof shareFolderToUser === "function") {
            await shareFolderToUser(currentParentFolderId, email);
            shareUserEmail.value = "";
            shareUserConfirmBtn.disabled = true;
            if (typeof showToast === "function") showToast("Folder shared with user successfully.", "success");
            loadFolderSharesList(currentParentFolderId);
          }
        } catch (err) {
          const msg = err.message || "";
          if (shareUserError) {
            if (msg.includes("404") || msg.toLowerCase().includes("not found")) {
              shareUserError.textContent = "User email does not exist.";
            } else if (msg.includes("409") || msg.toLowerCase().includes("already shared")) {
              shareUserError.textContent = "This folder is already shared with this user.";
            } else {
              shareUserError.textContent = msg || "Failed to share folder.";
            }
            shareUserError.style.display = "block";
          }
        } finally {
          shareUserConfirmBtn.textContent = origText;
        }
      });
    }

    if (shareGroupConfirmBtn) {
      shareGroupConfirmBtn.addEventListener("click", async () => {
        const groupId = shareGroupSelect.value;
        if (!groupId) {
          if (shareGroupError) {
            shareGroupError.textContent = "Please select a group.";
            shareGroupError.style.display = "block";
          }
          shareGroupConfirmBtn.disabled = true;
          return;
        }

        // Check already shared to group
        const isGroupShared = libraryFolderGroupShares.some(s =>
          String(s.groupId || s.id) === String(groupId)
        );
        if (isGroupShared) {
          if (shareGroupError) {
            shareGroupError.textContent = "This folder is already shared to this group.";
            shareGroupError.style.display = "block";
          }
          return;
        }

        if (shareGroupError) shareGroupError.style.display = "none";
        shareGroupConfirmBtn.disabled = true;
        const origText = shareGroupConfirmBtn.textContent;
        shareGroupConfirmBtn.textContent = "Sharing...";

        try {
          if (typeof shareFolderToGroup === "function") {
            await shareFolderToGroup(currentParentFolderId, groupId);
            shareGroupSelect.value = "";
            shareGroupConfirmBtn.disabled = true;
            if (typeof showToast === "function") showToast("Folder shared with group successfully.", "success");
            loadFolderSharesList(currentParentFolderId);
          }
        } catch (err) {
          const msg = err.message || "";
          if (shareGroupError) {
            if (msg.includes("409") || msg.toLowerCase().includes("already shared")) {
              shareGroupError.textContent = "This folder is already shared to this group.";
            } else {
              shareGroupError.textContent = msg || "Failed to share folder.";
            }
            shareGroupError.style.display = "block";
          }
        } finally {
          shareGroupConfirmBtn.textContent = origText;
        }
      });
    }

    const clearFiltersBtn = document.getElementById("clearFiltersBtn");
    if (clearFiltersBtn) {
      clearFiltersBtn.addEventListener("click", () => {
        if (searchInput) searchInput.value = "";
        if (subjectFilter) { subjectFilter.value = ""; subjectFilter.dispatchEvent(new Event("syncCustom")); }
        if (fileTypeFilter) { fileTypeFilter.value = ""; fileTypeFilter.dispatchEvent(new Event("syncCustom")); }
        if (folderFilter) { folderFilter.value = ""; folderFilter.dispatchEvent(new Event("syncCustom")); }
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

    // Subfolder wording update on button, share button & empty states
    const createFolderBtn = document.getElementById("createFolderBtn");
    const shareFolderBtn = document.getElementById("shareFolderBtn");
    const folderEmptyTitle = folderEmptyState ? folderEmptyState.querySelector("h3") : null;
    const folderEmptyDesc = folderEmptyState ? folderEmptyState.querySelector("p") : null;
    const folderEmptyBtn = folderEmptyState ? folderEmptyState.querySelector("button") : null;

    if (currentParentFolderId) {
      if (shareFolderBtn) shareFolderBtn.style.display = "inline-flex";
      if (createFolderBtn) {
        createFolderBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="16" width="16" aria-hidden="true">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
          </svg>
          New Subfolder
        `;
      }
      if (folderEmptyTitle) folderEmptyTitle.textContent = "No subfolders yet";
      if (folderEmptyDesc) folderEmptyDesc.textContent = "Create a subfolder to organize documents inside this folder.";
      if (folderEmptyBtn) folderEmptyBtn.textContent = "New Subfolder";
    } else {
      if (shareFolderBtn) shareFolderBtn.style.display = "none";
      if (createFolderBtn) {
        createFolderBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="16" width="16" aria-hidden="true">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
          </svg>
          New Folder
        `;
      }
      if (folderEmptyTitle) folderEmptyTitle.textContent = "No Folders Here";
      if (folderEmptyDesc) folderEmptyDesc.textContent = "Create a folder to organize your study materials.";
      if (folderEmptyBtn) folderEmptyBtn.textContent = "Create Folder";
    }
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

      // Render folder summary info under breadcrumb when inside a folder
      let summaryEl = document.getElementById("folderDetailSummary");
      if (currentParentFolderId) {
        let currentFolder = userFolders.find(x => x.folderId === currentParentFolderId);
        let fileCount = currentFolder?.fileCount || 0;
        let subfolderCount = list.length;
        if (!summaryEl) {
          summaryEl = document.createElement("div");
          summaryEl.id = "folderDetailSummary";
          summaryEl.style.cssText = "font-size: 13px; color: var(--muted); margin-top: 4px; margin-bottom: 16px;";
          folderBreadcrumb.parentNode.insertBefore(summaryEl, folderBreadcrumb.nextSibling);
        }
        summaryEl.innerHTML = `<strong>${subfolderCount} subfolders · ${fileCount} documents</strong><br><span style="font-size: 12px; color: var(--muted-light);">Uploaded files will be saved to this folder.</span>`;
        summaryEl.style.display = "block";
      } else if (summaryEl) {
        summaryEl.style.display = "none";
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
    title.textContent = f.folderName || "Untitled Folder";
    text.appendChild(title);

    const meta = document.createElement("p");
    meta.className = "folder-meta";
    const fileCount = f.fileCount ?? f.documentCount ?? 0;
    const subCount = f.subfolderCount ?? 0;
    meta.textContent = `${fileCount} files · ${subCount} subfolders`;
    text.appendChild(meta);

    main.appendChild(text);

    // Actions kebab (positioned absolutely in top right by CSS)
    const actions = document.createElement("div");
    actions.className = "folder-card-actions";

    const kebabBtn = document.createElement("button");
    kebabBtn.type = "button";
    kebabBtn.className = "btn-kebab";
    kebabBtn.title = "More actions";
    kebabBtn.style.cssText = "font-size: 22px; font-weight: bold; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;";
    kebabBtn.innerHTML = `⋮`;

    const dropdown = document.createElement("div");
    dropdown.className = "kebab-dropdown";
    dropdown.style.cssText = "display: none; position: absolute; right: 0; top: 100%; background: #ffffff; border: 1px solid var(--border); border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); z-index: 20; min-width: 140px; padding: 4px 0;";

    const renameItem = document.createElement("button");
    renameItem.type = "button";
    renameItem.className = "dropdown-item";
    renameItem.style.cssText = "display: block; width: 100%; padding: 8px 14px; text-align: left; background: none; border: none; font-size: 13px; color: var(--text-main); cursor: pointer;";
    renameItem.textContent = "Rename";

    const trashItem = document.createElement("button");
    trashItem.type = "button";
    trashItem.className = "dropdown-item";
    trashItem.style.cssText = "display: block; width: 100%; padding: 8px 14px; text-align: left; background: none; border: none; font-size: 13px; color: var(--danger, #dc3545); cursor: pointer;";
    trashItem.textContent = "Move to Trash";

    dropdown.append(renameItem, trashItem);
    actions.append(kebabBtn, dropdown);

    // Kebab toggle
    kebabBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      document.querySelectorAll(".kebab-dropdown").forEach(d => {
        if (d !== dropdown) d.style.display = "none";
      });
      dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
    });

    document.addEventListener("click", () => {
      dropdown.style.display = "none";
    });

    // Rename action
    renameItem.addEventListener("click", async (e) => {
      e.stopPropagation();
      dropdown.style.display = "none";
      const newName = prompt("Enter new folder name:", f.folderName);
      if (newName && newName.trim() && newName.trim() !== f.folderName) {
        try {
          if (typeof updateFolder === "function") {
            await updateFolder(f.folderId, { folderName: newName.trim() });
            if (typeof showToast === "function") showToast("Folder renamed successfully.", "success");
            loadFolders(currentParentFolderId);
          }
        } catch (err) {
          alert(err.message || "Failed to rename folder.");
        }
      }
    });

    // Move to Trash action
    trashItem.addEventListener("click", async (e) => {
      e.stopPropagation();
      dropdown.style.display = "none";
      
      const confirmed = typeof window.confirmAction === "function"
        ? await window.confirmAction({
            title: "Move this folder to Trash?",
            message: "You can restore it later from Trash Can.",
            confirmText: "Move to Trash",
            danger: true
          })
        : confirm(`Move "${f.folderName}" to Trash?\nYou can restore it later from Trash Can.`);

      if (confirmed) {
        try {
          if (typeof deleteFolder === "function") {
            await deleteFolder(f.folderId);
            if (typeof showToast === "function") showToast("Folder moved to Trash.", "success");
            loadFolders(currentParentFolderId);
          }
        } catch (err) {
          alert(err.message || "Failed to move folder to Trash.");
        }
      }
    });

    // Clicking card body navigates to subfolder
    card.addEventListener("click", (e) => {
      if (e.target.closest('.folder-card-actions')) return;
      navigateToFolder(f.folderId);
    });

    card.append(main, actions);
    return card;
  }
});
