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
  const sharedDocsPanel = document.getElementById("sharedDocsPanel");
  const sharedFoldersPanel = document.getElementById("sharedFoldersPanel");

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

    return card;
  }

  function renderSharedDocs(query = "") {
      const filtered = allSharedDocs.filter(d => (d.title || d.originalFileName || "").toLowerCase().includes(query));
      
      const badge = document.getElementById("docsCountBadge");
      if (badge) badge.textContent = `(${filtered.length})`;

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
      
      const badge = document.getElementById("foldersCountBadge");
      if (badge) badge.textContent = `(${filtered.length})`;

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

  // Tab switching event bindings
  tabDocsBtn.addEventListener("click", () => {
    tabDocsBtn.classList.add("active");
    tabFoldersBtn.classList.remove("active");
    sharedDocsPanel.style.display = "block";
    sharedFoldersPanel.style.display = "none";
  });

  tabFoldersBtn.addEventListener("click", async () => {
    tabFoldersBtn.classList.add("active");
    tabDocsBtn.classList.remove("active");
    sharedFoldersPanel.style.display = "block";
    sharedDocsPanel.style.display = "none";
    await loadSharedFolders();
  });

  await loadSharedDocuments();
});
