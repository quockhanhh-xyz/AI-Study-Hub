/**
 * Shared With Me UI controller for AI Study Hub.
 * Handles: list direct shared documents and folders.
 * Relies on share-api.js and folder-share-api.js; never uses raw fetch directly.
 */

document.addEventListener("DOMContentLoaded", async function () {
  if (window.authReady) {
    const isAuthenticated = await window.authReady;
    if (!isAuthenticated) {
      localStorage.removeItem("currentUser");
      window.location.href = `login.html?redirect=${encodeURIComponent("shared-with-me.html")}`;
      return;
    }
  }

  let allSharedDocs = [];
  let allSharedFolders = [];
  let allMyShares = null;

  const sharedLoader = document.getElementById("sharedLoader");
  const sharedError = document.getElementById("sharedError");
  const sharedErrorMessage = document.getElementById("sharedErrorMessage");
  const sharedGrid = document.getElementById("sharedGrid");
  const sharedEmpty = document.getElementById("sharedEmpty");

  const folderLoader = document.getElementById("folderLoader");
  const folderError = document.getElementById("folderError");
  const folderErrorMessage = document.getElementById("folderErrorMessage");
  const folderGrid = document.getElementById("folderGrid");
  const folderEmpty = document.getElementById("folderEmpty");

  const tabDocsBtn = document.getElementById("tabDocsBtn");
  const tabFoldersBtn = document.getElementById("tabFoldersBtn");
  const tabMySharesBtn = document.getElementById("tabMySharesBtn");
  
  const sharedDocsPanel = document.getElementById("sharedDocsPanel");
  const sharedFoldersPanel = document.getElementById("sharedFoldersPanel");
  const mySharesPanel = document.getElementById("mySharesPanel");

  const mySharesLoader = document.getElementById("mySharesLoader");
  const mySharesError = document.getElementById("mySharesError");
  const mySharesErrorMessage = document.getElementById("mySharesErrorMessage");
  const mySharesGrid = document.getElementById("mySharesGrid");
  const mySharesEmpty = document.getElementById("mySharesEmpty");

  function showError(message) {
    if (sharedErrorMessage) sharedErrorMessage.textContent = message;
    sharedError.style.display = "flex";
    sharedGrid.style.display = "none";
    sharedEmpty.style.display = "none";
  }

  function hideError() {
    sharedError.style.display = "none";
  }

  // Ensure initial state resets for error elements
  hideError();
  if (folderError) {
    folderError.style.display = "none";
  }

  function showFolderError(message) {
    if (folderErrorMessage) folderErrorMessage.textContent = message;
    folderError.style.display = "flex";
    folderGrid.style.display = "none";
    folderEmpty.style.display = "none";
  }

  function hideFolderError() {
    folderError.style.display = "none";
  }

  function formatFileSize(bytes) {
    if (!bytes) return "–";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  function formatDate(isoString) {
    if (!isoString) return "–";
    const d = new Date(isoString);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  }

  function showFavoriteToast(message, type = "success") {
    if (typeof window.showToast === "function") {
      window.showToast(message, type);
    }
  }

  async function handleToggleFavorite(doc, btn) {
    btn.disabled = true;
    const wasFavorited = isDocumentFavorited(doc);
    const documentId = doc.documentId || doc.id;

    try {
      if (wasFavorited) {
        await unfavoriteDocument(documentId);
        setDocumentFavorited(doc, false);
        btn.classList.remove("favorited");
        btn.title = "Add to favorites";
        showFavoriteToast("Removed from favorites.");
      } else {
        await favoriteDocument(documentId);
        setDocumentFavorited(doc, true);
        btn.classList.add("favorited");
        btn.title = "Remove from favorites";
        showFavoriteToast("Added to favorites.");
      }
    } catch (error) {
      if (error && error.status === 403) {
        showFavoriteToast("You do not have access to this document.", "error");
      } else {
        showFavoriteToast(error.message || "Failed to update favorite.", "error");
      }
    } finally {
      btn.disabled = false;
    }
  }

  const searchInput = document.getElementById("sharedSearchInput");
  if (searchInput) {
      searchInput.addEventListener("input", (e) => {
          const query = e.target.value.toLowerCase();
          renderSharedDocs(query);
          renderSharedFolders(query);
          renderMyShares(query);
      });
  }

  function createDocCard(doc) {
    const card = document.createElement("a");
    card.className = "shared-row";
    card.href = `document-detail.html?id=${doc.documentId}&from=shared`;
    
    const isFav = isDocumentFavorited(doc);
    const favTitle = isFav ? "Remove from favorites" : "Add to favorites";
    const favClass = isFav ? "favorite-star-btn favorited" : "favorite-star-btn";
    
    let iconHtml = getFileTypeIcon(doc.fileType);
    
    card.innerHTML = `
      <div style="display: flex; align-items: center; gap: 16px; flex: 1; overflow: hidden;">
        <div style="width: 24px; height: 24px; flex-shrink: 0;">${iconHtml}</div>
        <div style="display: flex; flex-direction: column; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          <h3 style="font-size: 15px; margin: 0; color: var(--text); font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${doc.title || doc.originalFileName || "Untitled Document"}</h3>
          <span style="font-size: 13px; color: var(--muted); margin-top: 4px;">
            Shared by: <strong class="shared-by-link" style="color: var(--primary); text-decoration: underline; cursor: pointer;">${doc.sharedByName || "Unknown"}</strong> · ${formatDate(doc.createdAt)}
          </span>
        </div>
      </div>
      <div style="display: flex; align-items: center; gap: 12px; flex-shrink: 0;">
        <button type="button" class="${favClass}" title="${favTitle}" style="background: none; border: none; cursor: pointer;">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/></svg>
        </button>
        <button type="button" class="delete-share-btn" title="Delete Shared Document" style="background: none; border: none; cursor: pointer; color: var(--danger); display: flex; align-items: center; justify-content: center; padding: 4px;">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
        </button>
        <span style="color: var(--muted); margin-left: 8px;">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </span>
      </div>
    `;

    const sharedByLink = card.querySelector(".shared-by-link");
    if (sharedByLink && doc.sharedByUserId) {
      sharedByLink.classList.add("uploader-link");
      sharedByLink.dataset.userId = doc.sharedByUserId;
      sharedByLink.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
      });
    }

    const favBtn = card.querySelector(".favorite-star-btn");
    favBtn.addEventListener("click", async function (e) {
      e.stopPropagation();
      e.preventDefault();
      await handleToggleFavorite(doc, favBtn);
    });

    const deleteBtn = card.querySelector(".delete-share-btn");
    if (deleteBtn) {
      deleteBtn.addEventListener("click", async function (e) {
        e.stopPropagation();
        e.preventDefault();
        
        const confirmed = typeof window.confirmAction === "function"
          ? await window.confirmAction({
              title: "Remove Shared Document",
              message: "Are you sure you want to remove this shared document from your list?",
              confirmText: "Remove",
              danger: true
            })
          : window.confirm("Are you sure you want to remove this shared document from your list?");

        if (confirmed) {
          deleteBtn.disabled = true;
          try {
            await revokeDocumentShare(doc.shareId);
            showFavoriteToast("Shared document removed.");
            await loadSharedDocuments();
          } catch (err) {
            showFavoriteToast(err.message || "Failed to remove shared document.", "error");
            deleteBtn.disabled = false;
          }
        }
      });
    }

    return card;
  }

  function createFolderCard(share) {
    const card = document.createElement("a");
    card.className = "shared-row";
    card.href = `shared-folder-detail.html?folderId=${share.folderId}`;
    
    card.innerHTML = `
      <div style="display: flex; align-items: center; gap: 16px; flex: 1; overflow: hidden;">
        <div style="width: 24px; height: 24px; flex-shrink: 0; color: var(--primary);">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="24" width="24" aria-hidden="true" focusable="false"><path stroke="currentColor" d="M1.5 10V2.5h5l3 3h11v3m3 0.25V8.5H4.6l-0.15 0.25 -0.234 0.492A28 28 0 0 0 1.5 21.272v0.228h19v-0.128a28 28 0 0 1 2.757 -12.116l0.243 -0.506Z" stroke-width="1"></path></svg>
        </div>
        <div style="display: flex; flex-direction: column; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          <h3 style="font-size: 15px; margin: 0; color: var(--text); font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${share.folderName || "Untitled Folder"}</h3>
          <span style="font-size: 13px; color: var(--muted); margin-top: 4px;">
            Shared by: <strong class="shared-by-link" style="color: var(--primary); text-decoration: underline; cursor: pointer;">${share.sharedByName || "Unknown"}</strong> · ${formatDate(share.createdAt)}
          </span>
        </div>
      </div>
      <div style="display: flex; align-items: center; gap: 12px; flex-shrink: 0;">
        <button type="button" class="delete-share-btn" title="Delete Shared Folder" style="background: none; border: none; cursor: pointer; color: var(--danger); display: flex; align-items: center; justify-content: center; padding: 4px;">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
        </button>
        <span style="color: var(--muted); margin-left: 8px;">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </span>
      </div>
    `;

    const sharedByLink = card.querySelector(".shared-by-link");
    if (sharedByLink && share.sharedByUserId) {
      sharedByLink.classList.add("uploader-link");
      sharedByLink.dataset.userId = share.sharedByUserId;
      sharedByLink.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
      });
    }

    const deleteBtn = card.querySelector(".delete-share-btn");
    if (deleteBtn) {
      deleteBtn.addEventListener("click", async function (e) {
        e.stopPropagation();
        e.preventDefault();
        
        const confirmed = typeof window.confirmAction === "function"
          ? await window.confirmAction({
              title: "Remove Shared Folder",
              message: "Are you sure you want to remove this shared folder from your list?",
              confirmText: "Remove",
              danger: true
            })
          : window.confirm("Are you sure you want to remove this shared folder from your list?");

        if (confirmed) {
          deleteBtn.disabled = true;
          try {
            await revokeFolderShare(share.shareId);
            showFavoriteToast("Shared folder removed.");
            await loadSharedFolders();
          } catch (err) {
            showFavoriteToast(err.message || "Failed to remove shared folder.", "error");
            deleteBtn.disabled = false;
          }
        }
      });
    }

    return card;
  }

  function renderSharedDocs(query = "") {
      const filtered = allSharedDocs.filter(d => (d.title || d.originalFileName || "").toLowerCase().includes(query));
      
      if (filtered.length === 0) {
          sharedEmpty.style.display = "flex";
          sharedGrid.style.display = "none";
          return;
      }

      sharedEmpty.style.display = "none";
      sharedGrid.innerHTML = "";
      filtered.forEach(doc => {
          sharedGrid.appendChild(createDocCard(doc));
      });
      sharedGrid.style.display = "block"; 
  }

  function renderSharedFolders(query = "") {
      const filtered = allSharedFolders.filter(f => (f.folderName || "").toLowerCase().includes(query));

      if (filtered.length === 0) {
          folderEmpty.style.display = "flex";
          folderGrid.style.display = "none";
          return;
      }

      folderEmpty.style.display = "none";
      folderGrid.innerHTML = "";
      filtered.forEach(share => {
          folderGrid.appendChild(createFolderCard(share));
      });
      folderGrid.style.display = "block";
  }

  async function loadSharedDocuments() {
    sharedLoader.style.display = "flex";
    sharedGrid.style.display = "none";
    sharedEmpty.style.display = "none";
    hideError();

    try {
      const result = await getSharedWithMe();
      allSharedDocs = Array.isArray(result.data) ? result.data : [];
      
      sharedLoader.style.display = "none";
      const q = (document.getElementById("sharedSearchInput")?.value || "").toLowerCase();
      renderSharedDocs(q);
    } catch (error) {
      sharedLoader.style.display = "none";
      if (error && (error.status === 401 || error.statusCode === 401 || String(error.message || "").includes("401"))) {
        localStorage.removeItem("currentUser");
        window.location.href = `login.html?redirect=${encodeURIComponent("shared-with-me.html")}`;
        return;
      }
      showError(error.message || "Failed to load shared documents.");
    }
  }

  async function loadSharedFolders() {
    folderLoader.style.display = "flex";
    folderGrid.style.display = "none";
    folderEmpty.style.display = "none";
    hideFolderError();

    try {
      const result = await getFoldersSharedWithMe();
      allSharedFolders = Array.isArray(result.data) ? result.data : [];

      folderLoader.style.display = "none";
      const q = (document.getElementById("sharedSearchInput")?.value || "").toLowerCase();
      renderSharedFolders(q);
    } catch (error) {
      folderLoader.style.display = "none";
      if (error && (error.status === 401 || error.statusCode === 401 || String(error.message || "").includes("401"))) {
        localStorage.removeItem("currentUser");
        window.location.href = `login.html?redirect=${encodeURIComponent("shared-with-me.html")}`;
        return;
      }
      showFolderError(error.message || "Failed to load shared folders.");
    }
  }

  function showMySharesError(message) {
    if (mySharesErrorMessage) mySharesErrorMessage.textContent = message;
    mySharesError.style.display = "flex";
    mySharesGrid.style.display = "none";
    mySharesEmpty.style.display = "none";
  }

  function hideMySharesError() {
    mySharesError.style.display = "none";
  }

  async function loadMyShares() {
    mySharesLoader.style.display = "flex";
    mySharesGrid.style.display = "none";
    mySharesEmpty.style.display = "none";
    hideMySharesError();

    try {
      const result = await getMyShares();
      allMyShares = result.data || {
        documentShares: [],
        groupDocumentShares: [],
        folderShares: [],
        groupFolderShares: [],
        publicDocuments: []
      };

      mySharesLoader.style.display = "none";
      const q = (document.getElementById("sharedSearchInput")?.value || "").toLowerCase();
      renderMyShares(q);
    } catch (error) {
      mySharesLoader.style.display = "none";
      if (error && (error.status === 401 || error.statusCode === 401 || String(error.message || "").includes("401"))) {
        localStorage.removeItem("currentUser");
        window.location.href = `login.html?redirect=${encodeURIComponent("shared-with-me.html")}`;
        return;
      }
      showMySharesError(error.message || "Failed to load shared items.");
    }
  }

  function renderMyShares(query = "") {
    if (!allMyShares) return;

    mySharesGrid.innerHTML = "";
    let totalCount = 0;

    // Direct document shares
    const filteredDocShares = (allMyShares.documentShares || []).filter(ds => 
      (ds.title || "").toLowerCase().includes(query) || (ds.sharedWithEmail || "").toLowerCase().includes(query)
    );
    filteredDocShares.forEach(ds => {
      totalCount++;
      mySharesGrid.appendChild(createMyShareRowCard({
        type: "document",
        title: ds.title,
        info: `Shared with: <strong>${ds.sharedWithEmail}</strong>`,
        date: ds.createdAt,
        badgeText: "User",
        badgeClass: "badge-user",
        onDelete: async (btn) => {
          const confirmed = typeof window.confirmAction === "function"
            ? await window.confirmAction({
                title: "Revoke Share",
                message: `Are you sure you want to stop sharing "${ds.title}" with ${ds.sharedWithEmail}?`,
                confirmText: "Revoke",
                danger: true
              })
            : window.confirm(`Are you sure you want to stop sharing "${ds.title}" with ${ds.sharedWithEmail}?`);

          if (confirmed) {
            btn.disabled = true;
            try {
              await revokeDocumentShare(ds.shareId);
              showFavoriteToast("Share revoked.");
              await loadMyShares();
            } catch (err) {
              showFavoriteToast(err.message || "Failed to revoke share.", "error");
              btn.disabled = false;
            }
          }
        }
      }));
    });

    // Group document shares
    const filteredGroupDocShares = (allMyShares.groupDocumentShares || []).filter(gds => 
      (gds.title || "").toLowerCase().includes(query)
    );
    filteredGroupDocShares.forEach(gds => {
      totalCount++;
      mySharesGrid.appendChild(createMyShareRowCard({
        type: "document",
        title: gds.title,
        info: `Shared with Group ID: <strong>${gds.groupId}</strong>`,
        date: gds.createdAt,
        badgeText: "Group",
        badgeClass: "badge-group",
        onDelete: async (btn) => {
          const confirmed = typeof window.confirmAction === "function"
            ? await window.confirmAction({
                title: "Revoke Group Share",
                message: `Are you sure you want to stop sharing "${gds.title}" with this group?`,
                confirmText: "Revoke",
                danger: true
              })
            : window.confirm(`Are you sure you want to stop sharing "${gds.title}" with this group?`);

          if (confirmed) {
            btn.disabled = true;
            try {
              await revokeGroupDocumentShare(gds.shareId);
              showFavoriteToast("Group share revoked.");
              await loadMyShares();
            } catch (err) {
              showFavoriteToast(err.message || "Failed to revoke group share.", "error");
              btn.disabled = false;
            }
          }
        }
      }));
    });

    // Direct folder shares
    const filteredFolderShares = (allMyShares.folderShares || []).filter(fs => 
      (fs.folderName || "").toLowerCase().includes(query) || (fs.sharedWithEmail || "").toLowerCase().includes(query)
    );
    filteredFolderShares.forEach(fs => {
      totalCount++;
      mySharesGrid.appendChild(createMyShareRowCard({
        type: "folder",
        title: fs.folderName,
        info: `Shared with: <strong>${fs.sharedWithEmail}</strong>`,
        date: fs.createdAt,
        badgeText: "User Folder",
        badgeClass: "badge-user-folder",
        onDelete: async (btn) => {
          const confirmed = typeof window.confirmAction === "function"
            ? await window.confirmAction({
                title: "Revoke Folder Share",
                message: `Are you sure you want to stop sharing folder "${fs.folderName}" with ${fs.sharedWithEmail}?`,
                confirmText: "Revoke",
                danger: true
              })
            : window.confirm(`Are you sure you want to stop sharing folder "${fs.folderName}" with ${fs.sharedWithEmail}?`);

          if (confirmed) {
            btn.disabled = true;
            try {
              await revokeFolderShare(fs.shareId);
              showFavoriteToast("Folder share revoked.");
              await loadMyShares();
            } catch (err) {
              showFavoriteToast(err.message || "Failed to revoke folder share.", "error");
              btn.disabled = false;
            }
          }
        }
      }));
    });

    // Group folder shares
    const filteredGroupFolderShares = (allMyShares.groupFolderShares || []).filter(gfs => 
      (gfs.folderName || "").toLowerCase().includes(query) || (gfs.groupName || "").toLowerCase().includes(query)
    );
    filteredGroupFolderShares.forEach(gfs => {
      totalCount++;
      mySharesGrid.appendChild(createMyShareRowCard({
        type: "folder",
        title: gfs.folderName,
        info: `Shared with Group: <strong>${gfs.groupName || gfs.groupId}</strong>`,
        date: gfs.createdAt,
        badgeText: "Group Folder",
        badgeClass: "badge-group-folder",
        onDelete: async (btn) => {
          const confirmed = typeof window.confirmAction === "function"
            ? await window.confirmAction({
                title: "Revoke Group Folder Share",
                message: `Are you sure you want to stop sharing folder "${gfs.folderName}" with group ${gfs.groupName || gfs.groupId}?`,
                confirmText: "Revoke",
                danger: true
              })
            : window.confirm(`Are you sure you want to stop sharing folder "${gfs.folderName}" with group ${gfs.groupName || gfs.groupId}?`);

          if (confirmed) {
            btn.disabled = true;
            try {
              await revokeGroupFolderShare(gfs.shareId);
              showFavoriteToast("Group folder share revoked.");
              await loadMyShares();
            } catch (err) {
              showFavoriteToast(err.message || "Failed to revoke group folder share.", "error");
              btn.disabled = false;
            }
          }
        }
      }));
    });

    // Public/Community documents
    const filteredPublicDocs = (allMyShares.publicDocuments || []).filter(pd => 
      (pd.title || "").toLowerCase().includes(query)
    );
    filteredPublicDocs.forEach(pd => {
      totalCount++;
      mySharesGrid.appendChild(createMyShareRowCard({
        type: "document",
        title: pd.title,
        info: `Contributed to <strong>Community Library</strong>`,
        date: pd.createdAt,
        badgeText: "Community",
        badgeClass: "badge-community",
        onDelete: async (btn) => {
          const confirmed = typeof window.confirmAction === "function"
            ? await window.confirmAction({
                title: "Unpublish Document",
                message: `Are you sure you want to unpublish "${pd.title}" from Community Library?`,
                confirmText: "Unpublish",
                danger: true
              })
            : window.confirm(`Are you sure you want to unpublish "${pd.title}" from Community Library?`);

          if (confirmed) {
            btn.disabled = true;
            try {
              await unpublishDocument(pd.documentId);
              showFavoriteToast("Document unpublished successfully.");
              await loadMyShares();
            } catch (err) {
              showFavoriteToast(err.message || "Failed to unpublish document.", "error");
              btn.disabled = false;
            }
          }
        }
      }));
    });

    if (totalCount === 0) {
      mySharesEmpty.style.display = "flex";
      mySharesGrid.style.display = "none";
    } else {
      mySharesEmpty.style.display = "none";
      mySharesGrid.style.display = "block";
    }
  }

  function createMyShareRowCard(item) {
    const card = document.createElement("div");
    card.className = "shared-row";
    card.style.cssText = "display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; margin-bottom: 8px;";

    const iconHtml = (typeof window.getFileTypeIcon === "function") 
      ? window.getFileTypeIcon(item.type === "folder" ? "FOLDER" : "PDF") 
      : "";

    card.innerHTML = `
      <div style="display: flex; align-items: center; gap: 16px; flex: 1; overflow: hidden;">
        <div style="width: 24px; height: 24px; flex-shrink: 0; color: var(--primary);">${iconHtml}</div>
        <div style="display: flex; flex-direction: column; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          <h3 style="font-size: 15px; margin: 0; color: var(--text); font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${item.title}</h3>
          <span style="font-size: 13px; color: var(--muted); margin-top: 4px;">
            ${item.info} · ${formatDate(item.date)}
          </span>
        </div>
      </div>
      <div style="display: flex; align-items: center; gap: 12px; flex-shrink: 0;">
        <span class="badge ${item.badgeClass}" style="font-size: 11px; padding: 4px 8px; border-radius: 12px; font-weight: 600; text-transform: uppercase;">${item.badgeText}</span>
        <button type="button" class="delete-share-btn" title="Stop sharing" style="background: none; border: none; cursor: pointer; color: var(--danger); display: flex; align-items: center; justify-content: center; padding: 4px; margin-left: 8px;">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
        </button>
      </div>
    `;

    const badgeEl = card.querySelector(".badge");
    if (badgeEl) {
      if (item.badgeText === "Community") {
        badgeEl.style.backgroundColor = "rgba(16, 185, 129, 0.1)";
        badgeEl.style.color = "#10b981";
      } else if (item.badgeText.includes("Group")) {
        badgeEl.style.backgroundColor = "rgba(59, 130, 246, 0.1)";
        badgeEl.style.color = "#3b82f6";
      } else {
        badgeEl.style.backgroundColor = "rgba(107, 114, 128, 0.1)";
        badgeEl.style.color = "#6b7280";
      }
    }

    const deleteBtn = card.querySelector(".delete-share-btn");
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      item.onDelete(deleteBtn);
    });

    return card;
  }

  // Tab switching event bindings
  tabDocsBtn.addEventListener("click", () => {
    tabDocsBtn.classList.add("active");
    tabFoldersBtn.classList.remove("active");
    tabMySharesBtn.classList.remove("active");
    sharedDocsPanel.style.display = "block";
    sharedFoldersPanel.style.display = "none";
    mySharesPanel.style.display = "none";
  });

  tabFoldersBtn.addEventListener("click", async () => {
    tabFoldersBtn.classList.add("active");
    tabDocsBtn.classList.remove("active");
    tabMySharesBtn.classList.remove("active");
    sharedFoldersPanel.style.display = "block";
    sharedDocsPanel.style.display = "none";
    mySharesPanel.style.display = "none";
    await loadSharedFolders();
  });

  tabMySharesBtn.addEventListener("click", async () => {
    tabMySharesBtn.classList.add("active");
    tabDocsBtn.classList.remove("active");
    tabFoldersBtn.classList.remove("active");
    mySharesPanel.style.display = "block";
    sharedDocsPanel.style.display = "none";
    sharedFoldersPanel.style.display = "none";
    await loadMyShares();
  });

  const urlParams = new URLSearchParams(window.location.search);
  const initialTab = urlParams.get("tab");
  if (initialTab === "folders") {
      tabFoldersBtn.click();
  } else if (initialTab === "myshares") {
      tabMySharesBtn.click();
  } else {
      tabDocsBtn.click();
  }
});
