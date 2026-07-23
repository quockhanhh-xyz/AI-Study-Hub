document.addEventListener("DOMContentLoaded", async function () {
  // 1. Check Authentication
  if (window.authReady) {
    const isAuthenticated = await window.authReady;
    if (!isAuthenticated) return;
  }

  // Streamline SVG Meta Icons
  const META_ICONS = {
    calendar: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px; margin-right:4px;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
    subject: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px; margin-right:4px;"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
    folder: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px; margin-right:4px;"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`
  };

  // State
  let userFolders = [];
  let currentParentFolderId = getParentFolderIdFromUrl();
  let breadcrumbTrail = [{ folderId: null, name: "My Folders" }];
  let mySubjectsList = [];

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
    } else if (currentTab === "my-subjects") {
      loadMySubjects();
    }
  }

  // --- TABS LOGIC ---
  function setupTabs() {
    const urlParams = new URLSearchParams(window.location.search);
    const defaultView = urlParams.get("view") || "documents";

    tabs.forEach(tab => {
      tab.addEventListener("click", () => {
        if (tab.dataset.tab === "folders") {
          // Reset to root folder view when clicking Folders tab
          currentParentFolderId = null;
          const url = new URL(window.location);
          url.searchParams.delete("folderId");
          window.history.pushState({}, "", url);
          const existingDyn = document.getElementById("dynamicFolderGrid");
          if (existingDyn) existingDyn.remove();
        }
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

      const createSubjectBtn = document.getElementById("createSubjectBtn");
      if (createSubjectBtn) {
        createSubjectBtn.style.display = tabId === "my-subjects" ? "inline-flex" : "none";
      }

      const uploadDocumentBtn = document.getElementById("uploadDocumentBtn");
      if (uploadDocumentBtn) {
        uploadDocumentBtn.style.display = tabId === "my-subjects" ? "none" : "inline-flex";
      }

      if (libraryToolbar) {
        libraryToolbar.style.display = (tabId === "documents" || tabId === "favorites") ? "flex" : "none";
      }

      // Contextual search placeholders
      if (searchInput) {
        if (tabId === "documents") {
          searchInput.placeholder = "Search documents by title or keyword...";
        } else if (tabId === "folders") {
          searchInput.placeholder = "Search folders by name...";
        } else if (tabId === "favorites") {
          searchInput.placeholder = "Search favorite documents...";
        } else if (tabId === "my-subjects") {
          searchInput.placeholder = "Search subjects by code or name...";
        }
      }

      if (loadData) {
        if (tabId === "documents") loadDocuments();
        else if (tabId === "folders") loadFolders(currentParentFolderId);
        else if (tabId === "favorites") loadFavorites();
        else if (tabId === "my-subjects") loadMySubjects();
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
          else if (tab === "my-subjects") filterSubjectsList();
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
            
            const iconSpan = document.createElement("span");
            iconSpan.textContent = "👤";
            const nameSpan = document.createElement("span");
            nameSpan.style.cssText = "font-size: 13px; font-weight: 500;";
            nameSpan.textContent = share.sharedWithEmail || share.sharedWithName || share.email || "User";
            info.append(iconSpan, nameSpan);

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
            
            const iconSpan = document.createElement("span");
            iconSpan.textContent = "👥";
            const nameSpan = document.createElement("span");
            nameSpan.style.cssText = "font-size: 13px; font-weight: 500;";
            nameSpan.textContent = share.groupName || "Group";
            info.append(iconSpan, nameSpan);

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
        shareGroupSelect.innerHTML = `<option value="">Choose a Group</option>`;
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

  function matchesFileTypeFilter(docFileType, filterVal) {
    if (!filterVal) return true;
    if (!docFileType) return false;
    const typeUpper = docFileType.toUpperCase();
    const valUpper = filterVal.toUpperCase();

    if (valUpper === "WORD") {
      return typeUpper === "DOC" || typeUpper === "DOCX";
    }
    if (valUpper === "EXCEL") {
      return typeUpper === "XLS" || typeUpper === "XLSX";
    }
    if (valUpper === "POWERPOINT") {
      return typeUpper === "PPT" || typeUpper === "PPTX";
    }
    if (valUpper === "IMAGE") {
      return typeUpper === "PNG" || typeUpper === "JPG" || typeUpper === "JPEG" || typeUpper === "IMAGE";
    }
    return typeUpper === valUpper;
  }

  // --- API LOADERS ---
  let allSubjects = [];
  async function loadSubjects() {
    if (typeof getSubjects !== "function") return;
    try {
      const res = await getSubjects();
      const payload = res?.data;
      allSubjects = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.content)
          ? payload.content
          : Array.isArray(payload?.subjects)
            ? payload.subjects
            : Array.isArray(res)
              ? res
              : [];

      // Sort subjects alphabetically by code then name
      allSubjects.sort((a, b) => {
        const codeA = (a.subjectCode || a.subjectName || "").toUpperCase();
        const codeB = (b.subjectCode || b.subjectName || "").toUpperCase();
        return codeA.localeCompare(codeB);
      });

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
        folderFilter.innerHTML = `<option value="">All Folders</option><option value="0">My Folders</option>`;
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
      const filterVal = fileTypeFilter ? fileTypeFilter.value : "";
      const params = {
        keyword: searchInput ? searchInput.value.trim() : "",
        folderId: folderFilter ? folderFilter.value : ""
      };

      // Pass single-extension filter directly to API if explicit (e.g. PDF/TXT)
      if (filterVal && !["WORD", "EXCEL", "POWERPOINT", "IMAGE"].includes(filterVal.toUpperCase())) {
        params.fileType = filterVal;
      }

      const subjId = getSubjectIdFromInput();
      if (subjId) params.subjectId = subjId;

      const res = await getMyDocuments(params);
      let docs = Array.isArray(res.data) ? res.data : (res.data?.content || []);

      // Client-side group filter fallback for group types like WORD/EXCEL/POWERPOINT/IMAGE
      if (filterVal) {
        docs = docs.filter(d => matchesFileTypeFilter(d.fileType, filterVal));
      }

      documentGrid.innerHTML = "";
      if (docs.length === 0) {
        if (documentEmptyState) documentEmptyState.style.display = "flex";
        documentGrid.style.display = "none";
      } else {
        if (documentEmptyState) documentEmptyState.style.display = "none";
        documentGrid.style.display = "grid";
        docs.forEach(doc => {
          documentGrid.appendChild(createDocumentCard(doc, { sourceTab: "documents" }));
        });
      }
    } catch (e) {
      console.error("Failed to load documents:", e);
      documentGrid.innerHTML = `<div style="text-align:center; padding:40px; color:var(--danger); grid-column: 1/-1;">Failed to load documents.</div>`;
    }
  }

  function createDocumentCard(doc, options = {}) {
    // options: { sourceTab, folderId, folderName }
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
    
    // Build link with context if available
    let detailUrl = `document-detail.html?id=${doc.documentId}`;
    if (options.sourceTab === "folders" && options.folderId) {
      detailUrl += `&from=mylibrary_folders&folderId=${options.folderId}&folderName=${encodeURIComponent(options.folderName || "Folder")}`;
    } else if (options.sourceTab === "documents") {
      detailUrl += `&from=mylibrary_documents`;
    } else if (options.sourceTab === "favorites") {
      detailUrl += `&from=mylibrary_favorites`;
    }
    
    link.href = detailUrl;
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

    // Meta details with Streamline SVG icons (No Emojis)
    const meta = document.createElement("div");
    meta.className = "document-meta";

    meta.innerHTML += `<span class="document-meta-item">${META_ICONS.calendar}${formatDate(doc.createdAt)}</span>`;

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
      meta.innerHTML += `<span class="document-meta-item">${META_ICONS.subject}${subjectTag}</span>`;
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
      meta.innerHTML += `<span class="document-meta-item">${META_ICONS.folder}${folderTag}</span>`;
    }

    content.appendChild(meta);
    card.appendChild(content);

    card.style.position = "relative";
    card.style.cursor = "pointer";
    card.addEventListener("click", (e) => {
      if (e.target.closest("button") || e.target.closest("a")) return;
      let url = `document-detail.html?id=${doc.documentId}`;
      if (options.sourceTab === "folders" && options.folderId) {
        url += `&from=mylibrary_folders&folderId=${options.folderId}&folderName=${encodeURIComponent(options.folderName || "Folder")}`;
      } else if (options.sourceTab === "documents") {
        url += `&from=mylibrary_documents`;
      } else if (options.sourceTab === "favorites") {
        url += `&from=mylibrary_favorites`;
      }
      window.location.href = url;
    });

    return card;
  }

  // --- FOLDERS TAB ---
  async function buildBreadcrumb() {
    breadcrumbTrail = [{ folderId: null, name: "My Folders" }];
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
          <span style="white-space: nowrap;">New Subfolder</span>
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
          <span style="white-space: nowrap;">New Folder</span>
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

    currentParentFolderId = id || null;
    loadFolders(currentParentFolderId);
  }

  async function loadFolders(parentId) {
    buildBreadcrumb();

    const foldersSection = document.getElementById("foldersSection");
    const folderDocsSection = document.getElementById("folderDocsSection");
    const folderGrid = document.getElementById("folderGrid");
    const folderDocsGrid = document.getElementById("folderDocsGrid");
    const subfoldersHeading = document.getElementById("subfoldersHeading");
    const folderDocsHeading = document.getElementById("folderDocsHeading");

    if (foldersSection) foldersSection.style.display = "none";
    if (folderDocsSection) folderDocsSection.style.display = "none";
    if (folderEmptyState) folderEmptyState.style.display = "none";

    // Dynamic section headings according to current folder name
    const currentCrumb = breadcrumbTrail[breadcrumbTrail.length - 1];
    const locationName = currentCrumb ? currentCrumb.name : "this folder";
    if (subfoldersHeading) {
      subfoldersHeading.textContent = parentId ? `Subfolders in ${locationName}` : "Subfolders";
    }
    if (folderDocsHeading) {
      folderDocsHeading.textContent = `Documents in ${locationName}`;
    }

    try {
      const kw = searchInput ? searchInput.value.trim().toLowerCase() : "";

      const [foldersRes, docsRes] = await Promise.all([
        typeof getMyFolders === "function" ? getMyFolders(parentId, false).catch((err) => { console.error("getMyFolders error", err); return { data: [] }; }) : Promise.resolve({ data: [] }),
        (parentId !== null && typeof getMyDocuments === "function") ? getMyDocuments({ folderId: parentId, includeSubfolders: false }).catch((err) => { console.error("getMyDocuments error", err); return { data: [] }; }) : Promise.resolve({ data: [] })
      ]);

      console.log("[loadFolders] parentId:", parentId, "foldersRes:", foldersRes, "docsRes:", docsRes);

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

      console.log("[loadFolders] subfolders:", subfolders.length, "docs:", docs.length);

      // --- Render folders using innerHTML for guaranteed display ---
      const foldersTab = document.getElementById("foldersTab");
      if (!foldersTab) return;

      // Remove previously injected dynamic grid
      const existingDyn = foldersTab.querySelector("#dynamicFolderGrid");
      if (existingDyn) existingDyn.remove();

      if (hasSubfolders) {
        if (folderEmptyState) folderEmptyState.style.display = "none";
        if (foldersSection) foldersSection.style.display = "none"; // hide old static section

        // Build HTML string for all folder cards
        const cardsHtml = subfolders.map(f => {
          const subCount = Number(f.subfolderCount ?? 0);
          const docCount = Number(f.documentCount ?? f.fileCount ?? 0);
          const dateStr = f.createdAt ? formatDate(f.createdAt) : "";
          return `
            <div class="dyn-folder-card"
              data-folder-id="${f.folderId}"
              style="display:flex;flex-direction:row;align-items:center;gap:14px;padding:16px 18px;border:1.5px solid #e5e7eb;border-radius:14px;background:#ffffff;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.04);position:relative;min-height:80px;box-sizing:border-box;margin-bottom:0;">
              <div style="flex-shrink:0;color:#ff5858;display:flex;align-items:center;justify-content:center;width:44px;height:44px;background:rgba(255,88,88,0.08);border-radius:10px;">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="24" height="24"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"/></svg>
              </div>
              <div style="flex:1;min-width:0;">
                <div style="font-size:15px;font-weight:600;color:#111827;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${f.folderName || "Untitled Folder"}</div>
                <div style="font-size:12px;color:#9ca3af;margin-top:3px;">${subCount} subfolders &bull; ${docCount} documents${dateStr ? " &bull; " + dateStr : ""}</div>
              </div>
            </div>`;
        }).join("");

        const dynGrid = document.createElement("div");
        dynGrid.id = "dynamicFolderGrid";
        dynGrid.style.cssText = "display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px;margin-top:8px;";
        dynGrid.innerHTML = `
          ${cardsHtml}
        `;

        // Insert after breadcrumb
        const breadcrumb = document.getElementById("folderBreadcrumb");
        if (breadcrumb && breadcrumb.nextSibling) {
          foldersTab.insertBefore(dynGrid, breadcrumb.nextSibling);
        } else {
          foldersTab.appendChild(dynGrid);
        }

        // Add click handlers for each card
        dynGrid.querySelectorAll(".dyn-folder-card").forEach(cardEl => {
          const fid = parseInt(cardEl.dataset.folderId);
          cardEl.addEventListener("mouseenter", () => { cardEl.style.borderColor = "#ff5858"; cardEl.style.transform = "translateY(-2px)"; cardEl.style.boxShadow = "0 8px 20px rgba(255,88,88,0.1)"; });
          cardEl.addEventListener("mouseleave", () => { cardEl.style.borderColor = "#e5e7eb"; cardEl.style.transform = ""; cardEl.style.boxShadow = "0 2px 8px rgba(0,0,0,0.04)"; });
          cardEl.addEventListener("click", () => navigateToFolder(fid));
        });

      } else {
        // No subfolders - show empty state
        if (foldersSection) foldersSection.style.display = "none";
        if (folderEmptyState) folderEmptyState.style.display = "flex";
      }

      // Show docs inside a folder
      if (parentId !== null && folderDocsSection && folderDocsGrid) {
        folderDocsGrid.innerHTML = "";
        if (hasDocs) {
          // Build options for back navigation from document-detail
          const currentCrumbForDocs = breadcrumbTrail[breadcrumbTrail.length - 1];
          const folderOpts = currentCrumbForDocs && currentCrumbForDocs.folderId
            ? { sourceTab: "folders", folderId: currentCrumbForDocs.folderId, folderName: currentCrumbForDocs.name }
            : { sourceTab: "folders" };
          docs.forEach(doc => folderDocsGrid.appendChild(createDocumentCard(doc, folderOpts)));
        } else {
          folderDocsGrid.innerHTML = "<p style='color:#9ca3af;font-size:14px;'>No documents here.</p>";
        }
        folderDocsSection.style.display = "block";
        if (hasDocs && !hasSubfolders && folderEmptyState) folderEmptyState.style.display = "none";
      }


    } catch (e) {
      console.error("Failed to load folders & documents:", e);
      if (folderEmptyState) folderEmptyState.style.display = "flex";
    }
  }

  function createFolderCard(f) {
    // Build card with 100% inline styles to bypass any CSS class conflicts
    const card = document.createElement("div");
    card.style.cssText = "display:flex; flex-direction:row; align-items:center; gap:14px; padding:16px 18px; border:1.5px solid #e5e7eb; border-radius:14px; background:#ffffff; cursor:pointer; box-shadow:0 2px 8px rgba(0,0,0,0.04); position:relative; min-height:80px; box-sizing:border-box;";
    card.addEventListener("mouseenter", () => { card.style.borderColor="#ff5858"; card.style.transform="translateY(-2px)"; card.style.boxShadow="0 8px 20px rgba(255,88,88,0.1)"; });
    card.addEventListener("mouseleave", () => { card.style.borderColor="#e5e7eb"; card.style.transform=""; card.style.boxShadow="0 2px 8px rgba(0,0,0,0.04)"; });

    // Icon
    const iconWrap = document.createElement("div");
    iconWrap.style.cssText = "flex-shrink:0; color:#ff5858; display:flex; align-items:center; justify-content:center; width:44px; height:44px; background:rgba(255,88,88,0.08); border-radius:10px;";
    iconWrap.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="24" height="24"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"/></svg>';
    card.appendChild(iconWrap);

    // Info
    const info = document.createElement("div");
    info.style.cssText = "flex:1; min-width:0; display:flex; flex-direction:column; gap:4px;";
    const nameEl = document.createElement("div");
    nameEl.style.cssText = "font-size:15px; font-weight:600; color:#111827; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;";
    nameEl.textContent = f.folderName || "Untitled Folder";
    const metaEl = document.createElement("div");
    metaEl.style.cssText = "font-size:12px; color:#9ca3af; display:flex; gap:10px;";
    const subCount = Number(f.subfolderCount ?? 0);
    const docCount = Number(f.documentCount ?? f.fileCount ?? 0);
    metaEl.innerHTML = `<span>${subCount} subfolders</span><span>${docCount} documents</span>${f.createdAt ? `<span>${formatDate(f.createdAt)}</span>` : ""}`;
    info.appendChild(nameEl);
    info.appendChild(metaEl);
    card.appendChild(info);

    // Kebab menu
    const actions = document.createElement("div");
    actions.style.cssText = "position:absolute; top:12px; right:12px;";
    const kebabBtn = document.createElement("button");
    kebabBtn.type = "button";
    kebabBtn.title = "More actions";
    kebabBtn.style.cssText = "font-size:20px; font-weight:bold; width:30px; height:30px; display:flex; align-items:center; justify-content:center; background:none; border:none; cursor:pointer; color:#9ca3af; border-radius:6px;";
    kebabBtn.textContent = "⋮";
    const dropdown = document.createElement("div");
    dropdown.style.cssText = "display:none; position:absolute; right:0; top:100%; background:#ffffff; border:1px solid #e5e7eb; border-radius:8px; box-shadow:0 4px 12px rgba(0,0,0,0.1); z-index:20; min-width:140px; padding:4px 0;";
    const renameItem = document.createElement("button");
    renameItem.type = "button";
    renameItem.style.cssText = "display:block; width:100%; padding:8px 14px; text-align:left; background:none; border:none; font-size:13px; color:#111827; cursor:pointer;";
    renameItem.textContent = "Rename";
    const trashItem = document.createElement("button");
    trashItem.type = "button";
    trashItem.style.cssText = "display:block; width:100%; padding:8px 14px; text-align:left; background:none; border:none; font-size:13px; color:#dc3545; cursor:pointer;";
    trashItem.textContent = "Move to Trash";
    dropdown.append(renameItem, trashItem);
    actions.append(kebabBtn, dropdown);
    card.appendChild(actions);

    kebabBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      document.querySelectorAll(".folder-kebab-dropdown").forEach(d => { if (d !== dropdown) d.style.display = "none"; });
      dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
    });
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
        } catch (err) { alert(err.message || "Failed to rename folder."); }
      }
    });
    trashItem.addEventListener("click", async (e) => {
      e.stopPropagation();
      dropdown.style.display = "none";
      const confirmed = typeof window.confirmAction === "function"
        ? await window.confirmAction({ title: "Move this folder to Trash?", message: "You can restore it later from Trash Can.", confirmText: "Move to Trash", danger: true })
        : confirm(`Move "${f.folderName}" to Trash?\nYou can restore it later from Trash Can.`);
      if (confirmed) {
        try {
          if (typeof deleteFolder === "function") {
            await deleteFolder(f.folderId);
            if (typeof showToast === "function") showToast("Folder moved to Trash.", "success");
            loadFolders(currentParentFolderId);
          }
        } catch (err) { alert(err.message || "Failed to move folder to Trash."); }
      }
    });

    card.addEventListener("click", (e) => {
      if (e.target.closest("button")) return;
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

      // Apply search & toolbar filters to favorite documents
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
        docs = docs.filter(d => matchesFileTypeFilter(d.fileType, fType));
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
        docs.forEach(doc => favoritesGrid.appendChild(createDocumentCard(doc, { sourceTab: "favorites" })));
      }
    } catch (e) {
      console.error("Failed to load favorites:", e);
      favoritesGrid.innerHTML = `<div style="text-align:center; padding:40px; color:var(--danger); grid-column: 1/-1;">Failed to load favorites.</div>`;
    }
  }

  // --- MY SUBJECTS SYSTEM (Step 17A) ---
  const createSubjectBtn = document.getElementById("createSubjectBtn");
  const createSubjectModal = document.getElementById("createSubjectModal");
  const cancelCreateSubjectBtn = document.getElementById("cancelCreateSubjectBtn");
  const confirmCreateSubjectBtn = document.getElementById("confirmCreateSubjectBtn");
  const newSubjectCodeInput = document.getElementById("newSubjectCodeInput");
  const newSubjectNameInput = document.getElementById("newSubjectNameInput");
  const newSubjectDescInput = document.getElementById("newSubjectDescInput");
  const createSubjectModalError = document.getElementById("createSubjectModalError");

  const editSubjectModal = document.getElementById("editSubjectModal");
  const cancelEditSubjectBtn = document.getElementById("cancelEditSubjectBtn");
  const confirmEditSubjectBtn = document.getElementById("confirmEditSubjectBtn");
  const editSubjectIdInput = document.getElementById("editSubjectIdInput");
  const editSubjectCodeInput = document.getElementById("editSubjectCodeInput");
  const editSubjectNameInput = document.getElementById("editSubjectNameInput");
  const editSubjectDescInput = document.getElementById("editSubjectDescInput");
  const editSubjectModalError = document.getElementById("editSubjectModalError");

  const subjectBreadcrumbBack = document.getElementById("subjectBreadcrumbBack");

  // Init Modals
  if (createSubjectBtn) {
    createSubjectBtn.addEventListener("click", () => {
      createSubjectModalError.style.display = "none";
      newSubjectCodeInput.value = "";
      newSubjectNameInput.value = "";
      newSubjectDescInput.value = "";
      createSubjectModal.classList.add("active");
    });
  }

  if (cancelCreateSubjectBtn) {
    cancelCreateSubjectBtn.addEventListener("click", () => {
      createSubjectModal.classList.remove("active");
    });
  }

  if (confirmCreateSubjectBtn) {
    confirmCreateSubjectBtn.addEventListener("click", async () => {
      const code = newSubjectCodeInput.value.trim();
      const name = newSubjectNameInput.value.trim();
      const desc = newSubjectDescInput.value.trim();

      if (!code || !name) {
        createSubjectModalError.textContent = "Subject Code and Name are required.";
        createSubjectModalError.style.display = "block";
        return;
      }

      try {
        const res = await createSubject({ subjectCode: code, subjectName: name, description: desc });
        if (res && res.success) {
          createSubjectModal.classList.remove("active");
          if (typeof showToast === "function") showToast("Custom subject created successfully.", "success");
          loadMySubjects();
        } else {
          createSubjectModalError.textContent = res.message || "Failed to create subject.";
          createSubjectModalError.style.display = "block";
        }
      } catch (err) {
        createSubjectModalError.textContent = err.message || "Failed to create subject.";
        createSubjectModalError.style.display = "block";
      }
    });
  }

  if (cancelEditSubjectBtn) {
    cancelEditSubjectBtn.addEventListener("click", () => {
      editSubjectModal.classList.remove("active");
    });
  }

  if (confirmEditSubjectBtn) {
    confirmEditSubjectBtn.addEventListener("click", async () => {
      const id = editSubjectIdInput.value;
      const code = editSubjectCodeInput.value.trim();
      const name = editSubjectNameInput.value.trim();
      const desc = editSubjectDescInput.value.trim();

      if (!code || !name) {
        editSubjectModalError.textContent = "Subject Code and Name are required.";
        editSubjectModalError.style.display = "block";
        return;
      }

      try {
        const res = await updateCustomSubject(id, { subjectCode: code, subjectName: name, description: desc });
        if (res && res.success) {
          editSubjectModal.classList.remove("active");
          if (typeof showToast === "function") showToast("Subject updated successfully.", "success");
          loadMySubjects();
        } else {
          editSubjectModalError.textContent = res.message || "Failed to update subject.";
          editSubjectModalError.style.display = "block";
        }
      } catch (err) {
        editSubjectModalError.textContent = err.message || "Failed to update subject.";
        editSubjectModalError.style.display = "block";
      }
    });
  }

  if (subjectBreadcrumbBack) {
    subjectBreadcrumbBack.addEventListener("click", (e) => {
      e.preventDefault();
      document.getElementById("subjectDocsView").style.display = "none";
      document.getElementById("subjectsListView").style.display = "block";
    });
  }

  async function loadMySubjects() {
    try {
      document.getElementById("subjectsListView").style.display = "block";
      document.getElementById("subjectDocsView").style.display = "none";
      
      const grid = document.getElementById("subjectGrid");
      grid.innerHTML = `<div style="text-align: center; padding: 40px; color: var(--muted); width: 100%;"><p>Loading subjects...</p></div>`;
      
      const res = await getMyLibrarySubjects();
      if (res && res.success) {
        mySubjectsList = res.data || [];
        renderSubjects(mySubjectsList);
      } else {
        grid.innerHTML = `<div style="text-align:center; padding:40px; color:var(--danger);">Failed to load subjects.</div>`;
      }
    } catch (e) {
      console.error(e);
      document.getElementById("subjectGrid").innerHTML = `<div style="text-align:center; padding:40px; color:var(--danger);">Failed to load subjects.</div>`;
    }
  }

  function renderSubjects(subjects) {
    const grid = document.getElementById("subjectGrid");
    const emptyState = document.getElementById("subjectEmptyState");
    grid.innerHTML = "";

    if (subjects.length === 0) {
      emptyState.style.display = "flex";
      grid.style.display = "none";
      return;
    }

    emptyState.style.display = "none";
    grid.style.display = "grid";

    subjects.forEach(s => {
      const card = document.createElement("div");
      card.className = "subject-card";
      
      card.innerHTML = `
        <div class="subject-card-code">${s.code}</div>
        <div class="subject-card-name">${s.name}</div>
        <div class="subject-card-desc">${s.description || "No description provided."}</div>
        <div class="subject-card-footer">
          <span class="subject-card-badge ${s.sourceType === 'PERSONAL' ? 'badge-personal' : 'badge-system'}">${s.sourceType}</span>
          <span style="color: var(--muted); font-weight: 500;">${s.documentCount} docs</span>
        </div>
      `;

      card.addEventListener("click", () => {
        openSubjectDocuments(s.subjectId, s.code, s.name);
      });

      // Actions if personal subject
      if (s.canEdit || s.canDelete) {
        const actions = document.createElement("div");
        actions.className = "subject-card-actions";
        
        const kebabBtn = document.createElement("button");
        kebabBtn.type = "button";
        kebabBtn.className = "btn-kebab";
        kebabBtn.textContent = "⋮";
        kebabBtn.title = "More actions";
        
        const dropdown = document.createElement("div");
        dropdown.style.cssText = "display:none; position:absolute; right:0; top:100%; background:#ffffff; border:1px solid #e5e7eb; border-radius:8px; box-shadow:0 4px 12px rgba(0,0,0,0.1); z-index:20; min-width:140px; padding:4px 0;";
        
        if (s.canEdit) {
          const editItem = document.createElement("button");
          editItem.type = "button";
          editItem.style.cssText = "display:block; width:100%; padding:8px 14px; text-align:left; background:none; border:none; font-size:13px; color:#111827; cursor:pointer;";
          editItem.textContent = "Edit Subject";
          editItem.addEventListener("click", (e) => {
            e.stopPropagation();
            dropdown.style.display = "none";
            editSubjectModalError.style.display = "none";
            editSubjectIdInput.value = s.subjectId;
            editSubjectCodeInput.value = s.code;
            editSubjectNameInput.value = s.name;
            editSubjectDescInput.value = s.description || "";
            editSubjectModal.classList.add("active");
          });
          dropdown.appendChild(editItem);
        }

        if (s.canDelete) {
          const deleteItem = document.createElement("button");
          deleteItem.type = "button";
          deleteItem.style.cssText = "display:block; width:100%; padding:8px 14px; text-align:left; background:none; border:none; font-size:13px; color:#dc3545; cursor:pointer;";
          deleteItem.textContent = "Delete Subject";
          deleteItem.addEventListener("click", async (e) => {
            e.stopPropagation();
            dropdown.style.display = "none";
            
            const confirmed = typeof window.confirmAction === "function"
              ? await window.confirmAction({ title: "Delete Custom Subject?", message: "Are you sure you want to delete this custom subject?", confirmText: "Delete", danger: true })
              : confirm(`Delete custom subject "${s.code}"?`);
              
            if (confirmed) {
              try {
                const deleteRes = await deleteCustomSubject(s.subjectId);
                if (deleteRes && deleteRes.success) {
                  if (typeof showToast === "function") showToast("Custom subject deleted.", "success");
                  loadMySubjects();
                } else {
                  alert(deleteRes.message || "Failed to delete subject.");
                }
              } catch (err) {
                if (err.message === "SUBJECT_IN_USE") {
                  alert("This subject is currently linked to documents and cannot be deleted.");
                } else {
                  alert(err.message || "Failed to delete subject.");
                }
              }
            }
          });
          dropdown.appendChild(deleteItem);
        }

        kebabBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          document.querySelectorAll(".subject-card-actions div").forEach(d => { if (d !== dropdown) d.style.display = "none"; });
          dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
        });

        // Close dropdown when clicking outside
        document.addEventListener("click", () => {
          dropdown.style.display = "none";
        });

        actions.appendChild(kebabBtn);
        actions.appendChild(dropdown);
        card.appendChild(actions);
      }

      grid.appendChild(card);
    });
  }

  function filterSubjectsList() {
    const query = searchInput.value.trim().toLowerCase();
    if (!query) {
      renderSubjects(mySubjectsList);
      return;
    }
    const filtered = mySubjectsList.filter(s => 
      s.code.toLowerCase().includes(query) || 
      s.name.toLowerCase().includes(query) || 
      (s.description && s.description.toLowerCase().includes(query))
    );
    renderSubjects(filtered);
  }

  async function openSubjectDocuments(subjectId, subjectCode, subjectName) {
    document.getElementById("subjectsListView").style.display = "none";
    document.getElementById("subjectDocsView").style.display = "block";
    document.getElementById("subjectBreadcrumbCurrent").textContent = `${subjectCode} - ${subjectName}`;

    const docsGrid = document.getElementById("subjectDocsGrid");
    const docsEmptyState = document.getElementById("subjectDocsEmptyState");
    docsGrid.innerHTML = `<div style="text-align: center; padding: 40px; color: var(--muted); width: 100%;"><p>Loading documents...</p></div>`;
    docsEmptyState.style.display = "none";

    try {
      const res = await getSubjectDocuments(subjectId, 0, 50);
      if (res && res.success) {
        const docs = (res.data && res.data.content) ? res.data.content : [];
        docsGrid.innerHTML = "";
        
        if (docs.length === 0) {
          docsEmptyState.style.display = "flex";
          docsGrid.style.display = "none";
        } else {
          docsEmptyState.style.display = "none";
          docsGrid.style.display = "grid";
          docs.forEach(d => {
            docsGrid.appendChild(createDocumentCard(d, { sourceTab: "documents" }));
          });
        }
      } else {
        docsGrid.innerHTML = `<div style="text-align:center; padding:40px; color:var(--danger);">Failed to load documents.</div>`;
      }
    } catch (e) {
      console.error(e);
      docsGrid.innerHTML = `<div style="text-align:center; padding:40px; color:var(--danger);">Failed to load documents.</div>`;
    }
  }
});
